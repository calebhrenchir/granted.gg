import { prisma } from "@/lib/prisma";
import { checkAdminStatus } from "@/lib/admin-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all counts and activity data in parallel for better performance
    const [totalUsers, totalLinks, totalFiles, totalSales, recentPurchases, recentClicks] = await Promise.all([
      prisma.user.count(),
      prisma.link.count(),
      prisma.file.count(),
      prisma.activity.count({
        where: {
          type: "purchase",
        },
      }),
      prisma.activity.findMany({
        where: {
          type: "purchase",
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        select: {
          createdAt: true,
          amount: true,
          platformFee: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.activity.findMany({
        where: {
          type: "click",
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    // Group purchases and clicks by day and calculate daily counts
    const dailySales: { [key: string]: number } = {};
    const dailyRevenue: { [key: string]: number } = {};
    const dailyProfit: { [key: string]: number } = {};
    const dailyClicks: { [key: string]: number } = {};
    let totalRevenue = 0;

    // Initialize all 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD format
      dailySales[dateKey] = 0;
      dailyRevenue[dateKey] = 0;
      dailyProfit[dateKey] = 0;
      dailyClicks[dateKey] = 0;
    }

    // Fill in actual sales data
    recentPurchases.forEach((purchase) => {
      const dateKey = purchase.createdAt.toISOString().split("T")[0];
      if (dailySales[dateKey] !== undefined) {
        dailySales[dateKey] += 1;
        if (purchase.amount) {
          const revenueInCents = purchase.amount;
          dailyRevenue[dateKey] += revenueInCents; // in cents
          // Calculate profit using actual platform fee from the purchase (default to 20% if not set)
          const platformFeePercent = purchase.platformFee ?? 20;
          const profitPercent = platformFeePercent / 100; // Convert to decimal (e.g., 20% = 0.2)
          dailyProfit[dateKey] += revenueInCents * profitPercent; // in cents
          totalRevenue += revenueInCents; // amount is in cents
        }
      }
    });

    // Fill in actual clicks data
    recentClicks.forEach((click) => {
      const dateKey = click.createdAt.toISOString().split("T")[0];
      if (dailyClicks[dateKey] !== undefined) {
        dailyClicks[dateKey] += 1;
      }
    });

    // Convert to array format for the charts (30 days)
    const salesData = Object.values(dailySales);
    const revenueData = Object.values(dailyRevenue).map((cents) => cents / 100); // Convert to dollars
    const profitData = Object.values(dailyProfit).map((cents) => cents / 100); // Convert to dollars
    const clicksData = Object.values(dailyClicks);

    // Calculate conversion rates per day (sales / clicks * 100)
    const conversionData = clicksData.map((clicks, i) => {
      if (clicks === 0) return 0;
      return (salesData[i] / clicks) * 100;
    });

    // Calculate total sales count for last 30 days
    const salesLast30Days = salesData.reduce((sum, count) => sum + count, 0);
    
    // Calculate total clicks for last 30 days
    const clicksLast30Days = clicksData.reduce((sum, count) => sum + count, 0);
    
    // Calculate overall conversion rate
    const overallConversionRate = clicksLast30Days > 0 
      ? (salesLast30Days / clicksLast30Days) * 100 
      : 0;

    // Calculate total profit using actual platform fees from purchases
    let totalProfitInCents = 0;
    recentPurchases.forEach((purchase) => {
      if (purchase.amount) {
        const platformFeePercent = purchase.platformFee ?? 20;
        const profitPercent = platformFeePercent / 100;
        totalProfitInCents += purchase.amount * profitPercent;
      }
    });
    const totalProfit = totalProfitInCents / 100; // Convert to dollars

    return NextResponse.json({
      totalUsers,
      totalLinks,
      totalFiles,
      totalSales,
      salesLast30Days,
      salesData,
      totalRevenue: totalRevenue / 100, // Convert cents to dollars
      totalProfit,
      revenueData,
      profitData,
      clicksLast30Days,
      clicksData,
      conversionData,
      overallConversionRate,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
