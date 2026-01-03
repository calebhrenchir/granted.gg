import { constructMetadata } from "@/lib/construct-metadata";
import { prisma } from "@/lib/prisma";

export const metadata = constructMetadata({
    title: "Removal Policy"
});

export default async function RemovalPage() {
    const policy = await prisma.policy.findUnique({
        where: { type: "removal" },
    });

    const sections = policy?.sections as Array<{ title: string; description: string }> || [];
    const lastUpdated = policy?.lastUpdated 
        ? new Date(policy.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
        : "2025-12-19";

    return (
        <div className="flex flex-col gap-10 mb-10">
            {sections.length > 0 ? (
                sections.map((section, index) => (
                    <div key={index} className="flex flex-col gap-2 sm:gap-5">
                        {section.title && (
                            <h1 className="text-2xl sm:text-4xl font-semibold text-white">
                                {section.title}
                            </h1>
                        )}
                        {section.description && (
                            <p className="text-white/50 font-medium text-sm whitespace-pre-wrap">
                                {section.description}
                            </p>
                        )}
                        {index === 0 && (
                            <p className="text-white/50 font-medium text-sm">
                                Last updated: {lastUpdated}
                            </p>
                        )}
                    </div>
                ))
            ) : (
                <div className="flex flex-col gap-2 sm:gap-5">
                    <h1 className="text-2xl sm:text-4xl font-semibold text-white">Removal Policy</h1>
                    <p className="text-white/50 font-medium text-sm">
                        This Removal Policy describes how you can request the removal of your content or a seller who is violating the Terms of Service from granted.gg.
                    </p>
                    <p className="text-white/50 font-medium text-sm">
                        Last updated: {lastUpdated}
                    </p>
                </div>
            )}
        </div>
    );
}