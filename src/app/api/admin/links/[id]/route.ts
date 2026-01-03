import { prisma } from "@/lib/prisma";
import { getPresignedS3Url } from "@/lib/s3";
import { checkAdminStatus } from "@/lib/admin-helpers";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch link with all related data
    const link = await prisma.link.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        files: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            files: true,
            activities: true,
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

    // Generate presigned URL for cover photo
    let coverPhotoS3Url: string | null = null;
    if (link.coverPhotoS3Key) {
      try {
        coverPhotoS3Url = await getPresignedS3Url(link.coverPhotoS3Key, 3600);
      } catch (error) {
        console.error(`Failed to generate presigned URL for cover photo:`, error);
      }
    }

    // Get purchase activities count
    const purchaseCount = await prisma.activity.count({
      where: {
        linkId: id,
        type: "purchase",
      },
    });

    return NextResponse.json({
      success: true,
      link: {
        ...link,
        price: Number(link.price),
        totalEarnings: Number(link.totalEarnings),
        coverPhotoS3Url,
        purchaseCount,
      },
    });
  } catch (error) {
    console.error("Error fetching link:", error);
    return NextResponse.json(
      { error: "Failed to fetch link" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Build update data object
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.isPurchaseable !== undefined) updateData.isPurchaseable = body.isPurchaseable;
    if (body.isDownloadable !== undefined) updateData.isDownloadable = body.isDownloadable;
    if (body.isLinkTitleVisible !== undefined) updateData.isLinkTitleVisible = body.isLinkTitleVisible;

    // Update link
    const updatedLink = await prisma.link.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        price: true,
        isPurchaseable: true,
        isDownloadable: true,
        isLinkTitleVisible: true,
      },
    });

    return NextResponse.json({
      success: true,
      link: {
        ...updatedLink,
        price: Number(updatedLink.price),
      },
    });
  } catch (error) {
    console.error("Error updating link:", error);
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500 }
    );
  }
}