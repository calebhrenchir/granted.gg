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
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
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

    // Verify purchase by email
    const purchase = await prisma.activity.findFirst({
      where: {
        linkId: link.id,
        type: "purchase",
        customerEmail: email.toLowerCase().trim(),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!purchase || !purchase.stripePaymentIntentId) {
      return NextResponse.json(
        { error: "No purchase found for this email" },
        { status: 404 }
      );
    }

    // Verify the payment intent is paid
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        purchase.stripePaymentIntentId
      );
      
      if (paymentIntent.status !== "succeeded") {
        return NextResponse.json(
          { error: "Payment not completed" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error verifying payment intent:", error);
      return NextResponse.json(
        { error: "Failed to verify purchase" },
        { status: 500 }
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
    console.error("Error verifying purchase:", error);
    return NextResponse.json(
      { error: "Failed to verify purchase" },
      { status: 500 }
    );
  }
}


