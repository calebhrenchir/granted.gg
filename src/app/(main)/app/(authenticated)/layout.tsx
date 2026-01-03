"use client";

import LinkDeleteModal from "@/components/modal/link-delete";
import LinkQRModal from "@/components/modal/link-qr";
import LinkSettingsModal from "@/components/modal/link-settings";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Uploader } from "@/components/uploader";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, Copy, Delete, Ellipsis, Folder, Link2, Paperclip, QrCode, Settings, Trash, User, Wallet } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const isHome = pathname === "/home";
    const [linkSettingsOpen, setLinkSettingsOpen] = useState(false);
    const [linkQROpen, setLinkQROpen] = useState(false);
    const [linkDeleteOpen, setLinkDeleteOpen] = useState(false);

    return (
        <>
            <header className="sticky inset-x-0 top-0 z-5 flex items-start justify-between py-10 px-4 md:px-0 md:max-w-7xl mx-auto">
                <div className="overflow-hidden pointer-events-none absolute inset-x-0 top-0 z-0 h-full w-full">
                    <div className="absolute blur-sm from-black via-black via-80% to-transparent left-[50%] top-[-20px] h-full w-[180%] -translate-x-1/2 bg-linear-to-b"></div>
                </div>

                <div className="flex w-full flex-col items-center justify-start gap-16 mb-4">
                    <div className="w-full relative z-1 flex gap-6 flex-row tems-start md:gap-0 text-left justify-between">
                        {isHome ? (
                            <Link href="#" className={cn("transition-opacity duration-300 hover:opacity-80", isHome && "pointer-events-none")}>
                                <span className="text-white font-semibold text-3xl">
                                    granted.gg
                                </span>
                            </Link>
                        ) : (
                            <Link href={
                                pathname.startsWith("/link/") ? "/links" : pathname === "/profile" ? "/home" : pathname.startsWith("/profile") ? "/profile" : "/home"
                            } className="p-3 bg-neutral-800 duration-300 transition-opacity  hover:opacity-80 rounded-xl text-white">
                                <ChevronLeft className="h-5 w-5" />
                            </Link>
                        )}

                        {pathname !== "/onboarding" && (
                        <div className="absolute left-1/2 -translate-x-1/2 p-3 flex flex-row gap-2 items-center justify-center bg-neutral-800 rounded-lg font-semibold text-sm">
                            <span className="text-white/50">
                                {isHome ? "new link" 
                                : pathname === "/links" ? "all links"
                                : pathname === "/profile" ? "profile" 
                                : pathname.startsWith("/link/") ? "link details"
                                : pathname === "/wallet" ? "wallet"
                                : pathname === "/profile/login-method" ? "login method"
                                : pathname === "/profile/personal-identity" ? "personal identity"
                                : pathname === "/profile/banking-information" ? "banking information"
                                : pathname === "/profile/notifications" ? "notifications"
                                : pathname === "/profile/feedback" ? "feedback"
                                : pathname === "/profile/refer-and-earn" ? "refer and earn"
                                : ""}
                            </span>
                        </div>
                        )}

                        <div className="flex items-center justify-center gap-2 flex-row">
                            {pathname !== "/profile" && pathname !== "/links" && pathname === "/home" && (
                                <>
                                <Link href="/links" className="p-3 bg-neutral-800 transition-opacity duration-300 hover:opacity-80 rounded-xl text-white">
                                    <Paperclip className="h-5 w-5" />
                                </Link>
                                </>
                            )}
                            {pathname !== "/profile" && pathname !== "/links" && pathname !== "/wallet" && pathname === "/home" && (
                                <>
                                <Link href="/wallet" className="p-3 bg-neutral-800 transition-opacity duration-300 hover:opacity-80 rounded-xl text-white">
                                    <Wallet className="h-5 w-5" />
                                </Link>
                                </>
                            )}
                            {pathname !== "/profile" && pathname !== "/links" && pathname === "/home" && (
                                <>
                                    <Link href="/profile" className="p-3 bg-neutral-800 transition-opacity duration-300 hover:opacity-80 rounded-xl text-white">
                                        <User className="h-5 w-5" />
                                    </Link>
                                </>
                            )}

                            {pathname.startsWith("/link/") && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-3 bg-neutral-800 transition-opacity duration-300 hover:opacity-80 rounded-xl text-white">
                                            <Ellipsis className="h-5 w-5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="min-w-50 mt-1.5 bg-neutral-800 border-neutral-700" align="end">
                                        <DropdownMenuItem onClick={() => setLinkSettingsOpen(true)} className="flex-row gap-2 font-semibold text-white hover:!bg-neutral-700 hover:!text-white">
                                            <Settings className="h-3 w-3 text-white" />
                                            Settings
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setLinkQROpen(true)} className="flex-row gap-2 font-semibold text-white hover:!bg-neutral-700 hover:!text-white">
                                            <QrCode className="h-3 w-3 text-white" />
                                            View QR Code
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setLinkDeleteOpen(true)} className="flex-row gap-2 font-semibold text-red-400 hover:!bg-neutral-700 hover:!text-red-400">
                                            <Trash className="h-3 w-3 text-red-400" />
                                            Delete Link
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {pathname.startsWith("/file") && (
                                <div className="flex flex-row gap-2">
                                    <Link href="#" className="p-3 bg-neutral-800 transition-opacity duration-300 hover:opacity-80 rounded-xl text-white">
                                        <Link2 className="h-5 w-5" />
                                    </Link>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Link href="/profile" className="p-3 bg-neutral-800 transition-opacity duration-300 hover:opacity-80 rounded-xl text-white">
                                                <Ellipsis className="h-5 w-5" />
                                            </Link>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="mt-2" align="end">
                                            <DropdownMenuItem className="flex flex-row gap-2 px-3.5">
                                                <Copy className="h-2 w-2" />
                                                Duplicate file
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="flex flex-row gap-2 px-3.5">
                                                <Folder className="h-2 w-2" />
                                                Move file
                                            </DropdownMenuItem>
                                            <DropdownMenuItem variant={"destructive"} className="flex flex-row gap-2 px-3.5">
                                                <Trash className="h-2 w-2" />
                                                Delete file
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}

                            {pathname.startsWith("/profile") && (
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Link href="#" className="p-3 bg-neutral-800 transition-opacity duration-300 hover:opacity-80 rounded-xl text-white">
                                        <Ellipsis className="h-5 w-5" />
                                    </Link>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="min-w-50 mt-1.5 bg-neutral-800 border-neutral-700" align="end">
                                    <DropdownMenuItem onClick={() => signOut()} className="flex-row gap-2 font-semibold text-white hover:!bg-neutral-700 hover:!text-white">Sign out</DropdownMenuItem>
                                    <DropdownMenuItem variant="destructive" className="flex-row gap-2 font-semibold">Delete account</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {children}

            {pathname.startsWith("/link/") && <LinkSettingsModal 
                linkId={pathname.split("/")[2]}
                open={linkSettingsOpen}
                onOpenChange={setLinkSettingsOpen}
            />}
            {pathname.startsWith("/link/") && <LinkQRModal 
                linkId={pathname.split("/")[2]}
                open={linkQROpen}
                onOpenChange={setLinkQROpen}
            />}
            {pathname.startsWith("/link/") && <LinkDeleteModal
                linkId={pathname.split("/")[2]}
                open={linkDeleteOpen}
                onOpenChange={setLinkDeleteOpen}
            />}
        </>
    )
}