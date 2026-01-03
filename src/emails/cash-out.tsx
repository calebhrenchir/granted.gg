import { Heading, Text } from "@react-email/components";
import EmailLayout  from "./_components/email-layout";

export default function CashOutEmail({
    name, amount, payoutDuration
}: {
    name?: string;
    amount?: number;
    payoutDuration?: string;
}) {
    return (
        <EmailLayout>
            <Heading className="text-2xl text-white font-medium text-center p-0 my-8 mx-0">Cash Out Successful!</Heading>

            <Text className="text-start text-md text-white">
                Hello {name || "User"},
            </Text>

            <Text className="text-white text-md leading-relaxed my-4">
                Your funds have been successfully transferred to your bank account.
            </Text>

            <Text className="text-white text-md font-semibold my-4">
                ${amount?.toFixed(2) || "0.00"}
            </Text>

            <Text className="text-start text-md text-white mt-4">
                You will receive your funds in {payoutDuration || "1-3 business days"}.
            </Text>

            <Text className="text-start text-md text-white mt-4">
                Cheers,
                <br />
                The Granted.gg Team
            </Text>
        </EmailLayout>
    )
}