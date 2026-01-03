"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { MaskInput } from "@/components/ui/mask-input";

interface OnboardingFormData {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

type Step = 1 | 2 | 3;

function OnboardingPageContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "failed" | null>(null);
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [formData, setFormData] = useState<OnboardingFormData>({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        phoneNumber: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "US",
    });

    // Fetch existing user data and prefill form
    useEffect(() => {
        const fetchUserData = async () => {
            if (status !== "authenticated") return;

            try {
                const response = await fetch("/api/onboarding");
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        const userData = data.data;
                        
                        // Prefill form with existing data
                        setFormData({
                            firstName: userData.firstName || "",
                            lastName: userData.lastName || "",
                            dateOfBirth: userData.dateOfBirth || "",
                            phoneNumber: userData.phoneNumber || "",
                            addressLine1: userData.addressLine1 || "",
                            addressLine2: userData.addressLine2 || "",
                            city: userData.city || "",
                            state: userData.state || "",
                            postalCode: userData.postalCode || "",
                            country: userData.country || "US",
                        });
                        
                        // If user has completed steps 1 and 2, check if they have a verification session
                        // This helps detect returns from Stripe Identity
                        if (userData.firstName && userData.lastName && userData.addressLine1) {
                            // Check verification status - if there's an active session, user might be returning
                            const statusResponse = await fetch("/api/onboarding/status");
                            if (statusResponse.ok) {
                                const statusData = await statusResponse.json();
                                if (statusData.status && statusData.status !== "pending" && !statusData.isVerified) {
                                    // User has an active verification session, likely returning from Stripe
                                    setCurrentStep(3);
                                } else if (statusData.isVerified) {
                                    // Already verified, redirect to home
                                    router.push("/home");
                                }
                            }
                        }

                    }
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchUserData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    // Update progress bar
    useEffect(() => {
        const progressBar = document.getElementById("onboarding-progress");
        if (progressBar) {
            const progress = (currentStep / 3) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }, [currentStep]);

    // Check if returning from Stripe verification
    useEffect(() => {
        if (isLoadingData) return;
        
        // Check for various possible query parameters that Stripe Identity might use
        const verificationId = searchParams.get("verification_session") || 
                               searchParams.get("session_id") || 
                               searchParams.get("session");
        
        // If we have a query parameter indicating return from Stripe, check status
        if (verificationId) {
            setCurrentStep(3);
            checkVerificationStatus();
            return;
        }
        
        // If we're on step 3 but haven't checked status, check it now
        // This handles cases where user returns from Stripe without query params
        if (currentStep === 3 && verificationStatus === null && !isCheckingStatus) {
            checkVerificationStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingData]);

    const checkVerificationStatus = async () => {
        setIsCheckingStatus(true);
        try {
            const response = await fetch("/api/onboarding/status");
            if (response.ok) {
                const data = await response.json();
                if (data.isVerified) {
                    setVerificationStatus("verified");
                    setTimeout(() => {
                        router.push("/home");
                    }, 2000);
                } else if (data.status === "requires_input") {
                    setVerificationStatus("failed");
                } else {
                    setVerificationStatus("pending");
                }
            }
        } catch (err) {
            console.error("Error checking verification status:", err);
        } finally {
            setIsCheckingStatus(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const validateStep1 = (): boolean => {
        if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.phoneNumber) {
            setError("Please fill in all required fields");
            return false;
        }
        return true;
    };

    const validateStep2 = (): boolean => {
        if (!formData.addressLine1 || !formData.city || !formData.state || !formData.postalCode || !formData.country) {
            setError("Please fill in all required address fields");
            return false;
        }
        return true;
    };

    const handleNext = async () => {
        setError(null);
        
        if (currentStep === 1) {
            if (!validateStep1()) return;
            // Save personal info
            try {
                const response = await fetch("/api/onboarding", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        dateOfBirth: formData.dateOfBirth,
                        phoneNumber: formData.phoneNumber,
                    }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to save personal information");
                }
                setCurrentStep(2);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            }
        } else if (currentStep === 2) {
            if (!validateStep2()) return;
            // Save address info
            try {
                const response = await fetch("/api/onboarding", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        addressLine1: formData.addressLine1,
                        addressLine2: formData.addressLine2,
                        city: formData.city,
                        state: formData.state,
                        postalCode: formData.postalCode,
                        country: formData.country,
                    }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to save address");
                }
                setCurrentStep(3);
                await initiateVerification();
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            }
        }
    };

    const handleBack = () => {
        setError(null);
        if (currentStep > 1) {
            setCurrentStep((prev) => (prev - 1) as Step);
        }
    };

    const initiateVerification = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const verificationResponse = await fetch("/api/onboarding/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!verificationResponse.ok) {
                const errorData = await verificationResponse.json();
                throw new Error(errorData.error || "Failed to create verification session");
            }

            const verificationData = await verificationResponse.json();

            if (verificationData.verificationUrl) {
                window.location.href = verificationData.verificationUrl;
            } else {
                throw new Error("No verification URL provided");
            }
        } catch (err) {
            console.error("Error during verification:", err);
            setError(err instanceof Error ? err.message : "An error occurred");
            setIsSubmitting(false);
        }
    };

    if (status === "loading" || isLoadingData) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-0rem)] md:h-[calc(100vh-12rem)] bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        );
    }

    if (status === "unauthenticated") {
        router.push("/login");
        return null;
    }

    // Show verification status if returning from Stripe
    if (currentStep === 3 && verificationStatus === "verified") {
        return (
            <div className="md:h-calc(100vh-12rem) bg-black text-white flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-2xl text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h1 className="text-4xl font-bold mb-2">Identity Verified!</h1>
                    <p className="text-white/70">Redirecting you to the dashboard...</p>
                </div>
            </div>
        );
    }

    if (currentStep === 3 && verificationStatus === "failed") {
        return (
            <div className="md:h-calc(100vh-12rem) bg-black text-white flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-2xl text-center">
                    <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-4xl font-bold mb-2">Verification Failed</h1>
                    <p className="text-white/70 mb-6">Please try again or contact support if the issue persists.</p>
                    <button
                        onClick={() => {
                            setVerificationStatus(null);
                            setCurrentStep(3);
                            initiateVerification();
                        }}
                        className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (currentStep === 3 && isCheckingStatus) {
        return (
            <div className="md:h-calc(100vh-12rem) bg-black text-white flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-2xl text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
                    <p className="text-white/70">Checking verification status...</p>
                </div>
            </div>
        );
    }

    if (currentStep === 3 && !verificationStatus) {
        return (
            <div className="md:h-calc(100vh-12rem) bg-black text-white flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-2xl text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
                    <h1 className="text-3xl font-bold mb-2">Preparing Identity Verification</h1>
                    <p className="text-white/70">Redirecting you to Stripe Identity...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="md:h-calc(100vh-12rem) bg-black text-white flex items-center justify-center px-4 md:py-12">
            <div className="w-full max-w-2xl">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">
                        {currentStep === 1 && "Personal Information"}
                        {currentStep === 2 && "Address Information"}
                        {currentStep === 3 && "Identity Verification"}
                    </h1>
                    <p className="text-white/70">
                        {currentStep === 1 && "Let's start with your basic information"}
                        {currentStep === 2 && "We need your address for verification"}
                        {currentStep === 3 && "Verify your identity with your license"}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                                    First Name *
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                            </div>

                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                                    Last Name *
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="dateOfBirth" className="block text-sm font-medium mb-2">
                                    Date of Birth *
                                </label>
                                <input
                                    type="date"
                                    id="dateOfBirth"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleChange}
                                    required
                                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                            </div>

                            <div>
                                <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2">
                                    Phone Number *
                                </label>
                                <MaskInput
                                mask={"phone"}
                                value={formData.phoneNumber}
                                onValueChange={(masked, unmasked) => handleChange({ target: { name: "phoneNumber", value: unmasked } } as React.ChangeEvent<HTMLInputElement>)}
                                className="w-full px-4 !py-3 !h-12 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Address Information */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="addressLine1" className="block text-sm font-medium mb-2">
                                Address Line 1 *
                            </label>
                            <input
                                type="text"
                                id="addressLine1"
                                name="addressLine1"
                                value={formData.addressLine1}
                                onChange={handleChange}
                                required
                                placeholder="Street address"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                            />
                        </div>

                        <div>
                            <label htmlFor="addressLine2" className="block text-sm font-medium mb-2">
                                Address Line 2 (Optional)
                            </label>
                            <input
                                type="text"
                                id="addressLine2"
                                name="addressLine2"
                                value={formData.addressLine2}
                                onChange={handleChange}
                                placeholder="Apartment, suite, etc."
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="city" className="block text-sm font-medium mb-2">
                                    City *
                                </label>
                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                            </div>

                            <div>
                                <label htmlFor="state" className="block text-sm font-medium mb-2">
                                    State *
                                </label>
                                <input
                                    type="text"
                                    id="state"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                            </div>

                            <div>
                                <label htmlFor="postalCode" className="block text-sm font-medium mb-2">
                                    ZIP Code *
                                </label>
                                <input
                                    type="text"
                                    id="postalCode"
                                    name="postalCode"
                                    value={formData.postalCode}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="country" className="block text-sm font-medium mb-2">
                                Country *
                            </label>
                            <select
                                id="country"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                <option value="US">United States</option>
                                <option value="CA">Canada</option>
                                <option value="GB">United Kingdom</option>
                                <option value="AU">Australia</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8">
                    <button
                        type="button"
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back
                    </button>

                    {currentStep < 3 && (
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        }>
            <OnboardingPageContent />
        </Suspense>
    );
}
