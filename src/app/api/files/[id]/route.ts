import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedS3Url } from "@/lib/s3";

export async function PATCH(
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

    const { id: fileId } = await params;
    const body = await request.json();

    // Fetch file to verify ownership
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        link: {
          select: { userId: true },
        },
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (file.link.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (body.isCoverPhoto !== undefined) updateData.isCoverPhoto = body.isCoverPhoto;
    if (body.isPreviewable !== undefined) updateData.isPreviewable = body.isPreviewable;

    // If setting as cover photo, unset all other cover photos for this link
    if (body.isCoverPhoto === true) {
      await prisma.file.updateMany({
        where: {
          linkId: file.linkId,
          id: { not: fileId },
        },
        data: {
          isCoverPhoto: false,
        } as { isCoverPhoto: boolean },
      });

      // Also update the link's coverPhotoS3Key to this file's blurred version (if available) or original
      const coverS3Key = file.blurredS3Key || file.s3Key;
      await prisma.link.update({
        where: { id: file.linkId },
        data: { coverPhotoS3Key: coverS3Key },
      });
    }

    // Update file
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: updateData,
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        s3Key: true,
        blurredS3Key: true,
        isCoverPhoto: true,
        isPreviewable: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      file: updatedFile,
    });
  } catch (error) {
    console.error("Error updating file:", error);
    return NextResponse.json(
      { error: "Failed to update file" },
      { status: 500 }
    );
  }
}
