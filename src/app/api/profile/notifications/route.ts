import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        emailNotificationLinkViews: true,
        emailNotificationLinkPurchases: true,
        emailNotificationCashOut: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      emailNotificationLinkViews: user.emailNotificationLinkViews,
      emailNotificationLinkPurchases: user.emailNotificationLinkPurchases,
      emailNotificationCashOut: user.emailNotificationCashOut,
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      emailNotificationLinkViews,
      emailNotificationLinkPurchases,
      emailNotificationCashOut,
    } = body;

    // Validate that at least one field is provided
    if (
      emailNotificationLinkViews === undefined &&
      emailNotificationLinkPurchases === undefined &&
      emailNotificationCashOut === undefined
    ) {
      return NextResponse.json(
        { error: "At least one notification preference must be provided" },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: {
      emailNotificationLinkViews?: boolean;
      emailNotificationLinkPurchases?: boolean;
      emailNotificationCashOut?: boolean;
    } = {};

    if (emailNotificationLinkViews !== undefined) {
      updateData.emailNotificationLinkViews = emailNotificationLinkViews;
    }
    if (emailNotificationLinkPurchases !== undefined) {
      updateData.emailNotificationLinkPurchases = emailNotificationLinkPurchases;
    }
    if (emailNotificationCashOut !== undefined) {
      updateData.emailNotificationCashOut = emailNotificationCashOut;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        emailNotificationLinkViews: true,
        emailNotificationLinkPurchases: true,
        emailNotificationCashOut: true,
      },
    });

    return NextResponse.json({
      emailNotificationLinkViews: user.emailNotificationLinkViews,
      emailNotificationLinkPurchases: user.emailNotificationLinkPurchases,
      emailNotificationCashOut: user.emailNotificationCashOut,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}

