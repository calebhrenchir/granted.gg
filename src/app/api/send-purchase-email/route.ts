import { NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/render";
import PurchaseLinkEmail from "@/emails/purchase-link";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const { email, linkUrl, linkName } = await request.json();

        if (!email || !linkUrl) {
            return NextResponse.json(
                { error: "Email and link URL are required" },
                { status: 400 }
            );
        }

        if (!process.env.RESEND_API_KEY) {
            console.error("RESEND_API_KEY is not set");
            return NextResponse.json(
                { error: "Email service not configured" },
                { status: 500 }
            );
        }

        // Render the email template
        const emailHtml = await render(
            PurchaseLinkEmail({
                linkUrl,
                linkName,
            })
        );

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "Granted <no-reply@granted.gg>",
            to: email,
            subject: `Your Purchase Link - ${linkName || linkUrl}`,
            html: emailHtml,
        });

        if (error) {
            console.error("Error sending email:", error);
            return NextResponse.json(
                { error: "Failed to send email" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            messageId: data?.id,
        });
    } catch (error) {
        console.error("Error sending purchase email:", error);
        return NextResponse.json(
            { error: "Failed to send email" },
            { status: 500 }
        );
    }
}

