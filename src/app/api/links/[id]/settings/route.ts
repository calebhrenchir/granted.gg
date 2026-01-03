import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedS3Url } from "@/lib/s3";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: linkId } = await params;

    // Fetch link with files
    const link = await prisma.link.findUnique({
      where: { id: linkId },
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

    // Verify ownership
    if (link.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
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

    // Generate presigned URLs for all files
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
          isCoverPhoto: file.isCoverPhoto,
          isPreviewable: file.isPreviewable,
          createdAt: file.createdAt.toISOString(),
        };
      })
    );

    // Convert price and totalEarnings from Decimal to number
    const price = Number(link.price);
    const totalEarnings = Number(link.totalEarnings);

    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        url: link.url,
        name: link.name,
        price,
        totalEarnings,
        totalClicks: link.totalClicks,
        totalSales: link.totalSales,
        coverPhotoS3Url,
        isPurchaseable: link.isPurchaseable,
        isDownloadable: link.isDownloadable,
        isLinkTitleVisible: link.isLinkTitleVisible,
        createdAt: link.createdAt.toISOString(),
      },
      files: filesWithUrls,
    });
  } catch (error) {
    console.error("Error fetching link:", error);
    return NextResponse.json(
      { error: "Failed to fetch link" },
      { status: 500 }
    );
  }
}
