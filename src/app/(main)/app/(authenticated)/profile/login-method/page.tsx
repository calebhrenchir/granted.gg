"use client";

import { Mail, Pencil, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginMethodPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stage, setStage] = useState<"confirm-old" | "enter-new" | "confirm-new" | "success">("confirm-old");
    const [currentEmail, setCurrentEmail] = useState<string>("");
    const [newEmail, setNewEmail] = useState("");
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSendingCode, setIsSendingCode] = useState(false);

    // Fetch current email
    useEffect(() => {
        if (status === "authenticated" && session?.user?.email) {
            setCurrentEmail(session.user.email);
        }
    }, [status, session]);

    const handleSendCode = async () => {
        if (!newEmail) {
            setError("Please enter a new email address");
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            setError("Please enter a valid email address");
            return;
        }

        setIsSendingCode(true);
        setError(null);

        try {
            const response = await fetch("/api/profile/email/send-code", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ newEmail }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send verification code");
            }

            setStage("confirm-new");
        } catch (err) {
            console.error("Error sending code:", err);
            setError(err instanceof Error ? err.message : "Failed to send verification code");
        } finally {
            setIsSendingCode(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!code || code.length !== 6) {
            setError("Please enter a valid 6-digit code");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/profile/email/verify", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ newEmail, code }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to verify code");
            }

            setStage("success");
            setCurrentEmail(newEmail);
        } catch (err) {
            console.error("Error verifying code:", err);
            setError(err instanceof Error ? err.message : "Failed to verify code");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, "").slice(0, 6);
        setCode(value);
        setError(null);
    };

    if (status === "loading") {
        return (
            <div className="px-4 md:px-0 md:max-w-2xl mx-auto flex items-center justify-center h-[calc(100vh-12rem)]">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    return (
        <div className="px-4 md:px-0 md:max-w-2xl mx-auto">
            <div className="flex flex-col gap-4 text-center">
                <div className="h-32 w-32 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                    <Mail className="h-20 w-20 text-white/40" />
                </div>

                {error && (
                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {stage === "confirm-old" ? (
                    <>  
                        <h1 className="text-2xl font-bold text-white">{currentEmail || "Loading..."}</h1>

                        <button 
                            onClick={() => setStage("enter-new")} 
                            className="w-full py-4 px-4 flex gap-3 justify-center bg-neutral-800 hover:opacity-80 rounded-xl transition-all duration-300 ease-in-out group items-center mt-2"
                        >
                            <Pencil className="h-4.5 w-4.5 text-white/40 font-semibold group-hover:text-white transition-all duration-300 ease-in-out" />
                            <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Change Email</p>
                        </button>
                    </>
                ) : stage === "enter-new" ? (
                    <>
                        <div className="flex flex-col gap-2">
                            <h1 className="text-2xl font-bold text-white">Enter your new email</h1>
                            <p className="text-white/50 text-sm max-w-md text-center w-full mx-auto">Please enter the new email you'd like to use. We will send a verification code to your new email</p>
                        </div>

                        <div className="mt-2 -mb-2">
                            <label htmlFor="newEmail" className="block text-sm font-medium mb-2 text-white text-start">
                                New Email
                            </label>
                            <input
                                type="email"
                                id="newEmail"
                                name="newEmail"
                                value={newEmail}
                                onChange={(e) => {
                                    setNewEmail(e.target.value);
                                    setError(null);
                                }}
                                required
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/30"
                                placeholder="new@email.com"
                            />
                        </div>

                        <button 
                            onClick={handleSendCode}
                            disabled={isSendingCode || !newEmail}
                            className="w-full py-4 px-4 flex gap-3 justify-center bg-neutral-800 hover:opacity-80 rounded-xl transition-all duration-300 ease-in-out group items-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSendingCode ? (
                                <>
                                    <Loader2 className="h-4.5 w-4.5 text-white/40 animate-spin" />
                                    <p className="text-white/40 text-md font-semibold">Sending...</p>
                                </>
                            ) : (
                                <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Continue</p>
                            )}
                        </button>
                    </>
                ) : stage === "confirm-new" ? (
                    <>
                        <div className="flex flex-col gap-2 mt-2">
                            <h1 className="text-2xl font-bold text-white">Check your email for a verification code</h1>
                            <p className="text-white/50 text-sm max-w-md text-center w-full mx-auto">We sent a 6-digit code to <strong>{newEmail}</strong></p>
                        </div>

                        <div>
                            <label htmlFor="code" className="block text-sm font-medium mb-2 text-white text-start">
                                Verification Code
                            </label>
                            <input
                                id="code"
                                type="text"
                                value={code}
                                onChange={handleCodeChange}
                                required
                                placeholder="000000"
                                maxLength={6}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 text-center text-2xl tracking-widest"
                            />
                        </div>

                        <button 
                            onClick={handleVerifyCode}
                            disabled={isLoading || code.length !== 6}
                            className="w-full py-4 px-4 flex gap-3 justify-center bg-neutral-800 hover:opacity-80 rounded-xl transition-all duration-300 ease-in-out group items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4.5 w-4.5 text-white/40 animate-spin" />
                                    <p className="text-white/40 text-md font-semibold">Verifying...</p>
                                </>
                            ) : (
                                <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Verify Code</p>
                            )}
                        </button>

                        <button
                            onClick={() => {
                                setStage("enter-new");
                                setCode("");
                                setError(null);
                            }}
                            className="text-white/50 hover:text-white text-sm underline"
                        >
                            Use a different email
                        </button>
                    </>
                ) : stage === "success" ? (
                    <>
                        <div className="flex flex-col gap-2 mt-2">
                            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-10 w-10 text-green-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">Email updated successfully!</h1>
                            <p className="text-white/50 text-sm max-w-md text-center w-full mx-auto">Your login email has been changed to <strong>{currentEmail}</strong></p>
                        </div>

                        <button 
                            onClick={() => {
                                router.push("/profile");
                            }}
                            className="w-full py-4 px-4 flex gap-3 justify-center bg-neutral-800 hover:opacity-80 rounded-xl transition-all duration-300 ease-in-out group items-center mt-2"
                        >
                            <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Back to Profile</p>
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    )
}