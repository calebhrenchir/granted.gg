import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { render } from "@react-email/render";
import LookupPurchasesEmail from "@/emails/lookup-purchases";
import { getPresignedS3Url } from "@/lib/s3";
import { stripe } from "@/lib/stripe";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Find all purchase activities for this email
    const purchases = await prisma.activity.findMany({
      where: {
        type: "purchase",
        customerEmail: email.toLowerCase().trim(),
      },
      select: {
        id: true,
        linkId: true,
        stripePaymentIntentId: true,
        createdAt: true,
        link: {
          select: {
            id: true,
            url: true,
            name: true,
            price: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // If no purchases found, return error
    if (purchases.length === 0) {
      return NextResponse.json(
        { error: "No purchases have been made with that email" },
        { status: 404 }
      );
    }

    // Group purchases by link and get unique links
    const uniqueLinks = purchases
      .map((purchase) => purchase.link)
      .filter((link, index, self) => 
        index === self.findIndex((l) => l.id === link.id)
      );

    // Fetch full link data with files to get images and find checkout sessions
    const linksWithImages = await Promise.all(
      uniqueLinks.map(async (link) => {
        // Find the purchase activity for this link
        const purchaseActivity = purchases.find((p) => p.linkId === link.id);
        
        // Build purchase URL that verifies by email
        // We'll use a special verification endpoint that checks purchase by email
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://granted.gg";
        const purchaseUrl = `${baseUrl}/${link.url}?email=${encodeURIComponent(email)}&purchased=true`;

        const fullLink = await prisma.link.findUnique({
          where: { id: link.id },
          select: {
            coverPhotoS3Key: true,
            files: {
              select: {
                blurredS3Key: true,
                isCoverPhoto: true,
              },
              orderBy: [
                { isCoverPhoto: "desc" }, // Cover photos first
                { createdAt: "asc" }, // Then by creation date
              ],
              take: 1, // Just get the first/cover photo
            },
          },
        });

        let imageUrl: string | null = null;

        // Prioritize cover photo S3 key
        if (fullLink?.coverPhotoS3Key) {
          try {
            imageUrl = await getPresignedS3Url(fullLink.coverPhotoS3Key, 3600 * 24);
          } catch (error) {
            console.error(`Failed to generate presigned URL for cover photo ${fullLink.coverPhotoS3Key}:`, error);
          }
        }

        // Fallback to file's blurred image if no cover photo
        if (!imageUrl && fullLink) {
          const imageFile = fullLink.files.find(f => f.blurredS3Key) || fullLink.files[0];
          if (imageFile?.blurredS3Key) {
            try {
              imageUrl = await getPresignedS3Url(imageFile.blurredS3Key, 3600 * 24); // 24 hour expiry for email
            } catch (error) {
              console.error(`Failed to generate presigned URL for image ${imageFile.blurredS3Key}:`, error);
            }
          }
        }


        return {
          url: purchaseUrl,
          name: link.name || link.url,
          price: Number(link.price),
          purchasedAt: purchaseActivity?.createdAt || link.createdAt,
          image: imageUrl || "https://plus.unsplash.com/premium_photo-1667128695621-ca19d844a643?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Fallback to placeholder
        };
      })
    );

    // Send email with purchase links
    if (process.env.RESEND_API_KEY) {
      try {
        const emailHtml = await render(
          LookupPurchasesEmail({
            email,
            purchases: linksWithImages,
          })
        );

        const { data, error } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Granted <no-reply@granted.gg>",
          to: email,
          subject: `Your Purchase History - ${linksWithImages.length} Link${linksWithImages.length !== 1 ? 's' : ''}`,
          html: emailHtml,
        });

        if (error) {
          console.error("Error sending lookup email:", error);
          return NextResponse.json(
            { error: "Failed to send email" },
            { status: 500 }
          );
        }

        console.log(`Lookup email sent to ${email}`, data?.id);
      } catch (emailError) {
        console.error("Error sending lookup email:", emailError);
        return NextResponse.json(
          { error: "Failed to send email" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Email sent",
      purchaseCount: linksWithImages.length,
    });
  } catch (error) {
    console.error("Error in lookup:", error);
    return NextResponse.json(
      { error: "Failed to process lookup request" },
      { status: 500 }
    );
  }
}

