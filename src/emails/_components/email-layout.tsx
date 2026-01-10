import { Body, Container, Head, Html, Img, Link, Preview, Section, Tailwind } from "@react-email/components";

export default function Layout({ preview, children }: { preview?: string; children: React.ReactNode}) {
    return (
        <Html>
            <Head />
            {preview ? <Preview>{preview}</Preview> : null}
            <Tailwind>
                <Body className="bg-black m-auto font-sans">
                    <Container className="mb-10 mx-auto p-5 max-w-[465px]">
                        <Section className="mt-10">
                            <Link href="https://granted.gg">
                                <Img
                                src={"https://granted.gg/assets/logo-white.svg"}
                                width={60}
                                height={60}
                                alt="Granted"
                                className="my-0 mx-auto"
                                />
                            </Link>
                        </Section>

                        {children}
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    )
}