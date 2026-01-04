"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Copy, Check, Image, FileText, Video, Music, FileCode, File, Unlock, MousePointerClick, Ellipsis, Eye, Star } from "lucide-react";
import { MaskInput } from "@/components/ui/mask-input";
import { LinkCoverOverlay } from "@/components/link-cover-overlay";
import { NoPreview } from "@/components/no-preview";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { getCachedLink, setCachedLink, invalidateLinkCache } from "@/lib/cache";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface FileData {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    s3Url: string;
    blurredS3Url: string | null;
    isCoverPhoto: boolean;
    isPreviewable: boolean;
    createdAt: string;
}

interface LinkData {
    id: string;
    url: string;
    name: string | null;
    price: number;
    totalEarnings: number;
    totalClicks: number;
    totalSales: number;
    coverPhotoS3Url: string | null;
    coverColor: string | null;
    platformFee?: number;
    createdAt: string;
}

interface ActivityData {
    id: string;
    type: "click" | "purchase";
    amount: number | null;
    createdAt: string;
}

function ViewButton({ view, active, children }: { view: string, active: string, children: React.ReactNode }) {
    return (
        <div className="">
            <button
                className={`transition-colors duration-300 font-semibold text-lg ${
                    active ? "text-white" : "text-white/50 hover:text-white"
                }`}
            >
                {children}
            </button>
        </div>
    );
}

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText;
    if (mimeType.includes('code') || mimeType.includes('json') || mimeType.includes('xml')) return FileCode;
    return File;
};

const getFileTypeName = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'Image';
    if (mimeType.startsWith('video/')) return 'Video';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'Document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheet';
    if (mimeType.includes('text')) return 'Text';
    if (mimeType.includes('code') || mimeType.includes('json') || mimeType.includes('xml')) return 'Code';
    return 'File';
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
        return 'just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
    }
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
};

export default function FilePage() {
    const params = useParams();
    const { data: session, status } = useSession();
    const linkId = params.id as string;
    
    const [link, setLink] = useState<LinkData | null>(null);
    const [files, setFiles] = useState<FileData[]>([]);
    const [activities, setActivities] = useState<ActivityData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingActivity, setIsLoadingActivity] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreActivities, setHasMoreActivities] = useState(true);
    const [activitiesSkip, setActivitiesSkip] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [linkName, setLinkName] = useState<string>("");
    const [isUpdatingName, setIsUpdatingName] = useState(false);
    const [linkPrice, setLinkPrice] = useState<string>("");
    const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
    const [priceInputWidth, setPriceInputWidth] = useState<number>(60);
    const priceMeasureRef = useRef<HTMLSpanElement>(null);
    const [priceError, setPriceError] = useState<string | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingPrice, setIsEditingPrice] = useState(false);

    const [view, setView] = useState<"files" | "activity" | "stats">("files");

    // Update input width when price changes
    useEffect(() => {
        if (priceMeasureRef.current) {
            const width = priceMeasureRef.current.offsetWidth;
            //console.log("width", width);
            setPriceInputWidth(Math.max(width - 0, 20));
        }
    }, [linkPrice]);

    useEffect(() => {
        if (status === "authenticated" && linkId) {
            fetchLink();
        }
    }, [status, linkId]);

    // Fetch activities when view changes to "activity"
    useEffect(() => {
        if (view === "activity" && linkId && link && !isLoadingActivity && activities.length === 0) {
            fetchActivity(0, false);
        }
    }, [view, linkId, link]);

    // Listen for link updates (when URL is changed in settings modal)
    useEffect(() => {
        if (!linkId) return;

        const handleLinkUpdate = (e: CustomEvent) => {
            // Check if this update is for our link
            if (e.detail && e.detail.linkId === linkId) {
                // Refetch the link to get updated URL
                fetchLink(false).catch(() => {
                    // Silent fail
                });
            }
        };

        // Listen for custom event dispatched when link is updated
        window.addEventListener("linkUpdated" as any, handleLinkUpdate as EventListener);

        // Also check cache when page becomes visible (user returns after closing modal)
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible" && linkId && !isEditingName && !isEditingPrice) {
                // Check if cache was updated
                const cached = getCachedLink(linkId);
                if (cached && cached.link) {
                    // Update state with cached data (will update if URL changed)
                    setLink((prevLink) => {
                        if (prevLink && cached.link.url !== prevLink.url) {
                            return cached.link;
                        }
                        return prevLink || cached.link;
                    });
                    setFiles(cached.files || []);
                    if (cached.link.name !== undefined && !isEditingName) {
                        setLinkName(cached.link.name || "");
                    }
                    if (cached.link.price !== undefined && !isEditingPrice) {
                        setLinkPrice(Number(cached.link.price).toString());
                    }
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Also poll cache periodically to catch updates (fallback)
        const pollInterval = setInterval(() => {
            if (linkId && !isEditingName && !isEditingPrice) {
                const cached = getCachedLink(linkId);
                if (cached && cached.link) {
                    setLink((prevLink) => {
                        if (prevLink && cached.link.url !== prevLink.url) {
                            return cached.link;
                        }
                        return prevLink || cached.link;
                    });
                    setFiles(cached.files || []);
                    if (cached.link.name !== undefined && !isEditingName) {
                        setLinkName(cached.link.name || "");
                    }
                    if (cached.link.price !== undefined && !isEditingPrice) {
                        setLinkPrice(Number(cached.link.price).toString());
                    }
                }
            }
        }, 2000); // Check every 2 seconds as fallback

        return () => {
            window.removeEventListener("linkUpdated" as any, handleLinkUpdate as EventListener);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            clearInterval(pollInterval);
        };
    }, [linkId]);

    const fetchLink = async (useCache: boolean = true) => {
        try {
            setIsLoading(true);
            
            // Check cache first
            if (useCache) {
                const cached = getCachedLink(linkId);
                if (cached) {
                    console.log("Loading from cache:", linkId);
                    setLink(cached.link);
                    setFiles(cached.files);
                    setLinkName(cached.link.name || "");
                    const price = Number(cached.link.price).toString();
                    setLinkPrice(price);
                    setIsLoading(false);
                    // Still fetch in background to update cache
                    fetchLink(false).catch(() => {
                        // Silent fail for background update
                    });
                    return;
                }
            }

            const response = await fetch(`/api/links/${linkId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Link not found");
                } else if (response.status === 403) {
                    throw new Error("You don't have access to this link");
                }
                throw new Error("Failed to fetch link");
            }

            const data = await response.json();
            if (data.success) {
                setLink(data.link);
                setFiles(data.files);
                setLinkName(data.link.name || "");
                const price = Number(data.link.price).toString();
                setLinkPrice(price);
                
                // Cache the data
                setCachedLink(linkId, {
                    link: data.link,
                    files: data.files,
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load link");
            console.error("Error fetching link:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchActivity = async (skip: number = 0, append: boolean = false) => {
        try {
            if (append) {
                setIsLoadingMore(true);
            } else {
                setIsLoadingActivity(true);
            }
            
            const response = await fetch(`/api/links/${linkId}/activity?skip=${skip}&take=20`);
            
            if (!response.ok) {
                throw new Error("Failed to fetch activity");
            }

            const data = await response.json();
            if (data.success) {
                if (append) {
                    setActivities(prev => [...prev, ...data.activities]);
                } else {
                    setActivities(data.activities);
                    setActivitiesSkip(0);
                }
                setHasMoreActivities(data.hasMore);
                setActivitiesSkip(skip + data.activities.length);
            }
        } catch (err) {
            console.error("Error fetching activity:", err);
            if (!append) {
                setActivities([]);
            }
        } finally {
            setIsLoadingActivity(false);
            setIsLoadingMore(false);
        }
    };

    const loadMoreActivities = useCallback(async () => {
        if (isLoadingMore || !hasMoreActivities) return;
        
        try {
            setIsLoadingMore(true);
            const response = await fetch(`/api/links/${linkId}/activity?skip=${activitiesSkip}&take=20`);
            
            if (!response.ok) {
                throw new Error("Failed to fetch activity");
            }

            const data = await response.json();
            if (data.success) {
                setActivities(prev => [...prev, ...data.activities]);
                setHasMoreActivities(data.hasMore);
                setActivitiesSkip(prev => prev + data.activities.length);
            }
        } catch (err) {
            console.error("Error fetching more activity:", err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMoreActivities, activitiesSkip, linkId]);

    // Infinite scroll for activities
    useEffect(() => {
        if (view !== "activity" || !hasMoreActivities || isLoadingMore) return;

        const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
        if (!scrollArea) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = scrollArea;
            // Load more when user is 200px from bottom
            if (scrollHeight - scrollTop - clientHeight < 200) {
                loadMoreActivities();
            }
        };

        scrollArea.addEventListener('scroll', handleScroll);
        return () => scrollArea.removeEventListener('scroll', handleScroll);
    }, [view, hasMoreActivities, isLoadingMore, loadMoreActivities]);

    if (status === "loading" || isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
                <p className="text-white/50">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
                <p className="text-red-400">Error: {error}</p>
            </div>
        );
    }

    if (!link || files.length === 0) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
                <p className="text-white/50">No files found</p>
            </div>
        );
    }

    const firstFile = files[0];
    const previewUrl = firstFile.blurredS3Url || firstFile.s3Url;

    return (
        <div className="flex flex-col gap-12 items-center px-4 sm:max-w-none sm:flex-row sm:justify-center sm:px-64 pt-0 md:pt-12 sm:items-start">
            <div className="flex w-full flex-col items-center gap-24 sm:sticky sm:top-24 sm:self-start sm:w-[320px] lg:w-[505px]">
                <div className="relative aspect-square w-full sm:p-0">
                    <div className="absolute inset-0 z-0 overflow-hidden shadow-sm select-none sm:inset-0 rounded-[60px]">
                        <div className="h-full w-full overflow-hidden">
                            {previewUrl ? (
                                <img 
                                    alt={firstFile.name} 
                                    crossOrigin="anonymous" 
                                    draggable={false} 
                                    className="h-full w-full overflow-hidden object-cover select-none pointer-events-none" 
                                    src={previewUrl}
                                    onError={(e) => {
                                        console.error("Failed to load image:", previewUrl);
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <NoPreview coverColor={link.coverColor} />
                            )}
                        </div>
                    </div>
                    <LinkCoverOverlay 
                        variant="compact"
                        price={`$${Number(link.price).toFixed(2)}`}
                        className="p-2"
                    />
                </div>
            </div>

            <div className="w-full md:w-[500px] md:max-w-none mb-10">
                <div className="flex flex-col gap-6">
                    <div>
                        <input 
                            type="text"
                            value={linkName}
                            onChange={(e) => {
                                setIsEditingName(true);
                                setLinkName(e.target.value);
                            }}
                            onFocus={() => setIsEditingName(true)}
                            onBlur={async () => {
                                setIsEditingName(false);
                                // Only update if name actually changed
                                if (linkName !== (link?.name || "")) {
                                    setIsUpdatingName(true);
                                    try {
                                        const response = await fetch(`/api/links/${linkId}/update`, {
                                            method: "PATCH",
                                            headers: {
                                                "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({ name: linkName || null }),
                                        });

                                        if (response.ok) {
                                            const data = await response.json();
                                            if (data.success && link) {
                                                // Update local state
                                                setLink({ ...link, name: data.link.name });
                                                // Update cache
                                                const cached = getCachedLink(linkId);
                                                if (cached) {
                                                    setCachedLink(linkId, {
                                                        ...cached,
                                                        link: { ...cached.link, name: data.link.name },
                                                    });
                                                }
                                            }
                                        }
                                    } catch (err) {
                                        console.error("Error updating link name:", err);
                                        // Revert to original name on error
                                        setLinkName(link?.name || "");
                                    } finally {
                                        setIsUpdatingName(false);
                                    }
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                }
                            }}
                            className="w-full text-3xl font-bold border-none bg-transparent text-white placeholder:text-white/50 focus:outline-none mb-2 ring-none disabled:opacity-50"
                            placeholder={link?.name || `Link #${linkId.slice(0, 8)}`}
                            disabled={isUpdatingName || isLoading}
                        />

                        <div className="flex flex-row gap-2 font-semibold items-center">
                            <button 
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(`https://granted.gg/${link.url}`);
                                        setLinkCopied(true);
                                        setTimeout(() => setLinkCopied(false), 2000);
                                    } catch (err) {
                                        console.error("Failed to copy link:", err);
                                    }
                                }}
                                className="flex flex-row gap-1.5 items-center hover:opacity-80 transition-opacity"
                            >
                                {linkCopied ? (
                                    <Check className="w-4 h-4 text-white/50" />
                                ) : (
                                    <Copy className="w-4 h-4 text-white/50" />
                                )}
                                <p className={"text-white/50"}>
                                    {linkCopied ? "Copied!" : `granted.gg/${link.url}`}
                                </p>
                            </button>
                            <p className="text-white/50">· </p>
                            <div className="relative inline-flex items-center">
                                <span
                                    ref={priceMeasureRef}
                                    className="invisible absolute whitespace-nowrap text-white/50 text-sm"
                                    style={{ font: 'inherit' }}
                                >
                                    {linkPrice ? `$${parseFloat(linkPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
                                </span>
                                <MaskInput
                                    id="link-price-input"
                                    mask="currency"
                                    value={linkPrice || "0"}
                                    onValueChange={(maskedValue, unmaskedValue) => {
                                        setIsEditingPrice(true);
                                        // Store the unmasked value (numeric string)
                                        const numericValue = unmaskedValue || "0";
                                        setLinkPrice(numericValue);
                                    }}
                                    onFocus={() => setIsEditingPrice(true)}
                                    onBlur={async () => {
                                        setIsEditingPrice(false);
                                        // Parse and validate the price
                                        const priceValue = parseFloat(linkPrice);
                                        const currentPrice = parseFloat(Number(link.price).toFixed(2));
                                        
                                        // Clear any previous error
                                        setPriceError(null);
                                        
                                        // Validate minimum price
                                        if (!isNaN(priceValue) && priceValue < 5.0) {
                                            setPriceError("Price must be at least $5.00");
                                            setLinkPrice(Number(link.price).toString());
                                            return;
                                        }
                                        
                                        // Only update if price actually changed and is valid
                                        if (!isNaN(priceValue) && priceValue >= 5.0 && Math.abs(priceValue - currentPrice) > 0.001) {
                                            setIsUpdatingPrice(true);
                                            try {
                                                const response = await fetch(`/api/links/${linkId}/update`, {
                                                    method: "PATCH",
                                                    headers: {
                                                        "Content-Type": "application/json",
                                                    },
                                                    body: JSON.stringify({ price: priceValue }),
                                                });

                                                if (response.ok) {
                                                    const data = await response.json();
                                                    if (data.success && link) {
                                                        // Update local state
                                                        setLink({ ...link, price: data.link.price });
                                                        // Store the numeric value (MaskInput will format it)
                                                    const updatedPrice = Number(data.link.price);
                                                    setLinkPrice(updatedPrice.toString());
                                                    // Update cache
                                                    const cached = getCachedLink(linkId);
                                                    if (cached) {
                                                        setCachedLink(linkId, {
                                                            ...cached,
                                                            link: { ...cached.link, price: data.link.price },
                                                        });
                                                    }
                                                    }
                                                } else {
                                                    const errorData = await response.json();
                                                    setPriceError(errorData.error || "Failed to update price");
                                                    // Revert to original price on error
                                                    setLinkPrice(Number(link.price).toString());
                                                }
                                            } catch (err) {
                                                console.error("Error updating link price:", err);
                                                setPriceError("Failed to update price");
                                                // Revert to original price on error
                                                setLinkPrice(Number(link.price).toString());
                                            } finally {
                                                setIsUpdatingPrice(false);
                                            }
                                        } else if (isNaN(priceValue) || priceValue < 0) {
                                            // Revert to original price if invalid
                                            setLinkPrice(Number(link.price).toString());
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.currentTarget.blur();
                                        }
                                    }}
                                    style={{ width: `${priceInputWidth}px` }}
                                    className="text-white/50 border-none bg-transparent focus:outline-none focus:text-white transition-all disabled:opacity-50 !h-auto !px-0.5"
                                    placeholder="$0.00"
                                    disabled={isUpdatingPrice || isLoading}
                                />
                            </div>
                            {priceError && (
                                <p className="text-red-400 text-sm">
                                    {priceError}
                                </p>
                            )}
                            {linkPrice && !isNaN(parseFloat(linkPrice)) && parseFloat(linkPrice) > 0 && !priceError && (
                                <p className="text-white/30 text-sm">
                                    (You earn ${((parseFloat(linkPrice) * (100 - (link?.platformFee || 20) / 2)) / 100).toFixed(2)})
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-row gap-4">
                        <button className={cn(
                            "transition-colors duration-300 font-semibold text-lg",
                            view === "files" ? "text-white" : "text-white/50 hover:text-white"
                        )} onClick={() => setView("files")}>
                            Files
                        </button>
                        <button className={cn(
                            "transition-colors duration-300 font-semibold text-lg",
                            view === "activity" ? "text-white" : "text-white/50 hover:text-white"
                        )} onClick={() => setView("activity")}>
                            Activity
                        </button>
                        <button className={cn(
                            "transition-colors duration-300 font-semibold text-lg",
                            view === "stats" ? "text-white" : "text-white/50 hover:text-white"
                        )} onClick={() => setView("stats")}>
                            Stats
                        </button>
                    </div>

                    {view === "stats" ? (
                        <div className="flex flex-col gap-4">
                            <div>
                                <p className="text-white/50 text-sm mb-1">Total Clicks</p>
                                <p className="text-white font-semibold">{link.totalClicks}</p>
                            </div>
                            <div>
                                <p className="text-white/50 text-sm mb-1">Total Sales</p>
                                <p className="text-white font-semibold">{link.totalSales}</p>
                            </div>
                            <div>
                                <p className="text-white/50 text-sm mb-1">Total Earnings</p>
                                <p className="text-white font-semibold">${Number(link.totalEarnings).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-white/50 text-sm mb-1">Created On</p>
                                <p className="text-white font-semibold">{new Date(link.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )
                    : view === "activity" ? (
                        <div className="flex flex-col gap-4">
                            {isLoadingActivity ? (
                                <div className="flex flex-col gap-4">
                                    {Array.from({ length: 2 }).map((_, i) => (
                                        <div key={i} className="w-full flex flex-row justify-between items-center mb-4 animate-pulse">
                                            <div className="flex flex-row gap-3">
                                                <div className="rounded-lg p-3 bg-neutral-800 w-11 h-11"></div>
                                                <div className="flex flex-col justify-center gap-2">
                                                    <div className="h-4 bg-neutral-800 rounded w-32"></div>
                                                    <div className="h-3 bg-neutral-800 rounded w-20"></div>
                                                </div>
                                            </div>
                                            <div className="h-5 bg-neutral-800 rounded w-16"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="w-full flex justify-center py-8">
                                    <p className="text-white/50 text-sm">No activities yet</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-full w-full">
                                    <div className="flex flex-col gap-4">
                                        {activities.map((activity) => (
                                            <div key={activity.id} className="w-full flex flex-row justify-between items-center">
                                                <div className="flex flex-row gap-3">
                                                    <div className="rounded-lg p-3 bg-neutral-800">
                                                        {activity.type === "purchase" ? (
                                                            <Unlock className="w-5 h-5 text-white" />
                                                        ) : (
                                                            <MousePointerClick className="w-5 h-5 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col justify-center">
                                                        <h2 className="font-semibold text-white text-md">
                                                            {activity.type === "purchase" ? "New Purchase" : "Someone clicked your link"}
                                                        </h2>
                                                        <p className="text-white/50 text-sm">{formatTimeAgo(activity.createdAt)}</p>
                                                    </div>
                                                </div>
                                                {activity.type === "purchase" && activity.amount && (
                                                    <h2 className="text-green-400 font-semibold text-lg">+ ${Number(activity.amount).toFixed(2)}</h2>
                                                )}
                                            </div>
                                        ))}
                                        {isLoadingMore && (
                                            <div className="w-full flex flex-row justify-between items-center">
                                                <div className="flex flex-row gap-3">
                                                    <div className="rounded-lg p-3 bg-neutral-800">
                                                        <div className="w-5 h-5"></div>
                                                    </div>
                                                    <div className="flex flex-col justify-center gap-2">
                                                        <div className="h-4 bg-neutral-800 rounded w-32 animate-pulse"></div>
                                                        <div className="h-3 bg-neutral-800 rounded w-20 animate-pulse"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {!hasMoreActivities && activities.length > 0 && (
                                            <div className="w-full flex justify-center py-4">
                                                <p className="text-white/50 text-sm">No more activities</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    )
                    : view === "files" && (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                                {files.map((file) => {
                                    const FileIcon = getFileIcon(file.mimeType);
                                    const previewUrl = file.s3Url;
                                    const isImage = file.mimeType.startsWith('image/');
                                    
                                    return (
                                        <div 
                                            key={file.id} 
                                            className="relative group bg-white/10 rounded-lg overflow-hidden hover:bg-white/20 transition-colors"
                                        >
                                            <div className="absolute right-0 mr-2 mt-2 top-0 p-1 z-10">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1 rounded hover:bg-white/10 transition-colors">
                                                            <Ellipsis className="w-5 h-5 text-white" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={async () => {
                                                                try {
                                                                    const response = await fetch(`/api/files/${file.id}`, {
                                                                        method: "PATCH",
                                                                        headers: {
                                                                            "Content-Type": "application/json",
                                                                        },
                                                                        body: JSON.stringify({
                                                                            isCoverPhoto: !file.isCoverPhoto,
                                                                        }),
                                                                    });
                                                                    if (response.ok) {
                                                                        const data = await response.json();
                                                                        // Update file in state
                                                                        setFiles(prevFiles =>
                                                                            prevFiles.map(f =>
                                                                                f.id === file.id
                                                                                    ? { ...f, isCoverPhoto: data.file.isCoverPhoto }
                                                                                    : { ...f, isCoverPhoto: false } // Unset other cover photos
                                                                            )
                                                                        );
                                                                        // Invalidate cache to force refresh
                                                                        invalidateLinkCache(linkId);
                                                                        // Refetch link to get updated cover photo
                                                                        fetchLink(false);
                                                                    }
                                                                } catch (error) {
                                                                    console.error("Error updating cover photo:", error);
                                                                }
                                                            }}
                                                        >
                                                            {file.isCoverPhoto ? "Remove from Cover" : "Promote to Cover"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={async () => {
                                                                try {
                                                                    const response = await fetch(`/api/files/${file.id}`, {
                                                                        method: "PATCH",
                                                                        headers: {
                                                                            "Content-Type": "application/json",
                                                                        },
                                                                        body: JSON.stringify({
                                                                            isPreviewable: !file.isPreviewable,
                                                                        }),
                                                                    });
                                                                    if (response.ok) {
                                                                        const data = await response.json();
                                                                        // Update file in state
                                                                        setFiles(prevFiles =>
                                                                            prevFiles.map(f =>
                                                                                f.id === file.id
                                                                                    ? { ...f, isPreviewable: data.file.isPreviewable }
                                                                                    : f
                                                                            )
                                                                        );
                                                                        // Invalidate cache to force refresh
                                                                        invalidateLinkCache(linkId);
                                                                    }
                                                                } catch (error) {
                                                                    console.error("Error updating previewable:", error);
                                                                }
                                                            }}
                                                        >
                                                            {file.isPreviewable ? "Remove Preview" : "Set as Previewable"}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <div className="absolute flex flex-row gap-2 ml-2 mt-2 top-0 p-1 z-10">
                                                {file.isPreviewable && (
                                                    <Eye className="w-5 h-5 text-white" />
                                                )}
                                                {file.isCoverPhoto && (
                                                    <Star className="w-5 h-5 text-white fill-yellow-400" />
                                                )}
                                            </div>
                                            {isImage && previewUrl ? (
                                                <div className="aspect-square relative">
                                                    <img
                                                        src={previewUrl}
                                                        alt={file.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="aspect-square flex flex-col items-center justify-center gap-2 p-4">
                                                    <FileIcon className="w-12 h-12 text-white/70" />
                                                    <span className="text-white/70 text-sm text-center font-semibold truncate w-full px-2" title={file.name}>
                                                        {file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name}
                                                    </span>
                                                    <span className="text-white/50 text-xs text-center">
                                                        {getFileTypeName(file.mimeType)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="p-3 bg-black/40 backdrop-blur-sm">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-sm font-semibold truncate" title={file.name}>
                                                            {file.name}
                                                        </p>
                                                        <p className="text-white/50 text-xs">
                                                            {getFileTypeName(file.mimeType)} · {formatFileSize(file.size)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>   
                    )
                    }
                </div>
            </div>
        </div>
    );
}
