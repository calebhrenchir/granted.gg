"use client";

import { useEffect, useState } from "react";
import { DollarSign, Download, Eye, X, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { getCachedLink, setCachedLink, invalidateLinkCache } from "@/lib/cache";
import { RESERVED_SLUGS } from "@/lib/constants/reserved-slugs";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";

export default function LinkSettingsModal({
    linkId, 
    open,
    onOpenChange,
}: {
    linkId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [isPurchaseable, setIsPurchaseable] = useState(false);
    const [isDownloadable, setIsDownloadable] = useState(false);
    const [isLinkTitleVisible, setIsLinkTitleVisible] = useState(false);
    const [url, setUrl] = useState("");
    const [urlError, setUrlError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingUrl, setIsSavingUrl] = useState(false);

    // Fetch link settings when modal opens
    useEffect(() => {
        if (open && linkId) {
            fetchLinkSettings();
        }
    }, [open, linkId]);

    const fetchLinkSettings = async (useCache: boolean = true) => {
        try {
            // Check cache first for instant loading
            if (useCache) {
                const cached = getCachedLink(linkId);
                if (cached && cached.link) {
                    setIsPurchaseable(cached.link.isPurchaseable ?? false);
                    setIsDownloadable(cached.link.isDownloadable ?? false);
                    setIsLinkTitleVisible(cached.link.isLinkTitleVisible ?? false);
                    setUrl(cached.link.url || "");
                    setIsLoading(false);
                    // Still fetch in background to ensure we have latest data
                    fetchLinkSettings(false).catch(() => {
                        // Silent fail for background update
                    });
                    return;
                }
            }

            setIsLoading(true);
            const response = await fetch(`/api/links/${linkId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch link settings");
            }
            const data = await response.json();
            if (data.success && data.link) {
                setIsPurchaseable(data.link.isPurchaseable ?? false);
                setIsDownloadable(data.link.isDownloadable ?? false);
                setIsLinkTitleVisible(data.link.isLinkTitleVisible ?? false);
                setUrl(data.link.url || "");
                
                // Update cache with latest data
                setCachedLink(linkId, {
                    link: data.link,
                    files: data.files || [],
                });
            }
        } catch (error) {
            console.error("Error fetching link settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const validateUrl = (urlValue: string): string | null => {
        // Remove whitespace and convert to lowercase
        const trimmedUrl = urlValue.trim().toLowerCase();
        
        if (!trimmedUrl) {
            return "URL cannot be empty";
        }
        
        // Check for valid characters (alphanumeric and hyphens only)
        if (!/^[a-z0-9-]+$/.test(trimmedUrl)) {
            return "URL can only contain lowercase letters, numbers, and hyphens";
        }
        
        // Check minimum length
        if (trimmedUrl.length < 3) {
            return "URL must be at least 3 characters";
        }
        
        // Check maximum length
        if (trimmedUrl.length > 50) {
            return "URL must be less than 50 characters";
        }
        
        // Check against reserved slugs
        if (RESERVED_SLUGS.includes(trimmedUrl)) {
            return "This URL is reserved and cannot be used";
        }
        
        return null;
    };

    const updateUrl = async (newUrl: string) => {
        const trimmedUrl = newUrl.trim().toLowerCase();
        
        // Validate URL
        const error = validateUrl(trimmedUrl);
        if (error) {
            setUrlError(error);
            return;
        }
        
        // Check if URL is the same as current
        const cached = getCachedLink(linkId);
        if (cached?.link?.url === trimmedUrl) {
            setUrlError(null);
            return;
        }

        try {
            setIsSavingUrl(true);
            setUrlError(null);
            
            const response = await fetch(`/api/links/${linkId}/settings`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: trimmedUrl,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update URL");
            }

            const data = await response.json();
            if (data.success && data.link) {
                setUrl(data.link.url);
                
                // Update cache
                const cached = getCachedLink(linkId);
                if (cached) {
                    setCachedLink(linkId, {
                        ...cached,
                        link: {
                            ...cached.link,
                            ...data.link,
                        },
                    });
                }
                
                // Invalidate cache to force refresh
                invalidateLinkCache(linkId);
            }
        } catch (error: any) {
            console.error("Error updating URL:", error);
            setUrlError(error.message || "Failed to update URL. This URL may already be taken.");
        } finally {
            setIsSavingUrl(false);
        }
    };

    const updateSetting = async (field: "isPurchaseable" | "isDownloadable" | "isLinkTitleVisible", value: boolean) => {
        // Optimistically update UI
        if (field === "isPurchaseable") setIsPurchaseable(value);
        if (field === "isDownloadable") setIsDownloadable(value);
        if (field === "isLinkTitleVisible") setIsLinkTitleVisible(value);

        try {
            setIsSaving(true);
            const response = await fetch(`/api/links/${linkId}/settings`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    [field]: value,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to update setting");
            }

            const data = await response.json();
            if (data.success && data.link) {
                // Update with server response
                setIsPurchaseable(data.link.isPurchaseable ?? false);
                setIsDownloadable(data.link.isDownloadable ?? false);
                setIsLinkTitleVisible(data.link.isLinkTitleVisible ?? false);
                
                // Update cache with new settings
                const cached = getCachedLink(linkId);
                if (cached) {
                    setCachedLink(linkId, {
                        ...cached,
                        link: {
                            ...cached.link,
                            ...data.link,
                        },
                    });
                } else {
                    // If not cached, fetch full link data and cache it
                    fetch(`/api/links/${linkId}`)
                        .then(res => res.json())
                        .then(fullData => {
                            if (fullData.success) {
                                setCachedLink(linkId, {
                                    link: fullData.link,
                                    files: fullData.files || [],
                                });
                            }
                        })
                        .catch(() => {
                            // Silent fail
                        });
                }
            }
        } catch (error) {
            console.error("Error updating setting:", error);
            // Revert on error
            if (field === "isPurchaseable") setIsPurchaseable(!value);
            if (field === "isDownloadable") setIsDownloadable(!value);
            if (field === "isLinkTitleVisible") setIsLinkTitleVisible(!value);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                showCloseButton={false}
                className="!max-w-md rounded-xl bg-neutral-900/90 backdrop-blur-xl border border-neutral-600/30 transition-all duration-300"
            >
                <DialogHeader className="flex flex-row justify-between items-center mb-2">
                    <DialogTitle className="text-white text-2xl font-semibold">Link Settings</DialogTitle>
                    <button 
                        onClick={() => onOpenChange(false)} 
                        className="bg-white/5 text-white rounded-xl p-2 hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-0 cursor-pointer"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                        <p className="text-white/50">Loading settings...</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row gap-2 items-center">
                                <Link2 className="w-5 h-5 text-white" />
                                <p className="text-white text-md font-semibold">Custom URL</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <InputGroup className="border-white/10 ring-0 focus:ring-0">
                                    <InputGroupInput
                                        type="text"
                                        value={url}
                                        onChange={(e) => {
                                            setUrl(e.target.value);
                                            setUrlError(null);
                                        }}
                                        onBlur={(e) => {
                                            if (e.target.value.trim() !== url) {
                                                updateUrl(e.target.value);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        disabled={isSavingUrl}
                                        placeholder="Enter custom URL"
                                        className="text-white placeholder:text-white focus:visible:ring-0"
                                    />
                                    <InputGroupAddon className="">
                                        granted.gg/ 
                                    </InputGroupAddon>
                                </InputGroup>
                               
                                {urlError && (
                                    <p className="text-red-400 text-sm">{urlError}</p>
                                )}
                                {isSavingUrl && (
                                    <p className="text-white/50 text-sm">Saving...</p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-row justify-between items-center">
                            <div className="flex flex-row gap-2 items-center">
                                <DollarSign className="w-5 h-5 text-white" />
                                <p className="text-white text-md font-semibold">Purchaseable</p>
                            </div>
                            <Switch 
                                checked={isPurchaseable}
                                onCheckedChange={(checked) => updateSetting("isPurchaseable", checked)}
                                disabled={isSaving}
                                className="data-[state=checked]:bg-green-500/50 data-[state=unchecked]:bg-white/20"
                            />
                        </div>

                        <div className="flex flex-row justify-between items-center">
                            <div className="flex flex-row gap-2 items-center">
                                <Download className="w-5 h-5 text-white" />
                                <p className="text-white text-md font-semibold">Downloadable</p>
                            </div>
                            <Switch 
                                checked={isDownloadable}
                                onCheckedChange={(checked) => updateSetting("isDownloadable", checked)}
                                disabled={isSaving}
                                className="data-[state=checked]:bg-green-500/50 data-[state=unchecked]:bg-white/20"
                            />
                        </div>

                        <div className="flex flex-row justify-between items-center">
                            <div className="flex flex-row gap-2 items-center">
                                <Eye className="w-5 h-5 text-white" />
                                <p className="text-white text-md font-semibold">Link Title Visible</p>
                            </div>
                            <Switch 
                                checked={isLinkTitleVisible}
                                onCheckedChange={(checked) => updateSetting("isLinkTitleVisible", checked)}
                                disabled={isSaving}
                                className="data-[state=checked]:bg-green-500/50 data-[state=unchecked]:bg-white/20"
                            />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}