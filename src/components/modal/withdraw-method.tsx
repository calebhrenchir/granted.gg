"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Loader2, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface WithdrawMethodModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableFunds: number;
    onConfirm: (method: "instant" | "standard") => void;
    isProcessing?: boolean;
}

export default function WithdrawMethodModal({
    open,
    onOpenChange,
    availableFunds,
    onConfirm,
    isProcessing = false,
}: WithdrawMethodModalProps) {
    const [selectedMethod, setSelectedMethod] = useState<"instant" | "standard">("standard");

    // Calculate instant payout fee (1% with $0.50 minimum)
    const instantFee = Math.max(availableFunds * 0.01, 0.50);
    const instantAmount = availableFunds - instantFee;

    const formatPrice = (price: number) => {
        return price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800">
                <DialogHeader>
                    <DialogTitle className="text-white text-xl font-semibold">
                        Choose Withdrawal Method
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 mt-4">
                    <div className="text-white/70 text-sm">
                        Available to withdraw: <span className="text-white font-semibold">${formatPrice(availableFunds)}</span>
                    </div>

                    {/* Standard Payout Option */}
                    <button
                        onClick={() => setSelectedMethod("standard")}
                        className={cn(
                            "w-full p-4 rounded-lg border-2 transition-all text-left",
                            selectedMethod === "standard"
                                ? "border-white/50 bg-white/5"
                                : "border-white/10 bg-white/5 hover:border-white/20"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0",
                                selectedMethod === "standard"
                                    ? "border-white bg-white"
                                    : "border-white/40"
                            )}>
                                {selectedMethod === "standard" && (
                                    <div className="h-2.5 w-2.5 rounded-full bg-black" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock className="h-4 w-4 text-white/70" />
                                    <h3 className="text-white font-semibold">Standard</h3>
                                </div>
                                <p className="text-white/50 text-sm mb-2">
                                    Free • 1-3 business days
                                </p>
                                <p className="text-white font-semibold text-lg">
                                    ${formatPrice(availableFunds)}
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* Instant Payout Option */}
                    <button
                        onClick={() => setSelectedMethod("instant")}
                        className={cn(
                            "w-full p-4 rounded-lg border-2 transition-all text-left",
                            selectedMethod === "instant"
                                ? "border-white/50 bg-white/5"
                                : "border-white/10 bg-white/5 hover:border-white/20"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0",
                                selectedMethod === "instant"
                                    ? "border-white bg-white"
                                    : "border-white/40"
                            )}>
                                {selectedMethod === "instant" && (
                                    <div className="h-2.5 w-2.5 rounded-full bg-black" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Zap className="h-4 w-4 text-yellow-400" />
                                    <h3 className="text-white font-semibold">Instant</h3>
                                </div>
                                <p className="text-white/50 text-sm mb-2">
                                    1% fee (min $0.50) • Available in minutes
                                </p>
                                <div className="flex flex-col gap-1">
                                    <p className="text-white/70 text-xs">
                                        Fee: <span className="text-white">${formatPrice(instantFee)}</span>
                                    </p>
                                    <p className="text-white font-semibold text-lg">
                                        ${formatPrice(instantAmount)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </button>

                    <div className="flex gap-3 mt-2">
                        <button
                            onClick={() => onOpenChange(false)}
                            disabled={isProcessing}
                            className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(selectedMethod)}
                            disabled={isProcessing}
                            className="flex-1 py-3 px-4 bg-[#30d158] hover:bg-[#30d158]/90 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                "Confirm Withdrawal"
                            )}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

