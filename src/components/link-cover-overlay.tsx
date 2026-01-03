import { Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkCoverOverlayProps {
    isUnlocked?: boolean;
    price?: string;
    showBranding?: boolean;
    variant?: "default" | "compact";
    className?: string;
}

export function LinkCoverOverlay({ 
    isUnlocked = false, 
    price, 
    showBranding = true,
    variant = "default",
    className
}: LinkCoverOverlayProps) {
    const isCompact = variant === "compact";
    
    return (
        <div className={cn(
            "absolute inset-0 flex flex-col justify-between items-center pointer-events-none z-1",
            isCompact ? "p-2" : "p-8",
            className
        )}>
            {isUnlocked ? (
                <Unlock className={cn(
                    "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
                    isCompact ? "w-7 h-9" : "w-8 h-10"
                )} />
            ) : (
                <Lock className={cn(
                    "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
                    isCompact ? "w-7 h-9" : "w-8 h-10"
                )} />
            )}
            <div className={cn(
                "flex flex-col text-center",
                isCompact ? "gap-0.5" : "gap-1"
            )}>
                <p className={cn(
                    "text-white font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
                    isCompact ? "text-md" : "text-lg"
                )}>
                    {isUnlocked ? "Unlocked!" : "Unlock for"}
                </p>
                {!isUnlocked && price && (
                    <p className={cn(
                        "text-white text-center font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
                        isCompact ? "text-5xl" : "text-5xl"
                    )}>
                        {(() => {
                            // Extract numeric value from price string (e.g., "$100.00" -> 100.00)
                            const numericValue = parseFloat(price.replace(/[^0-9.]/g, ''));
                            if (isNaN(numericValue)) return price;
                            // Format with commas and 2 decimal places
                            return `$${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        })()}
                    </p>
                )}
            </div>
            {showBranding && (
                <p className={cn(
                    "text-white/20 text-center font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
                    isCompact ? "text-sm" : "text-sm"
                )}>
                    granted.gg
                </p>
            )}
        </div>
    );
}

