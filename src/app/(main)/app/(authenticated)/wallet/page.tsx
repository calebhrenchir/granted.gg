"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Wallet, ArrowUpRight, Calendar, Unlock, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import WalletConfigureModal from "@/components/modal/wallet-configure";
import NeedsOnboardingModal from "@/components/modal/needs-onboarding";
import WithdrawMethodModal from "@/components/modal/withdraw-method";
import CompleteRequirementsModal from "@/components/modal/complete-requirements";

interface ActivityData {
    id: string;
    linkId: string;
    linkUrl: string;
    linkName: string;
    type: "purchase" | "withdraw";
    amount: number | null;
    platformFee: number | null;
    createdAt: string;
}

export default function WalletPage() {
    const { data: session, status } = useSession();
    const [availableFunds, setAvailableFunds] = useState<number>(0);
    const [allActivities, setAllActivities] = useState<ActivityData[]>([]);
    const [sales, setSales] = useState<ActivityData[]>([]);
    const [withdraws, setWithdraws] = useState<ActivityData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showShimmer, setShowShimmer] = useState(false);
    const [showNeedsOnboardingModal, setShowNeedsOnboardingModal] = useState(false);
    
    const [view, setView] = useState<"all" | "sales" | "withdraws" | "stats">("all");

    const [walletConfigureOpen, setWalletConfigureOpen] = useState(false);
    const [withdrawMethodOpen, setWithdrawMethodOpen] = useState(false);
    const [completeRequirementsOpen, setCompleteRequirementsOpen] = useState(false);
    const [missingRequirements, setMissingRequirements] = useState<string[]>([]);

    useEffect(() => {
        if (status === "authenticated" || status === "unauthenticated") {
            fetchWalletData();
        }
    }, [status]);

    // Check requirements when wallet data is loaded
    useEffect(() => {
        const checkRequirements = async () => {
            if (status !== "authenticated" || isLoading) return;

            try {
                const response = await fetch("/api/wallet/check-requirements");
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.hasRequirements && data.missingRequirements.length > 0) {
                        setMissingRequirements(data.missingRequirements);
                        // Only show modal if there are handleable requirements
                        if (data.missingRequirements.length > 0) {
                            setCompleteRequirementsOpen(true);
                        }
                    }
                }
            } catch (err) {
                console.error("Error checking requirements:", err);
            }
        };

        if (!isLoading) {
            checkRequirements();
        }
    }, [status, isLoading]);

    // Check onboarding status from database
    useEffect(() => {
        const fetchOnboardingStatus = async () => {
            if (status !== "authenticated") return;
            
            try {
                const response = await fetch("/api/onboarding");
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        const isOnboardingComplete = data.data.isIdentityVerified || false;
                        if (!isOnboardingComplete) {
                            setShowNeedsOnboardingModal(true);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching onboarding status:", err);
            }
        };

        fetchOnboardingStatus();
    }, [status]);

    const fetchWalletData = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/wallet");

            if (!response.ok) {
                throw new Error("Failed to fetch wallet data");
            }

            const data = await response.json();
            if (data.success) {
                setAvailableFunds(data.availableFunds);
                setAllActivities(data.allActivities || []);
                setSales(data.recentSales || []);
                setWithdraws(data.withdraws || []);
                // Trigger shimmer effect once after data loads
                setShowShimmer(true);
                setTimeout(() => {
                    setShowShimmer(false);
                }, 2000); // Shimmer duration
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load wallet data");
            console.error("Error fetching wallet data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const calculateSellerEarnings = (baseAmount: number, platformFeePercent: number | null): number => {
        // Seller receives base price minus half of the platform fee
        const feePercent = platformFeePercent ?? 20;
        const sellerFeePercent = feePercent / 2;
        return baseAmount * (1 - sellerFeePercent / 100);
    };

    // Calculate stats from sales data
    const stats = useMemo(() => {
        const allTimeSales = sales.length;
        
        // Calculate all-time earnings (sum of seller earnings from all purchases)
        const allTimeEarnings = sales.reduce((sum, sale) => {
            if (sale.amount) {
                return sum + calculateSellerEarnings(sale.amount, sale.platformFee);
            }
            return sum;
        }, 0);

        // Get current month start
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Calculate sales this month
        const salesThisMonth = sales.filter(sale => {
            const saleDate = new Date(sale.createdAt);
            return saleDate >= currentMonthStart;
        });
        
        const salesThisMonthCount = salesThisMonth.length;
        const salesThisMonthEarnings = salesThisMonth.reduce((sum, sale) => {
            if (sale.amount) {
                return sum + calculateSellerEarnings(sale.amount, sale.platformFee);
            }
            return sum;
        }, 0);

        // Calculate average earnings per sale
        const averageEarningsPerSale = allTimeSales > 0 ? allTimeEarnings / allTimeSales : 0;

        return {
            allTimeEarnings,
            allTimeSales,
            salesThisMonthCount,
            salesThisMonthEarnings,
            averageEarningsPerSale,
        };
    }, [sales]);

    const formatTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return 'just now';
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
            return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
        }

        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) {
            return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
        }

        const diffInYears = Math.floor(diffInMonths / 12);
        return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
    };

    return (
        <div className="px-4 md:px-0 md:max-w-2xl mx-auto gap-8">
            {error && (
                <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}
            <div className="mb-8 w-full mx-auto">
                {isLoading ? (
                    <>
                        <div className="h-24 bg-white/10 rounded-lg animate-pulse mb-2 w-full max-w-md mx-auto"></div>
                        <div className="h-6 bg-white/10 rounded-lg animate-pulse w-48 mx-auto"></div>
                    </>
                ) : (
                    <>
                        <h1 className={`text-7xl font-bold text-white mb-2 text-center ${showShimmer ? 'shimmer-text' : ''}`}>
                            ${formatPrice(availableFunds)}
                        </h1>
                        <p className="text-white/70 text-center font-semibold text-xl">Available Funds</p>
                    </>
                )}
            </div>

            <button 
                onClick={async () => {
                    // Check onboarding status first
                    try {
                        const response = await fetch("/api/onboarding");
                        if (response.ok) {
                            const data = await response.json();
                            if (data.success && data.data) {
                                const isOnboardingComplete = data.data.isIdentityVerified || false;
                                if (!isOnboardingComplete) {
                                    setShowNeedsOnboardingModal(true);
                                    return;
                                }
                            }
                        }
                    } catch (err) {
                        console.error("Error fetching onboarding status:", err);
                        setShowNeedsOnboardingModal(true);
                        return;
                    }

                    // Open withdrawal method selection modal
                    setWithdrawMethodOpen(true);
                }}
                disabled={availableFunds === 0 || isWithdrawing} 
                className="px-6 w-full mx-auto py-3 text-center text-xl bg-[#30d158] disabled:bg-[#b8ecbe]/20 text-black font-semibold rounded-full hover:bg-[#30d158]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                Cash out
            </button>

            <WithdrawMethodModal
                open={withdrawMethodOpen}
                onOpenChange={setWithdrawMethodOpen}
                availableFunds={availableFunds}
                onConfirm={async (method) => {
                    // Proceed with withdrawal
                    try {
                        setIsWithdrawing(true);
                        setError(null);
                        setWithdrawMethodOpen(false);

                        const response = await fetch("/api/wallet/withdraw", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ payoutMethod: method }),
                        });

                        const data = await response.json();

                        if (!response.ok) {
                            // If wallet is not configured, open the configure modal
                            if (data.error?.includes("configure your wallet")) {
                                setWalletConfigureOpen(true);
                                return;
                            }
                            
                            // If requirements are missing, show the complete requirements modal
                            if (data.needsOnboarding && data.requirements && data.requirements.length > 0) {
                                const handleableRequirements = data.requirements.filter((req: string) => {
                                    return req.includes('business_profile.mcc') ||
                                           req.includes('business_profile.url') ||
                                           req.includes('individual.ssn_last_4') ||
                                           req.includes('tos_acceptance');
                                });
                                
                                if (handleableRequirements.length > 0) {
                                    setMissingRequirements(handleableRequirements);
                                    setCompleteRequirementsOpen(true);
                                    return;
                                }
                            }
                            
                            throw new Error(data.error || "Failed to process withdrawal");
                        }

                        // Refresh wallet data after successful withdrawal
                        await fetchWalletData();
                    } catch (err) {
                        console.error("Error processing withdrawal:", err);
                        setError(err instanceof Error ? err.message : "Failed to process withdrawal");
                    } finally {
                        setIsWithdrawing(false);
                    }
                }}
                isProcessing={isWithdrawing}
            />

            <Separator className="my-8 bg-white/5 py-0.5" />

            <div className="flex flex-row gap-4 mb-4">
                <button className={cn(
                    "transition-colors duration-300 font-semibold text-lg",
                    view === "all" ? "text-white" : "text-white/50 hover:text-white"
                )} onClick={() => setView("all")}>
                    All activity
                </button>
                <button className={cn(
                    "transition-colors duration-300 font-semibold text-lg",
                    view === "sales" ? "text-white" : "text-white/50 hover:text-white"
                )} onClick={() => setView("sales")}>
                    Sales
                </button>
                <button className={cn(
                    "transition-colors duration-300 font-semibold text-lg",
                    view === "withdraws" ? "text-white" : "text-white/50 hover:text-white"
                )} onClick={() => setView("withdraws")}>
                    Withdraws
                </button>
                <button className={cn(
                    "transition-colors duration-300 font-semibold text-lg",
                    view === "stats" ? "text-white" : "text-white/50 hover:text-white"
                )} onClick={() => setView("stats")}>
                    Stats
                </button>
            </div>

            {view === "all" ? (
                <div className="flex flex-col gap-4">
                    {isLoading ? (
                        <div className="flex flex-col gap-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="w-full flex flex-row justify-between items-center mb-4 animate-pulse">
                                    <div className="flex flex-row gap-3">
                                        <div className="rounded-lg p-3 bg-neutral-800 w-11 h-11"></div>
                                        <div className="flex flex-col justify-center gap-2">
                                            <div className="h-4 bg-neutral-800 rounded w-32"></div>
                                            <div className="h-3 bg-neutral-800 rounded w-20"></div>
                                        </div>
                                    </div>
                                    <div className="h-5 bg-neutral-800 rounded w-16"></div>
                                </div>
                            ))}
                        </div>
                    ) : allActivities.length === 0 ? (
                        <div className="w-full flex justify-center py-8">
                            <p className="text-white/50 text-sm">No activities yet</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full w-full">
                            <div className="flex flex-col gap-4">
                                {allActivities.map((activity) => (
                                    <div key={activity.id} className="w-full flex flex-row justify-between items-center">
                                        <div className="flex flex-row gap-3">
                                            <div className="rounded-lg p-3 bg-neutral-800">
                                                {activity.type === "purchase" ? (
                                                    <Unlock className="w-5 h-5 text-white" />
                                                ) : (
                                                    <ArrowDownRight className="w-5 h-5 text-white" />
                                                )}
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <h2 className="font-semibold text-white text-md">
                                                    {activity.type === "purchase" 
                                                        ? `New Purchase - ${activity.linkName}` 
                                                        : "Withdrawal"}
                                                </h2>
                                                <p className="text-white/50 text-sm">{formatTimeAgo(activity.createdAt)}</p>
                                            </div>
                                        </div>
                                        {activity.type === "purchase" && activity.amount && (
                                            <h2 className="text-green-400 font-semibold text-lg">
                                                + ${formatPrice(calculateSellerEarnings(activity.amount, activity.platformFee))}
                                            </h2>
                                        )}
                                        {activity.type === "withdraw" && activity.amount && (
                                            <h2 className="text-red-400 font-semibold text-lg">- ${formatPrice(activity.amount)}</h2>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            ) : view === "sales" ? (
                <div className="flex flex-col gap-4">
                    {isLoading ? (
                        <div className="flex flex-col gap-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="w-full flex flex-row justify-between items-center mb-4 animate-pulse">
                                    <div className="flex flex-row gap-3">
                                        <div className="rounded-lg p-3 bg-neutral-800 w-11 h-11"></div>
                                        <div className="flex flex-col justify-center gap-2">
                                            <div className="h-4 bg-neutral-800 rounded w-32"></div>
                                            <div className="h-3 bg-neutral-800 rounded w-20"></div>
                                        </div>
                                    </div>
                                    <div className="h-5 bg-neutral-800 rounded w-16"></div>
                                </div>
                            ))}
                        </div>
                    ) : sales.length === 0 ? (
                        <div className="w-full flex justify-center py-8">
                            <p className="text-white/50 text-sm">No sales yet</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full w-full">
                            <div className="flex flex-col gap-4">
                                {sales.map((activity) => (
                                    <div key={activity.id} className="w-full flex flex-row justify-between items-center">
                                        <div className="flex flex-row gap-3">
                                            <div className="rounded-lg p-3 bg-neutral-800">
                                                <Unlock className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <h2 className="font-semibold text-white text-md">
                                                    New Purchase - {activity.linkName}
                                                </h2>
                                                <p className="text-white/50 text-sm">{formatTimeAgo(activity.createdAt)}</p>
                                            </div>
                                        </div>
                                        {activity.amount && (
                                            <h2 className="text-green-400 font-semibold text-lg">
                                                + ${formatPrice(calculateSellerEarnings(activity.amount, activity.platformFee))}
                                            </h2>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            ) : view === "withdraws" ? (
                <div className="flex flex-col gap-4">
                    {isLoading ? (
                        <div className="flex flex-col gap-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="w-full flex flex-row justify-between items-center mb-4 animate-pulse">
                                    <div className="flex flex-row gap-3">
                                        <div className="rounded-lg p-3 bg-neutral-800 w-11 h-11"></div>
                                        <div className="flex flex-col justify-center gap-2">
                                            <div className="h-4 bg-neutral-800 rounded w-32"></div>
                                            <div className="h-3 bg-neutral-800 rounded w-20"></div>
                                        </div>
                                    </div>
                                    <div className="h-5 bg-neutral-800 rounded w-16"></div>
                                </div>
                            ))}
                        </div>
                    ) : withdraws.length === 0 ? (
                        <div className="w-full flex justify-center py-8">
                            <p className="text-white/50 text-sm">No withdrawals yet</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full w-full">
                            <div className="flex flex-col gap-4">
                                {withdraws.map((activity) => (
                                    <div key={activity.id} className="w-full flex flex-row justify-between items-center">
                                        <div className="flex flex-row gap-3">
                                            <div className="rounded-lg p-3 bg-neutral-800">
                                                <ArrowDownRight className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <h2 className="font-semibold text-white text-md">
                                                    Withdrawal
                                                </h2>
                                                <p className="text-white/50 text-sm">{formatTimeAgo(activity.createdAt)}</p>
                                            </div>
                                        </div>
                                        {activity.amount && (
                                            <h2 className="text-red-400 font-semibold text-lg">- ${formatPrice(activity.amount)}</h2>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            ) : view === "stats" ? (
                <div className="flex flex-col gap-4">
                    <div>
                        <p className="text-white/50 text-sm mb-1">All-Time Earnings</p>
                        <p className="text-white font-semibold">${formatPrice(stats.allTimeEarnings)}</p>
                    </div>
                    <div>
                        <p className="text-white/50 text-sm mb-1">All-Time Sales</p>
                        <p className="text-white font-semibold">{stats.allTimeSales}</p>
                    </div>
                    <div>
                        <p className="text-white/50 text-sm mb-1">Sales This Month</p>
                        <p className="text-white font-semibold">{stats.salesThisMonthCount} (${formatPrice(stats.salesThisMonthEarnings)})</p>
                    </div>
                    <div>
                        <p className="text-white/50 text-sm mb-1">Average Earnings Per Sale</p>
                        <p className="text-white font-semibold">${formatPrice(stats.averageEarningsPerSale)}</p>
                    </div>
                </div>
            ) : null}

            <WalletConfigureModal open={walletConfigureOpen} onOpenChange={setWalletConfigureOpen} />
            <NeedsOnboardingModal open={showNeedsOnboardingModal} onOpenChange={setShowNeedsOnboardingModal} />
            <CompleteRequirementsModal
                open={completeRequirementsOpen}
                onOpenChange={setCompleteRequirementsOpen}
                missingRequirements={missingRequirements}
                onComplete={async () => {
                    // Refresh wallet data after completing requirements
                    await fetchWalletData();
                }}
            />
        </div>
    );
}
