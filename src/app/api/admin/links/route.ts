import { prisma } from "@/lib/prisma";
import { checkAdminStatus } from "@/lib/admin-helpers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const skip = (page - 1) * pageSize;

    // Build where clause for search
    const where: any = {};
    if (search) {
      where.OR = [
        { url: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.link.count({ where });

    // Fetch links with user and file counts
    const links = await prisma.link.findMany({
      where,
      select: {
        id: true,
        url: true,
        name: true,
        price: true,
        totalEarnings: true,
        totalClicks: true,
        totalSales: true,
        isPurchaseable: true,
        isDownloadable: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            files: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: pageSize,
    });

    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      success: true,
      links: links.map((link) => ({
        ...link,
        price: Number(link.price),
        totalEarnings: Number(link.totalEarnings),
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching links:", error);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}
