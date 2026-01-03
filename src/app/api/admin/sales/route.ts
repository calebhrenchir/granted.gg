import { prisma } from "@/lib/prisma";
import { centsToDollars } from "@/lib/stripe";
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

    // Build where clause for search (only purchases)
    const where: any = {
      type: "purchase",
    };

    if (search) {
      where.OR = [
        { link: { url: { contains: search, mode: "insensitive" } } },
        { link: { name: { contains: search, mode: "insensitive" } } },
        { link: { user: { email: { contains: search, mode: "insensitive" } } } },
        { link: { user: { firstName: { contains: search, mode: "insensitive" } } } },
        { link: { user: { lastName: { contains: search, mode: "insensitive" } } } },
        { stripePaymentIntentId: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.activity.count({ where });

    // Fetch purchase activities with link and user info
    const sales = await prisma.activity.findMany({
      where,
      select: {
        id: true,
        amount: true,
        stripePaymentIntentId: true,
        createdAt: true,
        link: {
          select: {
            id: true,
            url: true,
            name: true,
            price: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
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
      sales: sales.map((sale) => ({
        id: sale.id,
        amount: sale.amount ? centsToDollars(sale.amount) : 0,
        amountInCents: sale.amount || 0,
        stripePaymentIntentId: sale.stripePaymentIntentId,
        createdAt: sale.createdAt.toISOString(),
        link: {
          ...sale.link,
          price: Number(sale.link.price),
        },
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}
