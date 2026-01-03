import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPresignedS3Url } from "@/lib/s3";
import { stripe } from "@/lib/stripe";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ url: string }> }
) {
  try {
    const { url: linkUrl } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Fetch link by URL
    const link = await prisma.link.findUnique({
      where: { url: linkUrl },
      include: {
        files: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    // Verify the Stripe checkout session
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error("Error retrieving Stripe session:", error);
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 400 }
      );
    }

    // Verify the session is paid and matches this link
    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    if (session.metadata?.linkId !== link.id && session.metadata?.linkUrl !== linkUrl) {
      return NextResponse.json(
        { error: "Session does not match this link" },
        { status: 403 }
      );
    }

    // Generate presigned URLs for all files (unblurred versions)
    const filesWithUrls = await Promise.all(
      link.files.map(async (file) => {
        let s3Url: string;
        let blurredS3Url: string | null = null;

        try {
          s3Url = await getPresignedS3Url(file.s3Key, 3600);
        } catch (error) {
          console.error(`Failed to generate presigned URL for file ${file.s3Key}:`, error);
          s3Url = ""; // Fallback to empty string if generation fails
        }

        if (file.blurredS3Key) {
          try {
            blurredS3Url = await getPresignedS3Url(file.blurredS3Key, 3600);
          } catch (error) {
            console.error(`Failed to generate presigned URL for blurred file ${file.blurredS3Key}:`, error);
          }
        }

        return {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          s3Url,
          blurredS3Url,
          createdAt: file.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({
      success: true,
      files: filesWithUrls,
    });
  } catch (error) {
    console.error("Error fetching purchased files:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchased files" },
      { status: 500 }
    );
  }
}

