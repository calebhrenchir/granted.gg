"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mail, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function LookupPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSent(false);

        try {
            const response = await fetch("/api/lookup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send email");
            }

            setSent(true);
            setEmail(""); // Clear email after successful submission
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send email");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col px-4 md:px-0">
            <div className="mx-auto md:max-w-md p-4 px-4 rounded-3xl flex flex-col items-center md:mt-20 border border-white/10">
                <h1 className="mt-2 text-center text-xl mb-2 font-semibold text-white">Lookup Previous Purchases</h1>
                <p className="text-white/50 text-center px-4">Enter your email and we'll send you an email with your previous purchases.</p>

                <form onSubmit={handleSubmit} className="flex flex-col w-full mt-4 gap-4">
                    <div className="flex flex-row w-full gap-2.5">
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError(null);
                            }}
                            required
                            placeholder="you@example.com"
                            className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/50 transition-all"
                        />
                        <Button
                            type="submit"
                            disabled={loading || !email}
                            className={cn(
                                "h-auto px-4 py-2.5 flex items-center justify-center gap-2 min-w-[56px]",
                                "bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            )}
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-center rounded-lg">
                            <p className="text-red-400 font-semibold">{error}</p>
                        </div>
                    )}
                    {sent && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 text-center text-white font-semibold rounded-lg">
                            <p className="text-green-400">Email sent successfully!</p>
                            <p className="text-white/50 text-sm">We've sent you an email with your previous purchases.</p>
                        </div>
                    )}
                </form>
            </div>
            <div className="mx-auto sm:max-w-md px-6 flex flex-col items-center text-sm text-white/50 mt-4 md:mt-8 pb-20">
                <div className="text-center">
                    Having problems finding your purchases?  Email us at{" "}
                    <Link className="font-semibold text-white/50 hover:text-white transition-all duration-300 ease-in-out" href="mailto:support@granted.gg">support@granted.gg</Link>{" "}
                    and we'll help you out.
                </div>
            </div>
        </div>
    );
}