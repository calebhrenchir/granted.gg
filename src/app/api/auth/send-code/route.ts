import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { render } from "@react-email/render";
import MagicCodeEmail from "@/emails/magic-code";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Create new verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: code,
        expires,
      },
    });

    // Check if Resend API key is set
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Render email template
    const emailHtml = await render(
      MagicCodeEmail({
        code,
      })
    );

    // Send email via Resend
    const emailResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Granted <no-reply@granted.gg>",
      to: email,
      subject: "Your login code",
      html: emailHtml,
    });

    if (emailResult.error) {
      console.error("Resend error:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send email", details: emailResult.error },
        { status: 500 }
      );
    }

    console.log("Email sent successfully:", emailResult.data);

    return NextResponse.json({ success: true, code });
  } catch (error) {
    console.error("Error sending code:", error);
    return NextResponse.json(
      { error: "Failed to send code" },
      { status: 500 }
    );
  }
}

