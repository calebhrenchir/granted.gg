import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Text,
    Tailwind,
} from "@react-email/components";
import * as React from "react";

interface Purchase {
    url: string;
    name: string;
    price: number;
    purchasedAt: Date;
}

interface LookupPurchasesEmailProps {
    email: string;
    purchases: Purchase[];
}

export const LookupPurchasesEmail = ({
    email,
    purchases,
}: LookupPurchasesEmailProps) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    return (
        <Html>
            <Head />
            <Preview>Your purchase history from Granted.gg</Preview>
            <Tailwind>
                <Body className="bg-black font-sans">
                    <Container className="bg-black mx-auto py-5 pb-12 mb-16">
                        <Heading className="text-white text-2xl font-bold my-10 p-0">
                            Your Purchase History
                        </Heading>
                        <Text className="text-white text-base leading-relaxed my-4">
                            Here are all the links you've purchased:
                        </Text>

                        {purchases.length === 0 ? (
                            <Section className="py-7">
                                <Text className="text-white/70 text-base leading-relaxed my-4">
                                    We couldn't find any purchases associated with this email address.
                                </Text>
                                <Text className="text-white/70 text-base leading-relaxed my-4">
                                    If you believe this is an error, please contact support at{" "}
                                    <Link href="mailto:support@granted.gg" className="text-white underline">
                                        support@granted.gg
                                    </Link>
                                </Text>
                            </Section>
                        ) : (
                            <Section className="py-7">
                                {purchases.map((purchase, index) => (
                                    <Section key={purchase.url} className="mb-6 pb-6 border-b border-white/10 last:border-b-0">
                                        <Text className="text-white text-lg font-semibold my-2">
                                            {purchase.name}
                                        </Text>
                                        <Text className="text-white/70 text-sm my-2">
                                            Purchased: ${purchase.price.toFixed(2)}
                                        </Text>
                                        <Link
                                            href={`${baseUrl}/${purchase.url}`}
                                            className="bg-white rounded-lg text-black text-base font-bold no-underline text-center inline-block px-6 py-3 my-4"
                                        >
                                            Access Content
                                        </Link>
                                        <Text className="text-white/50 text-xs break-all bg-neutral-900 p-3 rounded my-2">
                                            {baseUrl}/{purchase.url}
                                        </Text>
                                    </Section>
                                ))}
                            </Section>
                        )}

                        <Text className="text-gray-500 text-xs leading-6 mt-8">
                            If you have any questions about your purchases, please contact us at{" "}
                            <Link href="mailto:support@granted.gg" className="text-gray-400 underline">
                                support@granted.gg
                            </Link>
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default LookupPurchasesEmail;

