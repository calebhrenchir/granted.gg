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

interface PurchaseLinkEmailProps {
    linkUrl: string;
    linkName?: string;
}

export const PurchaseLinkEmail = ({
    linkUrl,
    linkName,
}: PurchaseLinkEmailProps) => {
    const fullUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/${linkUrl}`;

    return (
        <Html>
            <Head />
            <Preview>Access your purchased content</Preview>
            <Tailwind>
                <Body className="bg-black font-sans">
                    <Container className="bg-black mx-auto py-5 pb-12 mb-16">
                        <Heading className="text-white text-2xl font-bold my-10 p-0">
                            Your Purchase is Ready!
                        </Heading>
                        <Text className="text-white text-base leading-relaxed my-4">
                            Thank you for your purchase. You can access your content using the link below:
                        </Text>
                        <Section className="py-7">
                            <Link
                                href={fullUrl}
                                className="bg-white rounded-lg text-black text-base font-bold no-underline text-center block px-6 py-3"
                            >
                                Access Your Content
                            </Link>
                        </Section>
                        <Text className="text-white text-base leading-relaxed my-4">
                            Or copy and paste this URL into your browser:
                        </Text>
                        <Text className="text-white text-sm break-all bg-neutral-900 p-3 rounded my-4">
                            {fullUrl}
                        </Text>
                        <Text className="text-gray-500 text-xs leading-6 mt-8">
                            This link will remain active for future access to your purchased content.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default PurchaseLinkEmail;

