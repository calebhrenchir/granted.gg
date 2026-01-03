"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getCachedLinksList, setCachedLinksList } from "@/lib/cache";
import { NoPreview } from "@/components/no-preview";

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
    fileCount: number;
    createdAt: string;
    updatedAt: string;
}

export default function LinksPage() {
    const { data: session, status } = useSession();
    const [links, setLinks] = useState<LinkData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // If middleware already protected this route, we can proceed even if session is loading
        // The middleware will redirect if not authenticated
        if (status === "authenticated" || status === "unauthenticated") {
            fetchLinks();
        }
    }, [status]);

    const fetchLinks = async (useCache: boolean = true) => {
        try {
            setIsLoading(true);
            
            // Check cache first
            if (useCache) {
                const cached = getCachedLinksList();
                if (cached && cached.length > 0) {
                    console.log("Loading links from cache");
                    setLinks(cached);
                    setIsLoading(false);
                    // Still fetch in background to update cache
                    fetchLinks(false).catch(() => {
                        // Silent fail for background update
                    });
                    return;
                }
            }

            const response = await fetch("/api/links");
            
            if (!response.ok) {
                throw new Error("Failed to fetch links");
            }

            const data = await response.json();
            if (data.success) {
                console.log("Fetched links:", data.links);
                console.log("Cover photo URLs:", data.links.map((l: LinkData) => l.coverPhotoS3Url));
                setLinks(data.links);
                
                // Cache the data
                setCachedLinksList(data.links);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load links");
            console.error("Error fetching links:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Only show loading if we're actually loading links, not waiting for session
    // Middleware already protects this route, so if we're here, user is authenticated
    if (isLoading) {
        return (
            <div className="px-4 md:px-0 md:max-w-7xl mx-auto flex justify-center items-center h-[calc(100vh-12rem)]">
                <p className="text-white/50">Loading links...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-4 md:px-0 md:max-w-7xl mx-auto flex justify-center items-center h-[calc(100vh-12rem)]">
                <p className="text-red-400">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-0 md:max-w-7xl mx-auto">
            {links.length === 0 ? (
                <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
                    <p className="text-white/50">No links yet. Create your first link!</p>
                </div>
            ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {links.map((link) => (
                        <li key={link.id} className="relative flex flex-col gap-3">
                            <Link 
                                href={`/link/${link.id}`}
                                className="group relative aspect-square overflow-hidden rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                {link.coverPhotoS3Url ? (
                                    <img
                                        src={link.coverPhotoS3Url}
                                        alt={`Cover for ${link.url}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            console.error("Failed to load cover image:", link.coverPhotoS3Url);
                                            e.currentTarget.style.display = 'none';
                                        }}
                                        onLoad={() => {
                                            console.log("Successfully loaded cover image:", link.coverPhotoS3Url);
                                        }}
                                    />
                                ) : (
                                    <NoPreview message="No cover" coverColor={link.coverColor} />
                                )}
                                <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                    <div className="flex flex-col">
                                        <h3 className="text-white font-semibold truncate drop-shadow-lg">
                                            {link.name}
                                        </h3>
                                        <p className="text-white/70 text-sm font-semibold drop-shadow-lg">
                                            ${Number(link.price).toFixed(2)}
                                        </p>
                                    </div>
                                    <p className="text-white/70 text-xs font-semibold drop-shadow-lg">
                                        {link.fileCount} file{link.fileCount !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
