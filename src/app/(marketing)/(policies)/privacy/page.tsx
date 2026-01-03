import { constructMetadata } from "@/lib/construct-metadata";
import { prisma } from "@/lib/prisma";

export const metadata = constructMetadata({
    title: "Privacy Policy"
});

export default async function PrivacyPage() {
    const policy = await prisma.policy.findUnique({
        where: { type: "privacy" },
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
                    <h1 className="text-2xl sm:text-4xl font-semibold text-white">Privacy Policy</h1>
                    <p className="text-white/50 font-medium text-sm">
                        This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from https://granted.gg (the "Site").
                    </p>
                    <p className="text-white/50 font-medium text-sm">
                        Last updated: {lastUpdated}
                    </p>
                </div>
            )}
        </div>
    );
}