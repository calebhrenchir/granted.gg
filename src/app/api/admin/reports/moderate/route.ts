import { NextResponse } from "next/server";
import { checkAdminStatus } from "@/lib/admin-helpers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const adminUser = await checkAdminStatus();
    
    if (!adminUser || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { linkId, action, fileIds, reason } = body;

    if (!linkId || !action) {
      return NextResponse.json(
        { error: "Link ID and action are required" },
        { status: 400 }
      );
    }

    const link = await prisma.link.findUnique({
      where: { id: linkId },
      include: {
        user: true,
        files: true,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    let result: any = {};

    switch (action) {
      case "freeze_user":
        // Freeze the user account
        await prisma.user.update({
          where: { id: link.userId! },
          data: {
            isFrozen: true,
          },
        });
        result.message = "User account frozen";
        break;

      case "remove_files":
        // Remove specific files
        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
          return NextResponse.json(
            { error: "File IDs are required for remove_files action" },
            { status: 400 }
          );
        }
        
        // Delete files from database (S3 deletion would need to be handled separately)
        await prisma.file.deleteMany({
          where: {
            id: {
              in: fileIds,
            },
            linkId: linkId,
          },
        });
        result.message = `Removed ${fileIds.length} file(s)`;
        break;

      case "archive_link":
        // Archive the link (disable it)
        await prisma.link.update({
          where: { id: linkId },
          data: {
            archived: true,
            archivedAt: new Date(),
            disabled: true,
            disabledAt: new Date(),
            disabledReason: reason || "Archived due to reports",
          },
        });
        result.message = "Link archived";
        break;

      case "dismiss_reports":
        // Mark all pending reports as dismissed
        await prisma.report.updateMany({
          where: {
            linkId: linkId,
            status: "pending",
          },
          data: {
            status: "dismissed",
            reviewedBy: session.user.id,
            reviewedAt: new Date(),
          },
        });
        result.message = "Reports dismissed";
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Mark reports as reviewed
    if (action !== "dismiss_reports") {
      await prisma.report.updateMany({
        where: {
          linkId: linkId,
          status: "pending",
        },
        data: {
          status: "resolved",
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error moderating link:", error);
    return NextResponse.json(
      { error: "Failed to moderate link" },
      { status: 500 }
    );
  }
}


