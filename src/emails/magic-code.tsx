import { Heading, Link, Section, Text } from "@react-email/components";
import Layout  from "@/emails/_components/email-layout";

export default function MagicCodeEmail({
    code,
}: {
    code?: string;
}) {
    return (
        <Layout>
            <Text className="text-white text-md leading-relaxed my-4">
                Your login code is below - enter it in your open browser window and we'll get you signed in.
            </Text>

            <Section className="bg-[rgb(40,40,40)] rounded mb-[30px] py-4 px-4">
                <Text className="text-3xl leading-[24px] text-center align-middle text-white font-semibold tracking-widest">
                    {code}
                </Text>
            </Section>

            <Text className="text-white text-md leading-relaxed my-2 -mt-2">
                If you didn't request this email, there's nothing to worry about, you can safely ignore it.
            </Text>

            <Text className="text-start text-md text-white mt-4">
                Cheers,
                <br />
                The Granted.gg Team
            </Text>
        </Layout>
    )
}