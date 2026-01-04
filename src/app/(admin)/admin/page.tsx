"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowDownRight, CreditCard, CheckCircle2 } from "lucide-react";

function MetricCard({ title, value, loading }: { title: string, value: string | number, loading?: boolean }) {
    return (
        <div className="bg-white/5 border border-white/5 rounded-sm p-4">
            <h2 className="text-md text-white/50 font-semibold mb-2">{title}</h2>
            <p className="text-3xl font-bold">
                {loading ? (
                    <span className="inline-block h-8 w-16 bg-white/10 animate-pulse rounded" />
                ) : (
                    typeof value === 'number' ? value.toLocaleString() : value
                )}
            </p>
        </div>
    );
}

interface AdminStats {
    totalUsers: number;
    totalLinks: number;
    totalFiles: number;
    totalSales: number;
    salesLast30Days: number;
    salesData: number[];
    totalRevenue: number;
    totalProfit: number;
    revenueData: number[];
    profitData: number[];
    clicksLast30Days: number;
    clicksData: number[];
    conversionData: number[];
    overallConversionRate: number;
    withdrawalsLast30Days: number;
    totalWithdrawalAmount: number;
    withdrawalsData: number[];
    withdrawalAmountsData: number[];
    usersWithConnectAccounts: number;
    usersWithVerifiedIdentity: number;
    connectAccountsWithPayouts: number;
}

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                setLoading(true);
                const response = await fetch("/api/admin/stats");
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                } else {
                    console.error("Failed to fetch stats:", response.status, response.statusText);
                    // If unauthorized, clear stats data
                    if (response.status === 401) {
                        setStats(null);
                    }
                }
            } catch (error) {
                console.error("Error fetching stats:", error);
                setStats(null);
            } finally {
                setLoading(false);
            }
        }

        if (status === "authenticated") {
            fetchStats();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session]);

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-white/50">Loading...</p>
            </div>
        );
    }

    const salesData = stats?.salesData ?? Array(30).fill(0);
    const maxSales = Math.max(...salesData, 1); // Ensure at least 1 to avoid division by zero
    const revenueData = stats?.revenueData ?? Array(30).fill(0);
    const maxRevenue = Math.max(...revenueData, 1);
    const profitData = stats?.profitData ?? Array(30).fill(0);
    const maxProfit = Math.max(...profitData, 1);
    const conversionData = stats?.conversionData ?? Array(30).fill(0);
    const maxConversion = Math.max(...conversionData, 1); // Ensure at least 1 to avoid division by zero

    // Helper function to get date for a data point
    const getDateForIndex = (index: number, totalDays: number) => {
        const date = new Date();
        date.setDate(date.getDate() - (totalDays - 1 - index));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <TooltipProvider>
            <div className="p-5">
                <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <MetricCard title="Total Users" value={stats?.totalUsers ?? 0} loading={loading} />
                    <MetricCard title="Total Links" value={stats?.totalLinks ?? 0} loading={loading} />
                    <MetricCard title="Total Files" value={stats?.totalFiles ?? 0} loading={loading} />
                    <MetricCard title="Total Sales" value={stats?.totalSales ?? 0} loading={loading} />

                    <MetricCard title="Withdrawals (30d)" value={stats?.withdrawalsLast30Days ?? 0} loading={loading} />
                    <MetricCard title="Withdrawal Amount" value={stats?.totalWithdrawalAmount ? `$${stats.totalWithdrawalAmount.toFixed(2)}` : "$0.00"} loading={loading} />
                    <MetricCard title="Connect Accounts" value={stats?.usersWithConnectAccounts ?? 0} loading={loading} />
                    <MetricCard title="Verified Identity" value={stats?.usersWithVerifiedIdentity ?? 0} loading={loading} />

                    <div className="bg-white/5 border border-white/5 rounded-sm p-4 col-span-2">
                        <div className="flex flex-col mb-6">
                            <div className="flex flex-row justify-between">
                                <h2 className="text-md text-white/50 font-semibold mb-2">Sales</h2>
                                <p className="text-xs text-white/40">last 30 days</p>
                            </div>
                            <p className="text-3xl font-bold">
                                {loading ? (
                                    <span className="inline-block h-9 w-24 bg-white/10 animate-pulse rounded" />
                                ) : (
                                    (stats?.salesLast30Days ?? 0).toLocaleString()
                                )}
                            </p>
                        </div>

                        <div className="flex items-end justify-between gap-[3px] h-20 sm:h-24">
                            {loading ? (
                                Array(30).fill(0).map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 bg-white/10 animate-pulse rounded-t-[2px]"
                                        style={{ height: "20%" }}
                                    />
                                ))
                            ) : (
                                salesData.map((value, i) => {
                                    const date = getDateForIndex(i, 30);
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
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-sm p-4 col-span-2">
                        <div className="flex flex-col mb-6">
                            <div className="flex flex-row justify-between">
                                <h2 className="text-md text-white/50 font-semibold mb-2">Conversions</h2>
                                <p className="text-xs text-white/40">last 30 days</p>
                            </div>
                            <p className="text-3xl font-bold">
                                {loading ? (
                                    <span className="inline-block h-9 w-24 bg-white/10 animate-pulse rounded" />
                                ) : (
                                    `${(stats?.overallConversionRate ?? 0).toFixed(1)}%`
                                )}
                            </p>
                        </div>

                        <div className="flex items-end justify-between gap-[3px] h-20 sm:h-24">
                            {loading ? (
                                Array(30).fill(0).map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 bg-white/10 animate-pulse rounded-t-[2px]"
                                        style={{ height: "20%" }}
                                    />
                                ))
                            ) : (
                                conversionData.map((value, i) => {
                                    const date = getDateForIndex(i, 30);
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
                    </div>
                </div>

                {/* Revenue and Profit Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/5 border border-white/5 rounded-sm p-4">
                        <div className="flex flex-col mb-6">
                            <div className="flex flex-row justify-between">
                                <h2 className="text-md text-white/50 font-semibold mb-2">Revenue</h2>
                                <p className="text-xs text-white/40">last 30 days</p>
                            </div>
                            <p className="text-3xl font-bold">
                                {loading ? (
                                    <span className="inline-block h-9 w-24 bg-white/10 animate-pulse rounded" />
                                ) : (
                                    `$${(stats?.totalRevenue ?? 0).toFixed(2)}`
                                )}
                            </p>
                        </div>

                        <div className="flex items-end justify-between gap-[3px] h-32 sm:h-40">
                            {loading ? (
                                Array(30).fill(0).map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 bg-white/10 animate-pulse rounded-t-[2px]"
                                        style={{ height: "20%" }}
                                    />
                                ))
                            ) : (
                                revenueData.map((value, i) => {
                                    const date = getDateForIndex(i, 30);
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
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-sm p-4">
                        <div className="flex flex-col mb-6">
                            <div className="flex flex-row justify-between">
                                <h2 className="text-md text-white/50 font-semibold mb-2">Profit</h2>
                                <p className="text-xs text-white/40">last 30 days (platform fees)</p>
                            </div>
                            <p className="text-3xl font-bold">
                                {loading ? (
                                    <span className="inline-block h-9 w-24 bg-white/10 animate-pulse rounded" />
                                ) : (
                                    `$${(stats?.totalProfit ?? 0).toFixed(2)}`
                                )}
                            </p>
                        </div>

                        <div className="flex items-end justify-between gap-[3px] h-32 sm:h-40">
                            {loading ? (
                                Array(30).fill(0).map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 bg-white/10 animate-pulse rounded-t-[2px]"
                                        style={{ height: "20%" }}
                                    />
                                ))
                            ) : (
                                profitData.map((value, i) => {
                                    const date = getDateForIndex(i, 30);
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
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

