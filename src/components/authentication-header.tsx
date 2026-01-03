import Link from "next/link";

export default function AuthenticationHeader() {
    return (
        <header className="sticky inset-x-0 top-0 z-5 flex items-start justify-between mx-auto py-10">
            <div className="overflow-hidden pointer-events-none absolute inset-x-0 top-0 z-0 h-full w-full">
                <div className="absolute blur-sm from-black via-black via-80% to-transparent left-[50%] top-[-10px] h-full w-[180%] -translate-x-1/2 bg-linear-to-b"></div>
            </div>

            <div className="flex w-full flex-col items-center justify-start gap-16 max-w-7xl mx-auto mb-8 md:mb-0">
                <div className="w-full relative z-1 flex flex-col items-center justify-center gap-6 text-center md:flex-row md:items-start md:gap-0 md:text-left md:justify-between">
                    <Link href="/" className="pointer-events-none transition-opacity duration-300 hover:opacity-80">
                        <span className="text-white font-semibold text-3xl">
                           granted.gg
                        </span>
                    </Link>
                </div>
            </div>
        </header>
    )
}