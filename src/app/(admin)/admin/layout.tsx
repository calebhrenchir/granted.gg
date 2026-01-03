"use client";

import { CommandDialog, CommandEmpty, CommandInput, CommandList, CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "./_components/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Menu, User, Link2, Mail } from "lucide-react";

interface SearchResult {
    users: Array<{
        id: string;
        name: string | null;
        email: string | null;
        firstName: string | null;
        lastName: string | null;
        image: string | null;
        displayName: string;
    }>;
    links: Array<{
        id: string;
        url: string;
        name: string | null;
        price: number;
        displayName: string;
        ownerName: string;
        user: {
            id: string;
            name: string | null;
            email: string | null;
            firstName: string | null;
            lastName: string | null;
        } | null;
    }>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [checkingAdmin, setCheckingAdmin] = useState(true);

    // Check admin status from backend
    useEffect(() => {
        async function checkAdminStatus() {
            if (status === "unauthenticated") {
                router.push("/login");
                return;
            }

            if (status === "authenticated" && session?.user?.id) {
                try {
                    setCheckingAdmin(true);
                    const response = await fetch("/api/admin/check");
                    if (response.ok) {
                        const data = await response.json();
                        console.log("[Admin Layout] Admin check response:", data);
                        setIsAdmin(data.isAdmin);
                        if (!data.isAdmin) {
                            console.log("[Admin Layout] User is not admin, redirecting to home");
                            router.push("/home");
                        }
                    } else {
                        console.log("[Admin Layout] Admin check failed with status:", response.status);
                        setIsAdmin(false);
                        router.push("/home");
                    }
                } catch (error) {
                    console.error("Error checking admin status:", error);
                    setIsAdmin(false);
                    router.push("/home");
                } finally {
                    setCheckingAdmin(false);
                }
            }
        }

        checkAdminStatus();
    }, [status, session, router]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
          if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            setCommandOpen((open) => !open)
          }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    // Debounced search
    useEffect(() => {
        if (!commandOpen || !isAdmin) {
            setSearchQuery("");
            setSearchResults(null);
            return;
        }

        const timeoutId = setTimeout(async () => {
            if (searchQuery.length < 2) {
                setSearchResults(null);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                const response = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    setSearchResults(data);
                } else {
                    setSearchResults(null);
                }
            } catch (error) {
                console.error("Error searching:", error);
                setSearchResults(null);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, commandOpen, isAdmin]);

    const handleUserClick = useCallback((userId: string) => {
        setCommandOpen(false);
        router.push(`/admin/users?userId=${userId}`);
    }, [router]);

    const handleLinkClick = useCallback((linkId: string) => {
        setCommandOpen(false);
        router.push(`/admin/links?linkId=${linkId}`);
    }, [router]);

    // Show loading state while checking admin status
    if (status === "loading" || checkingAdmin || isAdmin === null) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-white/50">Loading...</p>
            </div>
        );
    }

    // Don't render if not admin (redirect will happen)
    if (isAdmin === false) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-red-400">Access Denied: Admin privileges required</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-black text-white overflow-y-hidden">
            <AdminSidebar sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} commandOpen={commandOpen} setCommandOpen={setCommandOpen} /> 

            <main className="flex-1 overflow-y-scroll">
                <div className="lg:hidden sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-[#1f1f1f] p-4 flex items-center gap-3">
                    <button className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
                        <Menu className="h-4 w-4" />
                    </button>
                    <h1 className="text-lg font-semibold">Dashboard</h1>
                </div>

                {children}

                <CommandDialog
                    open={commandOpen}
                    onOpenChange={setCommandOpen}
                >
                    <CommandInput 
                        placeholder="Search users and links..." 
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        {isSearching && searchQuery.length >= 2 ? (
                            <div className="py-6 text-center text-sm text-white/50">
                                Searching...
                            </div>
                        ) : searchQuery.length < 2 ? (
                            <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
                        ) : searchResults && (searchResults.users.length === 0 && searchResults.links.length === 0) ? (
                            <CommandEmpty>No results found.</CommandEmpty>
                        ) : (
                            <>
                                {searchResults && searchResults.users.length > 0 && (
                                    <CommandGroup heading="Users">
                                        {searchResults.users.map((user) => (
                                            <CommandItem
                                                key={user.id}
                                                onSelect={() => handleUserClick(user.id)}
                                                className="cursor-pointer"
                                            >
                                                <User className="mr-2 h-4 w-4" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{user.displayName}</span>
                                                    {user.email && (
                                                        <span className="text-xs text-white/50 flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {user.email}
                                                        </span>
                                                    )}
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                                
                                {searchResults && searchResults.users.length > 0 && searchResults.links.length > 0 && (
                                    <CommandSeparator />
                                )}

                                {searchResults && searchResults.links.length > 0 && (
                                    <CommandGroup heading="Links">
                                        {searchResults.links.map((link) => (
                                            <CommandItem
                                                key={link.id}
                                                onSelect={() => handleLinkClick(link.id)}
                                                className="cursor-pointer"
                                            >
                                                <Link2 className="mr-2 h-4 w-4" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{link.displayName}</span>
                                                    <span className="text-xs text-white/50">
                                                        {link.ownerName} • ${link.price.toFixed(2)}
                                                    </span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </>
                        )}
                    </CommandList>
                </CommandDialog>
            </main>
        </div>
    );
}