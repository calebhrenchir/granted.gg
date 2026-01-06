import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedS3Url, createVideoPreview, createAudioPreview } from "@/lib/s3";

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

    // If setting as previewable and it's a video/audio file, generate preview if it doesn't exist
    if (body.isPreviewable === true && !file.previewS3Key) {
      const isVideo = file.mimeType.startsWith("video/");
      const isAudio = file.mimeType.startsWith("audio/");
      
      if (isVideo || isAudio) {
        console.log(`[PATCH /api/files/${fileId}] Generating preview for ${isVideo ? 'video' : 'audio'} file: ${file.name}`);
        try {
          let previewS3Key: string | null = null;
          
          if (isVideo) {
            previewS3Key = await createVideoPreview(file.s3Key, 3);
          } else if (isAudio) {
            previewS3Key = await createAudioPreview(file.s3Key, 3);
          }
          
          if (previewS3Key) {
            updateData.previewS3Key = previewS3Key;
            console.log(`[PATCH /api/files/${fileId}] Preview generated successfully: ${previewS3Key}`);
          } else {
            console.warn(`[PATCH /api/files/${fileId}] Failed to generate preview, will use full file as fallback`);
            // Continue without preview - will use full file as fallback
          }
        } catch (error) {
          console.error(`[PATCH /api/files/${fileId}] Error generating preview:`, error);
          // Continue without preview - will use full file as fallback
        }
      }
    }

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
        previewS3Key: true,
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
