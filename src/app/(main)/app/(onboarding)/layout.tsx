"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isOnboarding = pathname?.includes("/onboarding");
    
    // Get current step from children (will be passed as prop)
    // For now, we'll use a default progress
    const currentStep = 1; // This will be managed by the page component

    return (
        <>
            <header className="sticky inset-x-0 top-0 z-5 flex items-center justify-between md:justify-center py-10 px-4 md:px-0 md:max-w-7xl mx-auto">
                <div className="overflow-hidden pointer-events-none absolute inset-x-0 top-0 z-0 h-full w-full">
                    <div className="absolute blur-sm from-black via-black via-80% to-transparent left-[50%] top-[-20px] h-full w-[180%] -translate-x-1/2 bg-linear-to-b"></div>
                </div>

                <div className="flex w-full flex-col md:flex-row items-center justify-between gap-4 md:gap-0 mb-4">
                    <div className="relative z-1 flex items-center">
                        <Link href="/" target="_blank" className={cn("transition-opacity duration-300 hover:opacity-80")}>
                            <span className="text-white font-semibold text-3xl">
                            granted.gg
                            </span>
                        </Link>
                    </div>
                    
                    {isOnboarding && (
                        <div className="w-full max-w-lg md:flex-1 md:max-w-2xl relative z-1 md:absolute md:left-1/2 md:-translate-x-1/2 mt-4 md:mt-0">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white/70 text-sm">Step 1: Personal Info</span>
                                <span className="text-white/70 text-sm">Step 2: Address</span>
                                <span className="text-white/70 text-sm">Step 3: Verification</span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-white transition-all duration-500 ease-out"
                                    style={{ width: '33.33%' }}
                                    id="onboarding-progress"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {children}
        </>
    );
}