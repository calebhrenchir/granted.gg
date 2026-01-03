import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getPresignedS3Url } from "@/lib/s3";
import { createActivityAndUpdateTotals } from "@/lib/activity-helpers";
import { centsToDollars } from "@/lib/stripe";
import { Resend } from "resend";
import { render } from "@react-email/render";
import LinkViewEmail from "@/emails/link-view";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ url: string }> }
) {
  try {
    const { url: linkUrl } = await params;

    // Fetch link by URL with files
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

    // Check if this link has already been viewed in this session
    const cookieStore = await cookies();
    const sessionCookieName = `link_viewed_${link.id}`;
    const hasViewedInSession = cookieStore.has(sessionCookieName);

    // Only track click and send email if not already viewed in this session
    if (!hasViewedInSession) {
      // Increment totalClicks and create a click activity
      await createActivityAndUpdateTotals(link.id, "click");

      // Set cookie to track that this link has been viewed in this session
      // Cookie expires when browser closes (session cookie)
      cookieStore.set(sessionCookieName, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        // No maxAge means it's a session cookie (expires when browser closes)
      });

      // Send notification email to link owner if they have notifications enabled
      if (link.userId && process.env.RESEND_API_KEY) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: link.userId },
          select: {
            email: true,
            emailNotificationLinkViews: true,
          },
        });

        if (user?.email && user.emailNotificationLinkViews) {
          const emailHtml = await render(
            LinkViewEmail({
              linkUrl: link.url,
              linkName: link.name || undefined,
            })
          );

          const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "Granted <no-reply@granted.gg>",
            to: user.email,
            subject: `Your Link Was Viewed - ${link.name || link.url}`,
            html: emailHtml,
          });

          if (error) {
            console.error("Error sending link view notification email:", error);
          } else {
            console.log(`Link view notification email sent to ${user.email}`, data?.id);
          }
        }
      } catch (notificationError) {
        console.error("Error sending link view notification email:", notificationError);
        // Don't fail the request if notification email fails
      }
      }
    }

    // Generate presigned URL for cover photo
    let coverPhotoS3Url: string | null = null;
    if (link.coverPhotoS3Key) {
      try {
        coverPhotoS3Url = await getPresignedS3Url(link.coverPhotoS3Key, 3600);
      } catch (error) {
        console.error(`Failed to generate presigned URL for cover photo ${link.coverPhotoS3Key}:`, error);
      }
    }

    // Generate presigned URLs for blurred file versions (for preview)
    const filesWithUrls = await Promise.all(
      link.files.map(async (file) => {
        let blurredS3Url: string | null = null;
        let previewS3Url: string | null = null;

        if (file.blurredS3Key) {
          try {
            blurredS3Url = await getPresignedS3Url(file.blurredS3Key, 3600);
          } catch (error) {
            console.error(`Failed to generate presigned URL for blurred file ${file.blurredS3Key}:`, error);
          }
        }

        // If file is previewable, generate presigned URL for the actual file
        if (file.isPreviewable) {
          try {
            previewS3Url = await getPresignedS3Url(file.s3Key, 3600);
          } catch (error) {
            console.error(`Failed to generate presigned URL for preview file ${file.s3Key}:`, error);
          }
        }

        return {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          blurredS3Url,
          previewS3Url,
          isPreviewable: file.isPreviewable,
          createdAt: file.createdAt.toISOString(),
        };
      })
    );

    // Convert price from Decimal to number (already in dollars)
    const price = Number(link.price);

    const linkName = link.isLinkTitleVisible ? link.name : "Content";

    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        url: link.url,
        name: linkName,
        isPurchaseable: link.isPurchaseable,
        isDownloadable: link.isDownloadable,
        price, // Price in dollars
        coverPhotoS3Url,
        coverColor: link.coverColor,
        createdAt: link.createdAt.toISOString(),
      },
      files: filesWithUrls,
    });
  } catch (error) {
    console.error("Error fetching public link:", error);
    return NextResponse.json(
      { error: `Failed to fetch link ${error}`},
      { status: 500 }
    );
  }
}

