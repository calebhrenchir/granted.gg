import { constructMetadata } from "@/lib/construct-metadata";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const metadata = constructMetadata({
    title: "Purchase Content",
    description: "Purchase and unlock exclusive content. View previews, securely pay, and instantly access digital files, media, and more.",
});

export default function LinkLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <header className="sticky inset-x-0 top-0 z-5 flex items-center justify-between md:justify-center py-6 mb-4 px-4 md:px-0 md:max-w-7xl mx-auto">
                <div className="overflow-hidden pointer-events-none absolute inset-x-0 top-0 z-0 h-full w-full">
                    <div className="absolute blur-sm from-black via-black via-80% to-transparent left-[50%] top-[-20px] h-full w-[180%] -translate-x-1/2 bg-linear-to-b"></div>
                </div>

                <div className="flex w-full flex-col items-center justify-start gap-16 mb-8">
                    <div className="w-full relative z-1 flex gap-6 flex-row items-start md:gap-0 text-center justify-center md:justify-between">
                        <Link href="/" target="_blank" className={cn("transition-opacity duration-300 hover:opacity-80")}>
                            <span className="text-white font-semibold text-3xl">
                                granted.gg
                            </span>
                        </Link>
                    </div>
                </div>
            </header>

            {children}
        </>
    )
}