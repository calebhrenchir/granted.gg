"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { X, Loader2 } from "lucide-react";
import { NativeSelect, NativeSelectOption } from "../ui/native-select";

export default function WalletConfigureModal({ 
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [routingNumber, setRoutingNumber] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountType, setAccountType] = useState("select");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

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
                throw new Error(data.error || "Failed to configure wallet");
            }

            if (data.success) {
                // Show bank name if available
                if (data.bankName) {
                    // You can show a success message with bank name here
                    console.log("Bank configured:", data.bankName);
                }
                
                // Close modal on success
                onOpenChange(false);
                // Reset form
                setRoutingNumber("");
                setAccountNumber("");
                setAccountType("select");
                // Refresh the page to show updated wallet data
                window.location.reload();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to configure wallet");
            console.error("Error configuring wallet:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                showCloseButton={false}
                className="!max-w-md rounded-xl bg-black/90 backdrop-blur-xl border border-neutral-800/30 transition-all duration-300"
            >
                <DialogHeader className="flex flex-row justify-between items-center mb-6">
                    <DialogTitle className="text-white text-2xl font-semibold">Wallet Settings</DialogTitle>
                    <button 
                        onClick={() => onOpenChange(false)} 
                        className="bg-white/5 text-white rounded-xl p-2 hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-0"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="routingNumber" className="block text-sm text-white/70 font-medium">
                            Routing Number
                        </label>
                        <input
                            type="text"
                            id="routingNumber"
                            name="routingNumber"
                            value={routingNumber}
                            onChange={(e) => setRoutingNumber(e.target.value)}
                            placeholder="Enter routing number"
                            required
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="accountNumber" className="block text-sm text-white/70 font-medium">
                            Account Number
                        </label>
                        <input
                            type="text"
                            id="accountNumber"
                            name="accountNumber"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="Enter account number"
                            required
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="accountType" className="block text-sm text-white/70 font-medium">
                            Account Type
                        </label>
                        <NativeSelect 
                            id="accountType"
                            value={accountType}
                            onChange={(e) => setAccountType(e.target.value)}
                            className="w-full !px-4 !py-3 !h-auto bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                        >
                            <NativeSelectOption value="select">Select account type</NativeSelectOption>
                            <NativeSelectOption value="individual">Individual Account</NativeSelectOption>
                            <NativeSelectOption value="business">Business Account</NativeSelectOption>
                        </NativeSelect>
                    </div>

                    {error && (
                        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="flex flex-row gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || accountType === "select"}
                            className="flex-1 px-4 py-3 bg-[#30d158] text-black rounded-lg hover:bg-[#30d158]/90 transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save"
                            )}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}