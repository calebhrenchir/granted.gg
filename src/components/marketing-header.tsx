"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function MarketingHeader() {
    const appUrl = `app.${process.env.NEXT_PUBLIC_APP_URL}/login`;

    return (
        <header className="sticky inset-x-0 top-0 z-5 flex items-start justify-between mx-auto py-10">
            <div className="overflow-hidden pointer-events-none absolute inset-x-0 top-0 z-0 h-full w-full">
                <div className="absolute blur-sm from-black via-black via-80% to-transparent left-[50%] top-[-10px] h-full w-[180%] -translate-x-1/2 bg-linear-to-b"></div>
            </div>

            <div className="flex w-full flex-col items-center justify-start gap-16 max-w-7xl mx-auto mb-8 md:mb-0">
                <div className="w-full relative z-1 flex flex-col items-center justify-center gap-6 text-center md:flex-row md:items-start md:gap-0 md:text-left md:justify-between">
                    <Link href="/" className=" transition-opacity duration-300 hover:opacity-80">
                        <div className="max-w-[400px] flex-row md:hidden text-white font-semibold text-4xl pointer-events-none">
                            Make money off your PPV content.
                        </div>
                        <span className="text-white font-semibold text-3xl hidden md:block cursor-pointer">
                            granted.gg
                        </span>
                    </Link>

                    <div className="flex shrink-0 flex-col items-center justify-center gap-44 sm:flex-row">
                        <a href={"https://app.granted.gg/login"} className="pointer-events-auto w-[140px] bg-white font-semibold rounded-full text-center py-2 transition-opacity duration-300 hover:opacity-80 ">Start Sharing</a>
                    </div>
                </div>
            </div>
        </header>
    )
}