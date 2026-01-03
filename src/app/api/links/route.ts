import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedS3Url } from "@/lib/s3";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all links for the authenticated user
    const links = await prisma.link.findMany({
      where: {
        userId: session.user.id,
        deleted: false,
      },
      include: {
        _count: {
          select: {
            files: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Generate presigned URLs for cover photos and convert prices
    const linksWithUrls = await Promise.all(
      links.map(async (link) => {
        let coverPhotoS3Url: string | null = null;
        if (link.coverPhotoS3Key) {
          try {
            coverPhotoS3Url = await getPresignedS3Url(link.coverPhotoS3Key, 3600);
          } catch (error) {
            console.error(`Failed to generate presigned URL for cover photo ${link.coverPhotoS3Key}:`, error);
          }
        }

        // Convert price and totalEarnings from Decimal to number
        // Schema uses Decimal which stores dollars, so just convert to number
        const price = Number(link.price);
        const totalEarnings = Number(link.totalEarnings);

        return {
          id: link.id,
          url: link.url,
          name: link.name,
          price,
          totalEarnings,
          totalClicks: link.totalClicks,
          totalSales: link.totalSales,
          coverPhotoS3Url,
          coverColor: link.coverColor,
          fileCount: link._count.files,
          createdAt: link.createdAt.toISOString(),
          updatedAt: link.updatedAt.toISOString(),
        };
      })
    );

    return NextResponse.json({
      success: true,
      links: linksWithUrls,
    });
  } catch (error) {
    console.error("Error fetching links:", error);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}
