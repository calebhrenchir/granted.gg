"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandInput, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Link2, Users, DollarSign, BarChart3, Settings, LogOut, LogOutIcon, X, Globe, Command, Dock, CornerDownRight, CornerUpRight, Minus, CornerRightDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function AdminSidebarLink({ href, children, external }: { href: string, children: React.ReactNode, external?: boolean}) {
    const pathname = usePathname();
    const isActive = pathname === href || pathname === `${href}/`;
    return (
        <Link href={href} target={external ? "_blank" : "_self"} className={cn(
            "flex flex-row items-center gap-2 px-4 py-3 rounded-sm transition-colors duration-300 ease-in-out w-full",
            isActive ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
        )}>
            {children}
        </Link>
    )
}

function AdminSidebarLinkDropdown({ href, children }: { href: string, children: React.ReactNode }) {
    const pathname = usePathname();
    // Check if pathname starts with href (with or without trailing slash)
    const isActive = pathname === href || pathname.startsWith(`${href}/`);

    return (
        <>
            <Link href={href} className={cn(
                "flex flex-row items-center gap-2 px-4 py-3 rounded-sm transition-colors duration-300 ease-in-out w-full",
                pathname === href ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
            )}>
                {children}
            </Link>
            {isActive && (
                <div className="flex flex-col gap-1">
                    <Link href={`${href}/insights`} className="relative flex flex-row items-center gap-2 px-4 py-1 rounded-sm transition-colors duration-300 ease-in-out w-full text-white/50 hover:text-white hover:bg-white/5 cursor-pointer">
                        {pathname.startsWith(`${href}/insights`) ? <CornerDownRight className="size-4" /> : null}
                        <span className="text-sm font-semibold">Insights</span>
                    </Link>
                    <Link href={`${href}/policies`} className="relative flex flex-row items-center gap-2 px-4 py-1 rounded-sm transition-colors duration-300 ease-in-out w-full text-white/50 hover:text-white hover:bg-white/5 cursor-pointer">
                        {pathname.startsWith(`${href}/policies`) ? <CornerDownRight className="size-4" /> : null}
                            <span className="text-sm font-semibold">Policies</span>
                    </Link>
                    <Link href={`${href}/blog-posts`} className="relative flex flex-row items-center gap-2 px-4 py-1 rounded-sm transition-colors duration-300 ease-in-out w-full text-white/50 hover:text-white hover:bg-white/5 cursor-pointer">
                        {pathname.startsWith(`${href}/blog-posts`) ? <CornerDownRight className="size-4" /> : null}
                            <span className="text-sm font-semibold">Blog Posts</span>
                    </Link>
                </div>
            )}
        </>
    )
}

export default function AdminSidebar({
    sidebarOpen,
    commandOpen,
    setCommandOpen,
    onClose
}: {
    sidebarOpen: boolean;
    commandOpen: boolean;
    setCommandOpen: (open: boolean) => void;
    onClose: () => void;
}) {
    return (
        <>
            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

            <aside className={cn(
                "fixed lg:static inset-y-0 left-0 z-50 w-[240px] bg-black border-r border-r-white/10 transition-transform duration-300 ease-in-out flex flex-col",
                sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="hidden p-4 md:flex items-center justify-between border-b border-b-white/10">
                    <AdminSidebarLink href="/admin">
                        <LayoutDashboard className="size-4" />
                        <span className="text-sm font-semibold">Dashboard</span>
                    </AdminSidebarLink>
                </div>
                <div className="p-4 flex flex-col item-center gap-1">
                    <div className="block md:hidden">
                        <AdminSidebarLink href="/admin">
                            <LayoutDashboard className="size-4" />
                            <span className="text-sm font-semibold">Dashboard</span>
                        </AdminSidebarLink>
                    </div>
                    <AdminSidebarLink href="/admin/users">
                        <Users className="size-4" />
                        <span className="text-sm font-semibold">Users</span>
                    </AdminSidebarLink>
                    <AdminSidebarLink href="/admin/links">
                        <Link2 className="size-4" />
                        <span className="text-sm font-semibold">Links</span>
                    </AdminSidebarLink>
                    <AdminSidebarLink href="/admin/sales">
                        <DollarSign className="size-4" />
                        <span className="text-sm font-semibold">Sales</span>
                    </AdminSidebarLink>
                    <AdminSidebarLink href="/admin/analytics">
                        <BarChart3 className="size-4" />
                        <span className="text-sm font-semibold">Analytics</span>
                    </AdminSidebarLink>
                    <AdminSidebarLinkDropdown href="/admin/settings">
                        <Settings className="size-4" />
                        <span className="text-sm font-semibold">Settings</span>
                    </AdminSidebarLinkDropdown>
                </div>

                <div className="p-4 flex flex-col items-center justify-between mt-auto border-t border-t-white/10">
                    <button className={cn(
                        "flex flex-row justify-around items-center gap-2 py-3 rounded-sm transition-colors duration-300 ease-in-out w-full",
                        "text-white/50 hover:text-white hover:bg-white/5 cursor-pointer"
                    )} onClick={() => setCommandOpen(true)}>
                        <div className="flex flex-row gap-2">
                            <Dock className="size-4" />
                            <span className="text-sm font-semibold">Quick Menu</span>
                        </div>

                        <kbd className="bg-white/10 text-white pointer-events-none inline-flex h-5 items-center gap-1 rounded border border-white/10 px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
                            <span className="text-xs">⌘</span>J
                        </kbd>
                    </button>
                    <AdminSidebarLink href="https://granted.gg" external>
                        <Globe className="size-4" />
                        <span className="text-sm font-semibold">View Site</span>
                    </AdminSidebarLink>
                    <button className="flex flex-row items-center gap-2 px-4 py-3 rounded-sm transition-colors duration-300 ease-in-out w-full text-white/50 hover:text-white hover:bg-white/5 cursor-pointer" onClick={() => signOut()}>
                        <LogOutIcon className="size-4" />
                        <span className="text-sm font-semibold">Sign out</span>
                    </button>
                </div>
            </aside>
        </>
    )
}