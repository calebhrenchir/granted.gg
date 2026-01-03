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
    const period = searchParams.get("period") || "30"; // 7, 30, 90, or all
    const days = period === "all" ? null : parseInt(period, 10);

    // Calculate date range
    const startDate = days ? new Date() : null;
    if (startDate && days) {
      startDate.setDate(startDate.getDate() - days);
    }

    // Build date filter
    const dateFilter = startDate ? { gte: startDate } : {};

    // Fetch all analytics data in parallel
    const [
      totalUsers,
      totalLinks,
      totalFiles,
      totalSales,
      totalRevenue,
      recentPurchases,
      recentClicks,
      newUsers,
      newLinks,
      topLinks,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.link.count(),
      prisma.file.count(),
      prisma.activity.count({
        where: {
          type: "purchase",
          ...(startDate && { createdAt: dateFilter }),
        },
      }),
      // Calculate total revenue
      prisma.activity.aggregate({
        where: {
          type: "purchase",
          ...(startDate && { createdAt: dateFilter }),
          amount: { not: null },
        },
        _sum: {
          amount: true,
        },
      }),
      // Recent purchases for charts
      prisma.activity.findMany({
        where: {
          type: "purchase",
          ...(startDate && { createdAt: dateFilter }),
        },
        select: {
          createdAt: true,
          amount: true,
          platformFee: true,
          linkId: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      // Recent clicks for charts
      prisma.activity.findMany({
        where: {
          type: "click",
          ...(startDate && { createdAt: dateFilter }),
        },
        select: {
          createdAt: true,
          linkId: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      // New users in period
      prisma.user.count({
        where: startDate ? { createdAt: dateFilter } : {},
      }),
      // New links in period
      prisma.link.count({
        where: startDate ? { createdAt: dateFilter } : {},
      }),
      // Top performing links
      prisma.link.findMany({
        select: {
          id: true,
          url: true,
          name: true,
          price: true,
          totalSales: true,
          totalEarnings: true,
          totalClicks: true,
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
        orderBy: {
          totalEarnings: "desc",
        },
        take: 10,
      }),
    ]);

    // Group data by day
    const chartDays = days || 30;
    const dailySales: { [key: string]: number } = {};
    const dailyRevenue: { [key: string]: number } = {};
    const dailyProfit: { [key: string]: number } = {};
    const dailyClicks: { [key: string]: number } = {};
    const dailyUsers: { [key: string]: number } = {};

    // Initialize all days with 0
    for (let i = chartDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      dailySales[dateKey] = 0;
      dailyRevenue[dateKey] = 0;
      dailyProfit[dateKey] = 0;
      dailyClicks[dateKey] = 0;
      dailyUsers[dateKey] = 0;
    }

    // Fill in sales and revenue data
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
        }
      }
    });

    // Fill in clicks data
    recentClicks.forEach((click) => {
      const dateKey = click.createdAt.toISOString().split("T")[0];
      if (dailyClicks[dateKey] !== undefined) {
        dailyClicks[dateKey] += 1;
      }
    });

    // Get new users per day
    if (startDate) {
      const newUsersData = await prisma.user.findMany({
        where: { createdAt: dateFilter },
        select: { createdAt: true },
      });
      newUsersData.forEach((user) => {
        const dateKey = user.createdAt.toISOString().split("T")[0];
        if (dailyUsers[dateKey] !== undefined) {
          dailyUsers[dateKey] += 1;
        }
      });
    }

    // Convert to arrays
    const salesData = Object.values(dailySales);
    const revenueData = Object.values(dailyRevenue).map((cents) => cents / 100); // Convert to dollars
    const profitData = Object.values(dailyProfit).map((cents) => cents / 100); // Convert to dollars
    const clicksData = Object.values(dailyClicks);
    const usersData = Object.values(dailyUsers);

    // Calculate conversion rates
    const conversionData = clicksData.map((clicks, i) => {
      if (clicks === 0) return 0;
      return (salesData[i] / clicks) * 100;
    });

    // Calculate totals
    const totalRevenueAmount = totalRevenue._sum.amount ? centsToDollars(totalRevenue._sum.amount) : 0;
    // Calculate total profit using actual platform fees from purchases
    let totalProfitInCents = 0;
    recentPurchases.forEach((purchase) => {
      if (purchase.amount) {
        const platformFeePercent = purchase.platformFee ?? 20;
        const profitPercent = platformFeePercent / 100;
        totalProfitInCents += purchase.amount * profitPercent;
      }
    });
    const totalProfitAmount = centsToDollars(totalProfitInCents);
    const totalClicks = clicksData.reduce((sum, count) => sum + count, 0);
    const totalSalesCount = salesData.reduce((sum, count) => sum + count, 0);
    const overallConversionRate = totalClicks > 0 ? (totalSalesCount / totalClicks) * 100 : 0;

    // Calculate average order value
    const averageOrderValue = totalSalesCount > 0 ? totalRevenueAmount / totalSalesCount : 0;

    return NextResponse.json({
      period,
      totals: {
        users: totalUsers,
        links: totalLinks,
        files: totalFiles,
        sales: totalSales,
        revenue: totalRevenueAmount,
        profit: totalProfitAmount,
        clicks: totalClicks,
        conversionRate: overallConversionRate,
        averageOrderValue,
      },
      growth: {
        newUsers,
        newLinks,
      },
      charts: {
        sales: salesData,
        revenue: revenueData,
        profit: profitData,
        clicks: clicksData,
        conversions: conversionData,
        users: usersData,
      },
      topLinks: topLinks.map((link) => ({
        ...link,
        price: Number(link.price || 0),
        totalEarnings: Number(link.totalEarnings),
      })),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
