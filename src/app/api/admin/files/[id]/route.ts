import { prisma } from "@/lib/prisma";
import { s3Client } from "@/lib/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { checkAdminStatus } from "@/lib/admin-helpers";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch file to get S3 keys
    const file = await prisma.file.findUnique({
      where: { id },
      select: {
        id: true,
        s3Key: true,
        blurredS3Key: true,
        linkId: true,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Delete from S3
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json(
        { error: "S3 bucket not configured" },
        { status: 500 }
      );
    }

    try {
      // Delete original file
      if (file.s3Key) {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: file.s3Key,
          })
        );
      }

      // Delete blurred file if it exists
      if (file.blurredS3Key) {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: file.blurredS3Key,
          })
        );
      }
    } catch (s3Error) {
      console.error("Error deleting files from S3:", s3Error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete file record from database
    await prisma.file.delete({
      where: { id },
    });

    // Update link's file count
    const fileCount = await prisma.file.count({
      where: { linkId: file.linkId },
    });

    // If no files remain, we might want to handle the link differently
    // For now, just return success

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
