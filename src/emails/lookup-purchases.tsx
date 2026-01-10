import { Body, Head, Heading, Html, Link, Preview, Row, Column, Section, Tailwind, Text, Img } from "@react-email/components";
import Layout from "./_components/email-layout";

interface Purchase {
    url: string;
    name: string;
    price: number;
    purchasedAt: Date;
    image: string; // BLURREDS3KEY
}

export default function LookupPurchasesEmail({
    email,
    purchases,
}: {
    email?: string,
    purchases?: Purchase[]
}) {
    return (
        <Layout>
            <Heading className="text-2xl text-white font-medium text-center p-0 my-8 mx-0">Your purchase history from Granted.gg</Heading>

            {purchases?.length === 0 ? (
                <>
                    <Text className="text-white/70 text-base leading-relaxed my-4">
                        We couldn't find any purchases associated with this email address.
                    </Text>
                    <Text className="text-white/70 text-base leading-relaxed my-4">
                        If you believe this is an error, please contact support at{" "}
                        <Link href="mailto:support@granted.gg" className="text-white underline">
                            support@granted.gg
                        </Link>
                    </Text>
                </>
            ) : (
                <Section>
                    {Array.from({ length: Math.ceil((purchases?.length || 0) / 2) }).map((_, rowIndex) => {
                        const purchase1 = purchases?.[rowIndex * 2];
                        const purchase2 = purchases?.[rowIndex * 2 + 1];
                        
                        if (!purchase1) return null;
                        
                        return (
                            <Row key={rowIndex} className="mb-6">
                                <Column className="pr-3 items-center mx-auto w-1/2">
                                    <Link href={purchase1.url} className="">
                                        <Img
                                            src={purchase1.image}
                                            alt={purchase1.name}
                                            width={200}
                                            height={200}
                                            className="mb-2"
                                        />
                                        <Row>
                                            <Column style={{ width: "70%" }}>
                                                <Text className="text-white text-md font-semibold m-0">{purchase1.name}</Text>
                                            </Column>
                                            <Column style={{ width: "30%" }}>
                                                <Text className="text-white text-md font-semibold m-0 text-right">${purchase1.price.toFixed(2)}</Text>
                                            </Column>
                                        </Row>
                                    </Link>
                                </Column>
                                <Column className="pl-3 w-1/2">
                                    {purchase2 ? (
                                        <Link href={purchase2.url} className="">
                                            <Img
                                                src={purchase2.image}
                                                alt={purchase2.name}
                                                width={200}
                                                height={200}
                                                className="mb-2"
                                            />
                                            <Row>
                                                <Column style={{ width: "70%" }}>
                                                    <Text className="text-white text-md font-semibold m-0">{purchase2.name}</Text>
                                                </Column>
                                                <Column style={{ width: "30%" }}>
                                                    <Text className="text-white text-md font-semibold m-0 text-right">${purchase2.price.toFixed(2)}</Text>
                                                </Column>
                                            </Row>
                                        </Link>
                                    ) : null}
                                </Column>
                            </Row>
                        );
                    })}
                </Section>
            )}

            <Text className="text-start text-md text-white mt-4">
                Cheers,
                <br />
                The Granted.gg Team
            </Text>
        </Layout>
    )
}