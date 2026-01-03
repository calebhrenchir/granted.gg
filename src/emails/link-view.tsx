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

interface LinkViewEmailProps {
    linkUrl: string;
    linkName?: string;
}

export const LinkViewEmail = ({
    linkUrl,
    linkName,
}: LinkViewEmailProps) => {
    const fullUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/p/${linkUrl}`;

    return (
        <Html>
            <Head />
            <Preview>Someone viewed your link</Preview>
            <Tailwind>
                <Body className="bg-black font-sans">
                    <Container className="bg-black mx-auto py-5 pb-12 mb-16">
                        <Heading className="text-white text-2xl font-bold my-10 p-0">
                            Your Link Was Viewed!
                        </Heading>
                        <Text className="text-white text-base leading-relaxed my-4">
                            Great news! Someone just viewed your link:
                        </Text>
                        <Section className="py-7">
                            <Text className="text-white text-lg font-semibold my-4">
                                {linkName || linkUrl}
                            </Text>
                            <Link
                                href={fullUrl}
                                className="bg-white rounded-lg text-black text-base font-bold no-underline text-center block px-6 py-3"
                            >
                                View Your Link
                            </Link>
                        </Section>
                        <Text className="text-gray-500 text-xs leading-6 mt-8">
                            Keep creating great content to attract more viewers!
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default LinkViewEmail;

