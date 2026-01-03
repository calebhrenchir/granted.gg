import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { centsToDollars } from "@/lib/stripe";

export async function GET(
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

    // Verify the link exists and belongs to the user
    const link = await prisma.link.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    if (link.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "20", 10);

    // Fetch activities for this link with pagination
    const activities = await prisma.activity.findMany({
      where: { linkId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    // Check if there are more activities
    const totalCount = await prisma.activity.count({
      where: { linkId },
    });

    const hasMore = skip + take < totalCount;

    return NextResponse.json({
      success: true,
      activities: activities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        // Convert amount from cents to dollars for display
        amount: activity.amount !== null ? centsToDollars(activity.amount) : null,
        createdAt: activity.createdAt.toISOString(),
      })),
      hasMore,
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching activity:", error);
    
    // Check if it's a Prisma error about missing model
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      if (error.message.includes("Unknown model") || error.message.includes("activity")) {
        return NextResponse.json(
          { 
            error: "Activity model not found. Please run: npx prisma migrate dev --name add_activity_model",
            details: error.message 
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: "Failed to fetch activity",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
