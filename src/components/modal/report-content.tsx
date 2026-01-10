"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { X, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

const REPORT_REASONS = [
    "Copyright infringement",
    "Inappropriate content",
    "Spam or misleading content",
    "Violence or harmful content",
    "Privacy violation",
    "Other",
] as const;

export default function ReportContentModal({ 
    linkId,
    linkUrl,
    reporterEmail,
    open,
    onOpenChange,
}: {
    linkId: string;
    linkUrl: string;
    reporterEmail: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [reason, setReason] = useState<string>("");
    const [description, setDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!reason) {
            setError("Please select a reason");
            return;
        }
        
        if (!description.trim()) {
            setError("Please provide a detailed description");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/reports", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    linkId,
                    linkUrl,
                    reason,
                    description: description.trim(),
                    reporterEmail,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to submit report");
            }

            if (data.success) {
                setSuccess(true);
                // Reset form
                setReason("");
                setDescription("");
                // Close modal after 2 seconds
                setTimeout(() => {
                    onOpenChange(false);
                    setSuccess(false);
                }, 2000);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit report");
            console.error("Error submitting report:", err);
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
                    <DialogTitle className="text-white text-2xl font-semibold">Report Content</DialogTitle>
                    <button 
                        onClick={() => {
                            onOpenChange(false);
                            setReason("");
                            setDescription("");
                            setError(null);
                            setSuccess(false);
                        }} 
                        className="bg-white/5 text-white rounded-xl p-2 hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-0"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </DialogHeader>

                {success ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-white text-lg font-semibold">Report Submitted</p>
                        <p className="text-white/70 text-sm text-center">
                            Thank you for your report. We'll review it and take appropriate action.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="reason" className="block text-sm text-white/70 font-medium">
                                Reason for Report *
                            </label>
                            <select
                                id="reason"
                                name="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                            >
                                <option value="">Select a reason</option>
                                {REPORT_REASONS.map((r) => (
                                    <option key={r} value={r} className="bg-neutral-900">
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="description" className="block text-sm text-white/70 font-medium">
                                Detailed Description *
                            </label>
                            <Textarea
                                id="description"
                                name="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Please provide as much detail as possible about why you're reporting this content..."
                                rows={6}
                                required
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 resize-none"
                            />
                            <p className="text-white/50 text-xs">
                                Minimum 20 characters required
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="flex flex-row gap-3">
                            <Button
                                type="button"
                                onClick={() => {
                                    onOpenChange(false);
                                    setReason("");
                                    setDescription("");
                                    setError(null);
                                }}
                                variant="outline"
                                className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading || !reason || description.trim().length < 20}
                                className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Report"
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

