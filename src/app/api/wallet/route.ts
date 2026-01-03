import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { centsToDollars } from "@/lib/stripe";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Fetch all links for the user to calculate total earnings
        const links = await prisma.link.findMany({
            where: {
                userId: session.user.id,
            },
            select: {
                id: true,
                totalEarnings: true,
            },
        });

        // Calculate total available funds (sum of all link earnings)
        const totalAvailableFunds = links.reduce((sum, link) => {
            return sum + Number(link.totalEarnings);
        }, 0);

        // Get all link IDs for the user
        const userLinkIds = links.map(link => link.id);

        // Fetch only purchase and withdraw activities (exclude clicks)
        const allActivities = await prisma.activity.findMany({
            where: {
                linkId: {
                    in: userLinkIds,
                },
                type: {
                    in: ["purchase", "withdraw"],
                },
            },
            include: {
                link: {
                    select: {
                        id: true,
                        url: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 50, // Get last 50 activities
        });

        // Format activities
        const formattedActivities = allActivities.map((activity) => ({
            id: activity.id,
            linkId: activity.linkId,
            linkUrl: activity.link.url,
            linkName: activity.link.name || activity.link.url,
            type: activity.type as "purchase" | "withdraw",
            amount: activity.amount !== null ? centsToDollars(activity.amount) : null,
            createdAt: activity.createdAt.toISOString(),
        }));

        // Filter sales (purchases) and withdraws
        const sales = formattedActivities.filter(a => a.type === "purchase");
        const withdraws = formattedActivities.filter(a => a.type === "withdraw");

        return NextResponse.json({
            success: true,
            availableFunds: totalAvailableFunds,
            recentSales: sales,
            allActivities: formattedActivities,
            withdraws: withdraws,
        });
    } catch (error) {
        console.error("Error fetching wallet data:", error);
        return NextResponse.json(
            { error: "Failed to fetch wallet data" },
            { status: 500 }
        );
    }
}

