"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mail, Chrome, Apple } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingCode(true);
    setError(null);
    
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailSent(true);
      } else {
        setError(data.error || "Failed to send code");
        console.error("Failed to send code:", data);
      }
    } catch (error) {
      setError("Network error. Please try again.");
      console.error("Error sending code:", error);
    } finally {
      setIsSendingCode(false);
    }
  };

  const getAppSubdomainUrl = (path: string) => {
    if (typeof window === "undefined") return path;
    
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol;
    
    // If already on app subdomain, just return the path
    if (hostname.startsWith('app.')) {
      return path;
    }
    
    // If on localhost, redirect to app.localhost
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//app.localhost${port}${path}`;
    }
    
    // Check if we're on granted.gg domain
    if (hostname === "granted.gg" || hostname.endsWith(".granted.gg")) {
      return `${protocol}//app.granted.gg${path}`;
    }
    
    // For production, extract base domain and construct app subdomain
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      const baseDomain = parts.slice(-2).join("."); // Get last two parts
      return `${protocol}//app.${baseDomain}${path}`;
    }
    
    return `${protocol}//app.${hostname}${path}`;
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signIn("credentials", {
        email,
        code,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid code. Please try again.");
        setIsLoading(false);
      } else if (result?.ok) {
        // Use full page reload to ensure session cookie is properly read
        // Small delay to ensure cookie is set
        setTimeout(() => {
          if (typeof window !== "undefined" && window.location.hostname.startsWith("app.")) {
            // Already on app subdomain, just navigate
            window.location.href = "/home";
          } else {
            // Need to change domain
            window.location.href = getAppSubdomainUrl("/home");
          }
        }, 100);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
      console.error("Error verifying code:", error);
    }
  };

  const handleGoogleLogin = async () => {
    const appUrl = getAppSubdomainUrl("/home");
    await signIn("google", {
      callbackUrl: appUrl,
    });
  };

  const handleAppleLogin = async () => {
    const appUrl = getAppSubdomainUrl("/home");
    await signIn("apple", {
      callbackUrl: appUrl,
    });
  };

  return (
    <div className="h-[calc(100vh-12rem)] overflow-hidden flex flex-col items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-1">Login to Granted</h1>
        <p className="text-white/50 text-sm mb-4">Private, protected, annoymous.</p>
        <div className="bg-transparentrounded-lg space-y-4">
          {emailSent ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <p className="text-white mb-4">Check your email for a login code</p>
                <label htmlFor="code" className="block text-sm font-medium text-white/70 mb-2">
                  Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 text-center text-2xl tracking-widest"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className={cn(
                  "w-full flex items-center justify-center gap-2",
                  "bg-white text-black hover:bg-white/90"
                )}
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setEmailSent(false);
                  setCode("");
                }}
                className="w-full bg-white/10 text-white border border-white/20 hover:bg-white/20"
              >
                Use different email
              </Button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSendCode} className="space-y-3">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
                    Email
                  </label>
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
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSendingCode}
                  className={cn(
                    "w-full h-10 flex items-center justify-center gap-2",
                    "bg-white text-black hover:bg-white/90"
                  )}
                >
                  <Mail className="w-5 h-5" />
                  {isSendingCode ? "Sending..." : "Continue with Email"}
                </Button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-1/3 border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white/10 text-white/50">Or continue with</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-end">
                  <div className="w-1/3 border-t border-white/20"></div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleGoogleLogin}
                  className={cn(
                    "w-full h-10 flex items-center justify-center gap-2",
                    "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  )}
                >
                  <Chrome className="w-5 h-5" />
                  Continue with Google
                </Button>

{/*}
                <Button
                  onClick={handleAppleLogin}
                  className={cn(
                    "w-full h-10 flex items-center justify-center gap-2",
                    "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  )}
                >
                  <Apple className="w-5 h-5" />
                  Continue with Apple
                </Button>
                {*/}
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-white/50 text-xs text-center mt-3.5 max-w-sm">
          By signing in, you agree that you are 18 years of age or older and to our <Link href="https://granted.gg/terms" target="_blank" className="text-white/80 font-semibold hover:text-white transition">Terms of Service</Link> and <Link href="https://granted.gg/privacy" target="_blank" className="text-white/80 font-semibold hover:text-white transition">Privacy Policy</Link>.
      </p>
    </div>
  );
}

