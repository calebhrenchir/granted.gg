"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface NotificationPreferences {
    emailNotificationLinkViews: boolean;
    emailNotificationLinkPurchases: boolean;
    emailNotificationCashOut: boolean;
}

export default function NotificationsPage() {
    const { data: session, status } = useSession();
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        emailNotificationLinkViews: true,
        emailNotificationLinkPurchases: true,
        emailNotificationCashOut: true,
    });
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        if (status === "authenticated") {
            fetchPreferences();
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status]);

    async function fetchPreferences() {
        try {
            setLoading(true);
            const response = await fetch("/api/profile/notifications");
            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
            } else {
                console.error("Failed to fetch notification preferences");
            }
        } catch (error) {
            console.error("Error fetching notification preferences:", error);
        } finally {
            setLoading(false);
        }
    }

    async function updatePreference(key: keyof NotificationPreferences, value: boolean) {
        try {
            setUpdating(key);
            const response = await fetch("/api/profile/notifications", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    [key]: value,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
            } else {
                console.error("Failed to update notification preference");
                // Revert the change on error
                setPreferences((prev) => ({ ...prev, [key]: !value }));
            }
        } catch (error) {
            console.error("Error updating notification preference:", error);
            // Revert the change on error
            setPreferences((prev) => ({ ...prev, [key]: !value }));
        } finally {
            setUpdating(null);
        }
    }

    function handleToggle(key: keyof NotificationPreferences) {
        const newValue = !preferences[key];
        setPreferences((prev) => ({ ...prev, [key]: newValue }));
        updatePreference(key, newValue);
    }

    if (loading) {
        return (
            <div className="px-4 md:px-0 md:max-w-2xl mx-auto">
                <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="w-full py-4 px-4 bg-neutral-800 rounded-xl animate-pulse"
                        >
                            <div className="h-10"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-0 md:max-w-2xl mx-auto">
            <div className="flex flex-col gap-4">
                <div className={cn("w-full py-4 px-4 flex flex-row justify-between items-center bg-neutral-800 rounded-xl transition-all duration-300 ease-in-out group")}>
                    <div className="flex flex-col">
                        <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Link views</p>
                        <p className="text-white/20 group-hover:text-white text-xs font-medium transition-all duration-300 ease-in-out">Someone viewed your link</p>
                    </div>
                    <Switch
                        checked={preferences.emailNotificationLinkViews}
                        onCheckedChange={() => handleToggle("emailNotificationLinkViews")}
                        disabled={updating === "emailNotificationLinkViews"}
                    />
                </div>
                <div className={cn("w-full py-4 px-4 flex flex-row justify-between items-center bg-neutral-800 rounded-xl transition-all duration-300 ease-in-out group")}>
                    <div className="flex flex-col">
                        <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Link purchases</p>
                        <p className="text-white/20 group-hover:text-white text-xs font-medium transition-all duration-300 ease-in-out">Someone purchased your link</p>
                    </div>
                    <Switch
                        checked={preferences.emailNotificationLinkPurchases}
                        onCheckedChange={() => handleToggle("emailNotificationLinkPurchases")}
                        disabled={updating === "emailNotificationLinkPurchases"}
                    />
                </div>
                
                <div className={cn("w-full py-4 px-4 flex flex-row justify-between items-center bg-neutral-800 rounded-xl transition-all duration-300 ease-in-out group")}>
                    <div className="flex flex-col">
                        <p className="text-white/40 group-hover:text-white text-md font-semibold transition-all duration-300 ease-in-out">Cash Out</p>
                        <p className="text-white/20 group-hover:text-white text-xs font-medium transition-all duration-300 ease-in-out">Funds successfully cashed out</p>
                    </div>
                    <Switch
                        checked={preferences.emailNotificationCashOut}
                        onCheckedChange={() => handleToggle("emailNotificationCashOut")}
                        disabled={updating === "emailNotificationCashOut"}
                    />
                </div>
            </div>
        </div>
    );
}