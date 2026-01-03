"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DollarSign, TrendingUp, Users, Link2, MousePointerClick, ShoppingCart, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AnalyticsData {
  period: string;
  totals: {
    users: number;
    links: number;
    files: number;
    sales: number;
    revenue: number;
    profit: number;
    clicks: number;
    conversionRate: number;
    averageOrderValue: number;
  };
  growth: {
    newUsers: number;
    newLinks: number;
  };
  charts: {
    sales: number[];
    revenue: number[];
    profit: number[];
    clicks: number[];
    conversions: number[];
    users: number[];
  };
  topLinks: Array<{
    id: string;
    url: string;
    name: string | null;
    totalSales: number;
    totalEarnings: number;
    totalClicks: number;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
    } | null;
  }>;
}

function MetricCard({ title, value, loading, icon: Icon, trend }: { 
  title: string; 
  value: string | number; 
  loading?: boolean;
  icon?: any;
  trend?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-md text-white/50 font-semibold">{title}</h2>
        {Icon && <Icon className="size-4 text-white/30" />}
      </div>
      <p className="text-3xl font-bold">
        {loading ? (
          <span className="inline-block h-9 w-24 bg-white/10 animate-pulse rounded" />
        ) : (
          typeof value === 'number' ? value.toLocaleString() : value
        )}
      </p>
      {trend && (
        <p className="text-xs text-white/40 mt-1">{trend}</p>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, children, long = false }: { title: string; subtitle?: string; children: React.ReactNode, long?: boolean}) {
  return (
    <div className={cn("bg-white/5 border border-white/5 rounded-sm p-4", long && "col-span-2")}>
      <div className="flex flex-col mb-6">
        <div className="flex flex-row justify-between">
          <h2 className="text-md text-white/50 font-semibold mb-2">{title}</h2>
          {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    if (status === "authenticated") {
      fetchAnalytics();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session, period]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        console.error("Failed to fetch analytics:", response.status, response.statusText);
        // If unauthorized, clear analytics data
        if (response.status === 401) {
          setAnalytics(null);
        }
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/50">Loading...</p>
      </div>
    );
  }
  
  const salesData = analytics?.charts.sales ?? Array(parseInt(period) || 30).fill(0);
  const revenueData = analytics?.charts.revenue ?? Array(parseInt(period) || 30).fill(0);
  const profitData = analytics?.charts.profit ?? Array(parseInt(period) || 30).fill(0);
  const clicksData = analytics?.charts.clicks ?? Array(parseInt(period) || 30).fill(0);
  const conversionData = analytics?.charts.conversions ?? Array(parseInt(period) || 30).fill(0);
  const usersData = analytics?.charts.users ?? Array(parseInt(period) || 30).fill(0);

  const maxSales = Math.max(...salesData, 1);
  const maxRevenue = Math.max(...revenueData, 1);
  const maxProfit = Math.max(...profitData, 1);
  const maxClicks = Math.max(...clicksData, 1);
  const maxConversion = Math.max(...conversionData, 1);
  const maxUsers = Math.max(...usersData, 1);

  const periods = [
    { value: "7", label: "7 Days" },
    { value: "30", label: "30 Days" },
    { value: "90", label: "90 Days" },
    { value: "all", label: "All Time" },
  ];

  // Helper function to get date for a data point
  const getDateForIndex = (index: number, totalDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() - (totalDays - 1 - index));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartDays = period === "all" ? 30 : (parseInt(period) || 30);

  return (
    <TooltipProvider>
      <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-4xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.value)}
              className={cn(
                period === p.value
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              )}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <MetricCard 
          title="Total Revenue" 
          value={analytics?.totals.revenue ? `$${analytics.totals.revenue.toFixed(2)}` : "$0.00"} 
          loading={loading}
          icon={DollarSign}
        />
        <MetricCard 
          title="Total Profit" 
          value={analytics?.totals.profit ? `$${analytics.totals.profit.toFixed(2)}` : "$0.00"} 
          loading={loading}
          icon={DollarSign}
          trend="platform fees"
        />
        <MetricCard 
          title="Total Sales" 
          value={analytics?.totals.sales ?? 0} 
          loading={loading}
          icon={ShoppingCart}
        />
        <MetricCard 
          title="Total Clicks" 
          value={analytics?.totals.clicks ?? 0} 
          loading={loading}
          icon={MousePointerClick}
        />
      </div>

      {/* Secondary Metrics Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <MetricCard 
          title="Conversion Rate" 
          value={analytics?.totals.conversionRate ? `${analytics.totals.conversionRate.toFixed(1)}%` : "0%"} 
          loading={loading}
          icon={TrendingUp}
        />
        <MetricCard 
          title="Average Order Value" 
          value={analytics?.totals.averageOrderValue ? `$${analytics.totals.averageOrderValue.toFixed(2)}` : "$0.00"} 
          loading={loading}
        />
        <MetricCard 
          title="New Users" 
          value={analytics?.growth.newUsers ?? 0} 
          loading={loading}
          icon={Users}
          trend={period !== "all" ? `in last ${period} days` : undefined}
        />
        <MetricCard 
          title="New Links" 
          value={analytics?.growth.newLinks ?? 0} 
          loading={loading}
          icon={Link2}
          trend={period !== "all" ? `in last ${period} days` : undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Revenue" subtitle={`last ${period === "all" ? "30" : period} days`}>
          <div className="flex items-end justify-between gap-[3px] h-32 sm:h-40">
            {loading ? (
              Array(chartDays).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-white/10 animate-pulse rounded-t-[2px]"
                  style={{ height: "20%" }}
                />
              ))
            ) : (
              revenueData.map((value, i) => {
                const date = getDateForIndex(i, chartDays);
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        className="flex-1 bg-gradient-to-t from-[#d4a455] to-[#f4c675] rounded-t-[2px] transition-all hover:opacity-80 cursor-pointer"
                        style={{ height: `${(value / maxRevenue) * 100}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-semibold">${value.toFixed(2)}</p>
                        <p className="text-xs text-black/70">{date}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </div>
        </ChartCard>

        <ChartCard title="Profit" subtitle={`last ${period === "all" ? "30" : period} days (platform fees)`}>
          <div className="flex items-end justify-between gap-[3px] h-32 sm:h-40">
            {loading ? (
              Array(chartDays).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-white/10 animate-pulse rounded-t-[2px]"
                  style={{ height: "20%" }}
                />
              ))
            ) : (
              profitData.map((value, i) => {
                const date = getDateForIndex(i, chartDays);
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        className="flex-1 bg-gradient-to-t from-[#4ade80] to-[#86efac] rounded-t-[2px] transition-all hover:opacity-80 cursor-pointer"
                        style={{ height: `${(value / maxProfit) * 100}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-semibold">${value.toFixed(2)}</p>
                        <p className="text-xs text-black/70">{date}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </div>
        </ChartCard>

        <ChartCard title="Sales" subtitle={`last ${period === "all" ? "30" : period} days`}>
          <div className="flex items-end justify-between gap-[3px] h-32 sm:h-40">
            {loading ? (
              Array(chartDays).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-white/10 animate-pulse rounded-t-[2px]"
                  style={{ height: "20%" }}
                />
              ))
            ) : (
              salesData.map((value, i) => {
                const date = getDateForIndex(i, chartDays);
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        className="flex-1 bg-gradient-to-t from-[#d4a455] to-[#f4c675] rounded-t-[2px] transition-all hover:opacity-80 cursor-pointer"
                        style={{ height: `${(value / maxSales) * 100}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-semibold">{value} {value === 1 ? 'sale' : 'sales'}</p>
                        <p className="text-xs text-black/70">{date}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </div>
        </ChartCard>

        <ChartCard title="Clicks" subtitle={`last ${period === "all" ? "30" : period} days`}>
          <div className="flex items-end justify-between gap-[3px] h-32 sm:h-40">
            {loading ? (
              Array(chartDays).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-white/10 animate-pulse rounded-t-[2px]"
                  style={{ height: "20%" }}
                />
              ))
            ) : (
              clicksData.map((value, i) => {
                const date = getDateForIndex(i, chartDays);
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        className="flex-1 bg-gradient-to-t from-[#447eaa] to-[#559dd4] rounded-t-[2px] transition-all hover:opacity-80 cursor-pointer"
                        style={{ height: `${(value / maxClicks) * 100}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-semibold">{value} {value === 1 ? 'click' : 'clicks'}</p>
                        <p className="text-xs text-black/70">{date}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </div>
        </ChartCard>

        <ChartCard title="Conversions" subtitle={`last ${period === "all" ? "30" : period} days`} long>
          <div className="flex items-end justify-between gap-[3px] h-32 sm:h-40">
            {loading ? (
              Array(chartDays).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-white/10 animate-pulse rounded-t-[2px]"
                  style={{ height: "20%" }}
                />
              ))
            ) : (
              conversionData.map((value, i) => {
                const date = getDateForIndex(i, chartDays);
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        className="flex-1 bg-gradient-to-t from-[#447eaa] to-[#559dd4] rounded-t-[2px] transition-all hover:opacity-80 cursor-pointer"
                        style={{ height: `${(value / maxConversion) * 100}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-semibold">{value.toFixed(1)}% conversion</p>
                        <p className="text-xs text-black/70">{date}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </div>
        </ChartCard>
      </div>

      {/* Top Performing Links */}
      {analytics?.topLinks && analytics.topLinks.length > 0 && (
        <div className="bg-white/5 border border-white/5 rounded-sm p-4">
          <h2 className="text-md text-white/50 font-semibold mb-4">Top Performing Links</h2>
          <div className="space-y-3">
            {analytics.topLinks.map((link, index) => {
              const ownerName = link.user
                ? link.user.firstName && link.user.lastName
                  ? `${link.user.firstName} ${link.user.lastName}`
                  : link.user.name || link.user.email || "Unknown"
                : "No Owner";

              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-sm border border-white/10"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white/70 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {link.name || link.url}
                      </p>
                      <p className="text-white/50 text-sm truncate">{ownerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 ml-4">
                    <div className="text-right">
                      <p className="text-white/70 text-xs">Earnings</p>
                      <p className="text-white font-semibold">${link.totalEarnings.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/70 text-xs">Sales</p>
                      <p className="text-white font-semibold">{link.totalSales}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/70 text-xs">Clicks</p>
                      <p className="text-white font-semibold">{link.totalClicks}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}