import { constructMetadata } from "@/lib/construct-metadata";

export const metadata = constructMetadata({
    title: "Lookup Purchases",
    description: "Lookup your previous purchases.",
});

export default function LookupLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-black text-white grid place-items-center h-screen">
            {children}
        </div>
    )
}