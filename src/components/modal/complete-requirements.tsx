"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompleteRequirementsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    missingRequirements: string[];
    onComplete: () => void;
}

export default function CompleteRequirementsModal({
    open,
    onOpenChange,
    missingRequirements,
    onComplete,
}: CompleteRequirementsModalProps) {
    const [ssnLast4, setSsnLast4] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Only SSN requires user input - MCC, URL, and TOS are handled automatically
    const needsSsn = missingRequirements.some(req => req.includes('individual.ssn_last_4'));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch("/api/wallet/complete-requirements", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ssnLast4: needsSsn ? ssnLast4 : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to complete requirements");
            }

            onComplete();
            onOpenChange(false);
            
            // Reset form
            setSsnLast4("");
        } catch (err) {
            console.error("Error completing requirements:", err);
            setError(err instanceof Error ? err.message : "Failed to complete requirements");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800">
                <DialogHeader>
                    <DialogTitle className="text-white text-xl font-semibold">
                        Complete Wallet Setup
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                    {error && (
                        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                        <p className="text-blue-400 text-sm">
                            We handle all payment processing on your behalf. The information below is required by our payment processor for tax and compliance purposes.
                        </p>
                    </div>

                    {needsSsn && (
                        <div>
                            <label htmlFor="ssnLast4" className="block text-sm font-medium mb-2 text-white">
                                SSN Last 4 Digits *
                            </label>
                            <input
                                type="text"
                                id="ssnLast4"
                                value={ssnLast4}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                                    setSsnLast4(value);
                                }}
                                required={needsSsn}
                                placeholder="1234"
                                maxLength={4}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30 text-center text-2xl tracking-widest"
                            />
                            <p className="text-white/50 text-xs mt-1">
                                Last 4 digits of your Social Security Number
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 mt-2">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                            className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (needsSsn && ssnLast4.length !== 4)}
                            className="flex-1 py-3 px-4 bg-[#30d158] hover:bg-[#30d158]/90 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit"
                            )}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

