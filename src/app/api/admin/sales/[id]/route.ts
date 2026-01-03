import { prisma } from "@/lib/prisma";
import { centsToDollars } from "@/lib/stripe";
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

    // Fetch sale with all related data
    const sale = await prisma.activity.findUnique({
      where: { id },
      include: {
        link: {
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
            _count: {
              select: {
                files: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }

    if (sale.type !== "purchase") {
      return NextResponse.json(
        { error: "Activity is not a purchase" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sale: {
        id: sale.id,
        amount: sale.amount ? centsToDollars(sale.amount) : 0,
        amountInCents: sale.amount || 0,
        stripePaymentIntentId: sale.stripePaymentIntentId,
        createdAt: sale.createdAt.toISOString(),
        link: {
          ...sale.link,
          price: Number(sale.link.price),
          totalEarnings: Number(sale.link.totalEarnings),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching sale:", error);
    return NextResponse.json(
      { error: "Failed to fetch sale" },
      { status: 500 }
    );
  }
}
