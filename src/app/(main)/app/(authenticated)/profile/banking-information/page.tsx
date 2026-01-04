"use client";

import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BankInfo {
    hasBankAccount: boolean;
    bankName: string | null;
    accountType: string | null;
    last4: string | null;
}

function capitalizeWords(str: string | null | undefined): string {
    if (!str) return "";
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export default function BankingInformationPage() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"current" | "update">("current");
    
    // Form state
    const [routingNumber, setRoutingNumber] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountType, setAccountType] = useState("select");

    useEffect(() => {
        const fetchBankInfo = async () => {
            if (status !== "authenticated") return;

            try {
                setLoading(true);
                setError(null);
                const response = await fetch("/api/wallet/bank-info");
                
                if (!response.ok) {
                    throw new Error("Failed to fetch bank information");
                }

                const result = await response.json();
                if (result.success) {
                    setBankInfo(result);
                } else {
                    throw new Error("Invalid response format");
                }
            } catch (err) {
                console.error("Error fetching bank information:", err);
                setError(err instanceof Error ? err.message : "Failed to load bank information");
            } finally {
                setLoading(false);
            }
        };

        fetchBankInfo();
    }, [status]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        if (!routingNumber || !accountNumber || accountType === "select") {
            setError("All fields are required");
            setSaving(false);
            return;
        }

        try {
            const response = await fetch("/api/wallet/configure", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    routingNumber,
                    accountNumber,
                    accountType,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update bank information");
            }

            if (data.success) {
                // Reset form
                setRoutingNumber("");
                setAccountNumber("");
                setAccountType("select");
                // Refresh bank info
                const bankInfoResponse = await fetch("/api/wallet/bank-info");
                if (bankInfoResponse.ok) {
                    const bankInfoData = await bankInfoResponse.json();
                    if (bankInfoData.success) {
                        setBankInfo(bankInfoData);
                        // Switch to current tab after successful update
                        setActiveTab("current");
                    }
                }
            }
        } catch (err) {
            console.error("Error updating bank information:", err);
            setError(err instanceof Error ? err.message : "Failed to update bank information");
        } finally {
            setSaving(false);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="px-4 md:px-0 md:max-w-2xl mx-auto">
                <div className="flex flex-col gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="w-full py-4 px-4 bg-neutral-800 rounded-xl animate-pulse"
                        >
                            <div className="h-10"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error && !bankInfo) {
        return (
            <div className="px-4 md:px-0 md:max-w-2xl mx-auto">
                <div className="flex flex-col gap-4 items-center justify-center py-12">
                    <p className="text-red-400 text-center">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-0 md:max-w-2xl mx-auto">
            <div className="flex flex-col gap-4">
                <div className="flex flex-row gap-4 mb-2">
                    <button 
                        className={cn(
                            "transition-colors duration-300 font-semibold text-lg",
                            activeTab === "current" ? "text-white" : "text-white/50 hover:text-white"
                        )} 
                        onClick={() => setActiveTab("current")}
                    >
                        Current
                    </button>
                    <button 
                        className={cn(
                            "transition-colors duration-300 font-semibold text-lg",
                            activeTab === "update" ? "text-white" : "text-white/50 hover:text-white"
                        )} 
                        onClick={() => setActiveTab("update")}
                    >
                        Update
                    </button>
                </div>

                {error && (
                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {activeTab === "current" ? (
                    <div className="flex flex-col gap-4">
                        {bankInfo?.hasBankAccount ? (
                            <>
                                <div className="flex flex-col w-full">
                                    <label className="text-sm font-medium text-white/70 mb-2" htmlFor="currentBankName">Bank Name</label>
                                    <Input
                                        id="currentBankName"
                                        value={bankInfo.bankName ? capitalizeWords(bankInfo.bankName) : "Not set"}
                                        className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                        disabled
                                        placeholder="Not set"
                                    />
                                </div>

                                <div className="flex flex-col w-full">
                                    <label className="text-sm font-medium text-white/70 mb-2" htmlFor="currentAccountNumber">Account Number</label>
                                    <Input
                                        id="currentAccountNumber"
                                        value={bankInfo.last4 ? `••••${bankInfo.last4}` : "Not set"}
                                        className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                        disabled
                                        placeholder="Not set"
                                    />
                                </div>

                                <div className="flex flex-col w-full">
                                    <label className="text-sm font-medium text-white/70 mb-2" htmlFor="currentAccountType">Account Type</label>
                                    <Input
                                        id="currentAccountType"
                                        value={bankInfo.accountType 
                                            ? (bankInfo.accountType === "company" ? "Business Account" : "Individual Account")
                                            : "Not set"}
                                        className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                        disabled
                                        placeholder="Not set"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col w-full">
                                <p className="text-white/50 text-sm">No bank account configured. Use the Update tab to add one.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-row gap-4">
                            <div className="flex flex-col w-full">
                                <label className="text-sm font-medium text-white/70 mb-2" htmlFor="routingNumber">
                                    Routing Number
                                </label>
                                <Input
                                    id="routingNumber"
                                    type="text"
                                    value={routingNumber}
                                    onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, ""))}
                                    placeholder="Enter routing number"
                                    maxLength={9}
                                    required
                                    className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                />
                            </div>
                            <div className="flex flex-col w-full">
                                <label className="text-sm font-medium text-white/70 mb-2" htmlFor="accountNumber">
                                    Account Number
                                </label>
                                <Input
                                    id="accountNumber"
                                    type="text"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                                    placeholder="Enter account number"
                                    required
                                    className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col w-full">
                            <label htmlFor="accountType" className="block text-sm text-white/70 font-medium mb-2">
                                Account Type
                            </label>
                            <NativeSelect 
                                id="accountType"
                                value={accountType}
                                onChange={(e) => setAccountType(e.target.value)}
                                className="!w-full !px-4 !py-4 !h-auto bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/40 transition-all"
                            >
                                <NativeSelectOption value="select">Select account type</NativeSelectOption>
                                <NativeSelectOption value="individual">Individual Account</NativeSelectOption>
                                <NativeSelectOption value="business">Business Account</NativeSelectOption>
                            </NativeSelect>
                        </div>

                        <button
                            type="submit"
                            disabled={saving || accountType === "select" || !routingNumber || !accountNumber}
                            className="w-full px-4 py-3 bg-[#30d158] text-black rounded-lg hover:bg-[#30d158]/90 transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                bankInfo?.hasBankAccount ? "Update Account" : "Add Account"
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
