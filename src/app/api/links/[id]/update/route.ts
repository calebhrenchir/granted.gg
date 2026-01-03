import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    const { id: linkId } = await params;
    const body = await request.json();

    // Fetch link to verify ownership
    const link = await prisma.link.findUnique({
      where: { id: linkId },
      select: { userId: true },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (link.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.price !== undefined) {
      // Ensure price is a valid number and meets minimum requirement
      const price = parseFloat(body.price);
      if (isNaN(price) || price < 0) {
        return NextResponse.json(
          { error: "Price must be a valid non-negative number" },
          { status: 400 }
        );
      }
      if (price < 5.0) {
        return NextResponse.json(
          { error: "Price must be at least $5.00" },
          { status: 400 }
        );
      }
      updateData.price = price;
    }

    // Update link
    const updatedLink = await prisma.link.update({
      where: { id: linkId },
      data: updateData,
      select: {
        id: true,
        name: true,
        url: true,
        price: true,
        totalEarnings: true,
        totalClicks: true,
        totalSales: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      link: {
        ...updatedLink,
        price: Number(updatedLink.price),
        totalEarnings: Number(updatedLink.totalEarnings),
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

