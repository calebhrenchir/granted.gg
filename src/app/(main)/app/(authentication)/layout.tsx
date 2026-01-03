import AuthenticationHeader from "@/components/authentication-header";
import MarketingHeader from "@/components/marketing-header";

export default function AuthenticationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <AuthenticationHeader />

            {children}
        </>
    );
}