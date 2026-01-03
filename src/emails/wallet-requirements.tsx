import { Heading, Text, Link as EmailLink, Section } from "@react-email/components";
import EmailLayout from "./_components/email-layout";

interface WalletRequirementsEmailProps {
    firstName?: string;
    missingRequirements: string[];
}

export default function WalletRequirementsEmail({
    firstName,
    missingRequirements,
}: WalletRequirementsEmailProps) {
    const walletUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://app.localhost:3000"}/wallet`;

    return (
        <EmailLayout preview="Action Required: Complete Your Wallet Setup">
            <Heading className="text-2xl text-white font-medium text-center p-0 my-8 mx-0">
                Action Required: Complete Your Wallet Setup
            </Heading>

            <Text className="text-start text-md text-white">
                Hello {firstName || "User"},
            </Text>

            <Text className="text-white text-md leading-relaxed my-4">
                To enable withdrawals from your wallet, we need to collect some information required by our payment processor for tax and compliance purposes.
            </Text>

            <Text className="text-white text-md leading-relaxed my-4">
                Please visit your wallet settings to complete this information. We handle all payment processing on your behalf, so this is just for payout purposes.
            </Text>

            <Section className="py-7">
                <EmailLink
                    href={walletUrl}
                    className="bg-white rounded-lg text-black text-base font-bold no-underline text-center block px-6 py-3"
                >
                    Go to Wallet Settings
                </EmailLink>
            </Section>

            <Text className="text-start text-md text-white mt-4">
                Cheers,
                <br />
                The Granted.gg Team
            </Text>
        </EmailLayout>
    );
}

