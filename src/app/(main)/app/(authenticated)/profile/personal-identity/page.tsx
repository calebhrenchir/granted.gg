"use client";

import { Input } from "@/components/ui/input";
import { MaskInput } from "@/components/ui/mask-input";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalIdentityData {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isIdentityVerified: boolean;
}

export default function PersonalIdentityPage() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PersonalIdentityData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"identity" | "address">("identity");

    useEffect(() => {
        const fetchData = async () => {
            if (status !== "authenticated") return;

            try {
                setLoading(true);
                const response = await fetch("/api/onboarding");
                
                if (!response.ok) {
                    throw new Error("Failed to fetch personal identity data");
                }

                const result = await response.json();
                if (result.success && result.data) {
                    setData(result.data);
                } else {
                    throw new Error("Invalid response format");
                }
            } catch (err) {
                console.error("Error fetching personal identity data:", err);
                setError(err instanceof Error ? err.message : "Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [status]);

    // Format date of birth from YYYY-MM-DD to MM/DD/YYYY
    const formatDateOfBirth = (dateString: string): string => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    if (status === "loading" || loading) {
        return (
            <div className="px-4 md:px-0 md:max-w-2xl mx-auto">
                <div className="flex flex-col gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
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

    if (error) {
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
                            activeTab === "identity" ? "text-white" : "text-white/50 hover:text-white"
                        )} 
                        onClick={() => setActiveTab("identity")}
                    >
                        Identity
                    </button>
                    <button 
                        className={cn(
                            "transition-colors duration-300 font-semibold text-lg",
                            activeTab === "address" ? "text-white" : "text-white/50 hover:text-white"
                        )} 
                        onClick={() => setActiveTab("address")}
                    >
                        Address
                    </button>
                </div>

                {activeTab === "identity" ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-row gap-4">
                            <div className="flex flex-col w-full">
                                <label className="text-sm font-medium text-white/70 mb-2" htmlFor="firstName">First Name</label>
                                <Input
                                    id="firstName"
                                    value={data?.firstName || ""}
                                    className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                    disabled
                                    placeholder="Not set"
                                />
                            </div>
                            <div className="flex flex-col w-full">
                                <label className="text-sm font-medium text-white/70 mb-2" htmlFor="lastName">Last Name</label>
                                <Input
                                    id="lastName"
                                    value={data?.lastName || ""}
                                    className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                    disabled
                                    placeholder="Not set"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col w-full">
                            <label className="text-sm font-medium text-white/70 mb-2" htmlFor="dateOfBirth">Date of Birth</label>
                            <Input
                                id="dateOfBirth"
                                value={data?.dateOfBirth ? formatDateOfBirth(data.dateOfBirth) : ""}
                                className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                disabled
                                placeholder="Not set"
                            />
                        </div>

                        <div className="flex flex-col w-full">
                            <label className="text-sm font-medium text-white/70 mb-2" htmlFor="emailAddress">Email Address</label>
                            <Input
                                id="emailAddress"
                                value={session?.user?.email || ""}
                                className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                disabled
                                placeholder="Not set"
                            />
                            <span className="text-sm text-white/50 mt-2">To update your email visit the <Link className="text-white/70 hover:text-white transition-all duration-300 ease-in-out font-semibold" href="/profile/login-method">login method</Link> page.</span>
                        </div>

                        <div className="flex flex-col w-full">
                            <label className="text-sm font-medium text-white/70 mb-2" htmlFor="phone">Phone Number</label>
                            <MaskInput
                                mask="phone"
                                value={data?.phoneNumber || ""}
                                className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                disabled
                                placeholder="Not set"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col w-full">
                            <label className="text-sm font-medium text-white/70 mb-2" htmlFor="addressLine1">Address Line 1</label>
                            <Input
                                id="addressLine1"
                                value={data?.addressLine1 || ""}
                                className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                disabled
                                placeholder="Not set"
                            />
                        </div>

                        <div className="flex flex-col w-full">
                            <label className="text-sm font-medium text-white/70 mb-2" htmlFor="addressLine2">Address Line 2</label>
                            <Input
                                id="addressLine2"
                                value={data?.addressLine2 || ""}
                                className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                disabled
                                placeholder="Not set (optional)"
                            />
                        </div>

                        <div className="flex flex-row gap-4">
                            <div className="flex flex-col w-full">
                                <label className="text-sm font-medium text-white/70 mb-2" htmlFor="city">City</label>
                                <Input
                                    id="city"
                                    value={data?.city || ""}
                                    className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                    disabled
                                    placeholder="Not set"
                                />
                            </div>
                            <div className="flex flex-col w-full">
                                <label className="text-sm font-medium text-white/70 mb-2" htmlFor="state">State</label>
                                <Input
                                    id="state"
                                    value={data?.state || ""}
                                    className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                    disabled
                                    placeholder="Not set"
                                />
                            </div>
                        </div>

                        <div className="flex flex-row gap-4">
                            <div className="flex flex-col w-full">
                                <label className="text-sm font-medium text-white/70 mb-2" htmlFor="postalCode">Postal Code</label>
                                <Input
                                    id="postalCode"
                                    value={data?.postalCode || ""}
                                    className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                    disabled
                                    placeholder="Not set"
                                />
                            </div>
                            <div className="flex flex-col w-full">
                                <label className="text-sm font-medium text-white/70 mb-2" htmlFor="country">Country</label>
                                <Input
                                    id="country"
                                    value={data?.country || ""}
                                    className="w-full px-4 py-6 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                    disabled
                                    placeholder="Not set"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-2">
                    <p className="text-sm text-white/50">
                        To update any of this information, please contact support.
                    </p>
                </div>
            </div>
        </div>
    )
}