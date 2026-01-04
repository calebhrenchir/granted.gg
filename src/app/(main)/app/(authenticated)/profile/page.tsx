"use client";
import { cn } from "@/lib/utils";
import { Bell, ChevronRight, DollarSign, HandCoins, IdCard, Mail, MessageCircle, PiggyBank } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

function ProfileLink({ href, children, disabled }: { href: string, children: React.ReactNode, disabled?: boolean }) {
    return (
        <Link href={!disabled ? href : "#"} className={cn("w-full py-4 px-4 flex flex-row justify-between bg-neutral-800 hover:opacity-80 rounded-xl transition-all duration-300 ease-in-out group", disabled && "opacity-50 cursor-not-allowed")}>
            {children}
        </Link>
    )
}

function capitalizeWords(str: string | null | undefined): string {
    if (!str) return "Not set";
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const [userData, setUserData] = useState<{ firstName?: string; lastName?: string; email: string; bankName?: string | null } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            if (status !== "authenticated") return;

            try {
                setIsLoading(true);
                const [onboardingResponse, walletResponse] = await Promise.all([
                    fetch("/api/onboarding"),
                    fetch("/api/wallet")
                ]);

                if (onboardingResponse.ok) {
                    const data = await onboardingResponse.json();
                    if (data.success && data.data) {
                        setUserData(prev => ({
                            ...prev,
                            firstName: data.data.firstName,
                            lastName: data.data.lastName,
                            email: session?.user?.email || "",
                        }));
                    }
                }

                if (walletResponse.ok) {
                    const walletData = await walletResponse.json();
                    if (walletData.success) {
                        setUserData(prev => ({
                            firstName: prev?.firstName,
                            lastName: prev?.lastName,
                            email: prev?.email || session?.user?.email || "",
                            bankName: walletData.bankName || null,
                        }));
                    }
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [status, session?.user?.email]);

    return (
        <div className="px-4 md:px-0 md:max-w-2xl mx-auto">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 mt-2">
                    <h2 className="font-semibold text-white/50 text-lg">Make more money</h2>

                    <ProfileLink href="/profile/refer-and-earn" disabled>
                        <div className="flex flex-row gap-4 items-center">
                            <HandCoins className="h-5 w-5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                            <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Refer & Earn</p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            <p className="text-black font-semibold text-sm px-2.5 bg-white rounded-full">Soon</p>
                            <ChevronRight className="h-4.5 w-4.5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                        </div>
                    </ProfileLink>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                    <h2 className="font-semibold text-white/50 text-lg">Account Information</h2>

                    <ProfileLink href="/profile/login-method">
                        <div className="flex flex-row gap-4 items-center">
                            <Mail className="h-5 w-5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                            <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Login Method</p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            {isLoading ? (
                                <div className="h-5 w-24 bg-white/10 rounded animate-pulse"></div>
                            ) : (
                                <p className="text-white font-semibold text-md">{userData?.email || "Not set"}</p>
                            )}
                            <ChevronRight className="h-4.5 w-4.5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                        </div>
                    </ProfileLink>

                    <ProfileLink href="/profile/personal-identity">
                        <div className="flex flex-row gap-4 items-center">
                            <IdCard className="h-5 w-5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                            <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Personal Identity</p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            {isLoading ? (
                                <div className="h-5 w-32 bg-white/10 rounded animate-pulse"></div>
                            ) : (
                                <p className="text-white font-semibold text-md">
                                    {userData?.firstName && userData?.lastName 
                                        ? `${userData.firstName} ${userData.lastName}` 
                                        : "Not set"}
                                </p>
                            )}
                            <ChevronRight className="h-4.5 w-4.5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                        </div>
                    </ProfileLink>

                    <ProfileLink href="/profile/banking-information">
                        <div className="flex flex-row gap-4 items-center">
                            <PiggyBank className="h-5 w-5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                            <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Banking Information</p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            {isLoading ? (
                                <div className="h-5 w-28 bg-white/10 rounded animate-pulse"></div>
                            ) : (
                                <p className="text-white font-semibold text-md">{capitalizeWords(userData?.bankName)}</p>
                            )}
                            <ChevronRight className="h-4.5 w-4.5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                        </div>
                    </ProfileLink>

                    <ProfileLink href="/profile/notifications">
                        <div className="flex flex-row gap-4 items-center">
                            <Bell className="h-5 w-5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                            <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Notifications</p>
                        </div>
                        <ChevronRight className="h-4.5 w-4.5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                    </ProfileLink>
                </div>

                <div className="flex flex-col gap-4 mt-2 w-full">
                    <div className="flex flex-row justify-between items-center">
                        <div className="h-[1.5px] w-1/3 bg-white/30 rounded-full"></div>
                        <span className="text-white/50 text-lg font-semibold whitespace-nowrap px-4">Make granted.gg Better</span>
                        <div className="h-[1.5px] w-1/3 bg-white/30 rounded-full"></div>
                    </div>

                    <ProfileLink href="mailto:support@granted.gg">
                        <div className="flex flex-row gap-4 items-center">
                            <Mail className="h-5 w-5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                            <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Contact Support</p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            <p className="text-white font-semibold text-md">support@granted.gg</p>
                            <ChevronRight className="h-4.5 w-4.5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                        </div>
                    </ProfileLink>

                    <ProfileLink href="/profile/feedback" disabled>
                        <div className="flex flex-row gap-4 items-center">
                            <MessageCircle className="h-5 w-5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                            <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Send Feedback</p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            <p className="text-black font-semibold text-sm px-2.5 bg-white rounded-full">Soon</p>
                            <ChevronRight className="h-4.5 w-4.5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                        </div>
                    </ProfileLink>
                </div>
            </div>
        </div>
    )
}