import { Analytics } from "@vercel/analytics/next"
import MarketingHeader from "@/components/marketing-header";
import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <>
        <MarketingHeader />

        {children}

        <footer className="border-t border-white/5 px-4 md:px-0 py-6 pt-6 pb-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8">
                        <span className="text-white font-semibold text-3xl">
                        granted.gg
                        </span>
                        <div className="flex flex-col md:flex-row gap-4 md:gap-10">
                            <Link href="https://lookup.granted.gg/" className="text-white/50 text-sm hover:text-white transition-colors duration-300 font-semibold">Lookup Purchases</Link>
                            <Link href="/updates" className="text-white/50 text-sm hover:text-white transition-colors duration-300 font-semibold">Updates</Link>
                            <Link href="/terms" className="text-white/50 text-sm hover:text-white transition-colors duration-300 font-semibold">Terms</Link>
                            <Link href="/privacy" className="text-white/50 text-sm hover:text-white transition-colors duration-300 font-semibold">Privacy</Link>
                            <Link href="/removal" className="text-white/50 text-sm hover:text-white transition-colors duration-300 font-semibold">Removals</Link>
                        </div>
                    </div>
                </div>
            </footer>

            {isProduction && <Analytics />}
    </>
  )
}