"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

function PolicyLayoutLink({ href, children }: { href: string, children: React.ReactNode }) {
    const pathname = usePathname();
    const isActive = pathname === href || pathname === `${href}/`;
    return (
        <div className="">
            <Link
                href={href}
                className={`transition-colors duration-300 font-semibold text-lg ${
                    isActive ? "text-white" : "text-white/50 hover:text-white"
                }`}
            >
                {children}
            </Link>
        </div>
    );
}

export default function PoliciesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-0">
            <div className="flex flex-col gap-5 sm:gap-5 px-0 pt-0 sm:grid sm:grid-cols-3">
                <nav className="sticky top-24 z-10 col-span-1 h-fit bg-transparent">
                    <div className="overflow-x-auto">
                        <div className="flex flex-row md:flex-col gap-4 md:gap-1.5">
                            <PolicyLayoutLink href="/terms">Terms</PolicyLayoutLink>
                            <PolicyLayoutLink href="/privacy">Privacy</PolicyLayoutLink>
                            <PolicyLayoutLink href="/removal">Removal</PolicyLayoutLink>
                        </div>
                    </div>
                </nav>
                <div className="grid-cols-2 col-span-2">
                    {children}
                </div>
            </div>
        </div>
    );
}