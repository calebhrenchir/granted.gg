import { NextResponse } from "next/server";
import { checkAdminStatus } from "@/lib/admin-helpers";
import { prisma } from "@/lib/prisma";

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

    const link = await prisma.link.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isFrozen: true,
          },
        },
        reports: {
          orderBy: {
            createdAt: "desc",
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
        },
        _count: {
          select: {
            reports: true,
            files: true,
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

    // Calculate priority
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentReports = link.reports.filter(
      (report) => new Date(report.createdAt) >= sevenDaysAgo
    );
    const isPriority = recentReports.length >= 3;

    return NextResponse.json({
      success: true,
      link: {
        ...link,
        priority: isPriority,
        recentReportCount: recentReports.length,
      },
    });
  } catch (error) {
    console.error("Error fetching link reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch link reports" },
      { status: 500 }
    );
  }
}


