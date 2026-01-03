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

interface LinkPurchaseEmailProps {
    linkUrl: string;
    linkName?: string;
    amount: number;
}

export const LinkPurchaseEmail = ({
    linkUrl,
    linkName,
    amount,
}: LinkPurchaseEmailProps) => {
    const fullUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/link/${linkUrl}`;
    const formattedAmount = amount.toFixed(2);

    return (
        <Html>
            <Head />
            <Preview>Someone purchased your link</Preview>
            <Tailwind>
                <Body className="bg-black font-sans">
                    <Container className="bg-black mx-auto py-5 pb-12 mb-16">
                        <Heading className="text-white text-2xl font-bold my-10 p-0">
                            Your Link Was Purchased!
                        </Heading>
                        <Text className="text-white text-base leading-relaxed my-4">
                            Great news! Someone just purchased your link:
                        </Text>
                        <Section className="py-7">
                            <Text className="text-white text-lg font-semibold my-4">
                                {linkName || linkUrl}
                            </Text>
                            <Text className="text-white text-2xl font-bold my-4">
                                ${formattedAmount}
                            </Text>
                            <Link
                                href={fullUrl}
                                className="bg-white rounded-lg text-black text-base font-bold no-underline text-center block px-6 py-3"
                            >
                                View Your Link
                            </Link>
                        </Section>
                        <Text className="text-gray-500 text-xs leading-6 mt-8">
                            Keep creating great content to earn more!
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default LinkPurchaseEmail;

