"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { QRCode } from "react-qrcode-logo";

export default function NeedsOnboardingModal({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <div 
        onClick={() => onOpenChange(false)}
        className={cn(
            "fixed inset-0 z-[60] h-screen w-screen bg-black/50 backdrop-blur-sm flex flex-col gap-4 items-center justify-center transition-opacity duration-200",
            open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}>
            <div className="flex flex-col items-center max-w-lg mx-auto gap-2">
                <h2 className="text-3xl font-semibold text-white text-center">Complete Your Account to Create Links and Cash Out</h2>
                <p className="text-white/70 max-w-md text-center">Confirm that you are 18+ and eligble to sell and collect your earnings.</p>

                <Link href="/onboarding" className="w-full bg-white font-semibold text-lg text-black rounded-full py-4 px-4 text-center mt-4">Complete Onboarding</Link>
            </div>
        </div>
    )
}