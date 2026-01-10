import { NextResponse } from "next/server";
import { checkAdminStatus } from "@/lib/admin-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const linkId = searchParams.get("linkId");

    // Get reported links with report counts
    const where: any = {
      reports: {
        some: {},
      },
    };

    if (linkId) {
      where.id = linkId;
    }

    if (status !== "all") {
      where.reports = {
        some: {
          status,
        },
      };
    }

    const links = await prisma.link.findMany({
      where,
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
          where: status !== "all" ? { status } : {},
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
      orderBy: {
        reports: {
          _count: "desc",
        },
      },
    });

    // Calculate priority (3+ reports in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const linksWithPriority = links.map((link) => {
      const recentReports = link.reports.filter(
        (report) => new Date(report.createdAt) >= sevenDaysAgo
      );
      const isPriority = recentReports.length >= 3;

      return {
        ...link,
        priority: isPriority,
        recentReportCount: recentReports.length,
        totalReportCount: link._count.reports,
      };
    });

    return NextResponse.json({
      success: true,
      links: linksWithPriority,
    });
  } catch (error) {
    console.error("Error fetching reported links:", error);
    return NextResponse.json(
      { error: "Failed to fetch reported links" },
      { status: 500 }
    );
  }
}

