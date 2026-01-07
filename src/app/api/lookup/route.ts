import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { render } from "@react-email/render";
import LookupPurchasesEmail from "@/emails/lookup-purchases";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Find all purchase activities for this email
    const purchases = await prisma.activity.findMany({
      where: {
        type: "purchase",
        customerEmail: email.toLowerCase().trim(),
      },
      include: {
        link: {
          select: {
            id: true,
            url: true,
            name: true,
            price: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // If no purchases found, return error
    if (purchases.length === 0) {
      return NextResponse.json(
        { error: "No purchases have been made with that email" },
        { status: 404 }
      );
    }

    // Group purchases by link and get unique links
    const uniqueLinks = purchases
      .map((purchase) => purchase.link)
      .filter((link, index, self) => 
        index === self.findIndex((l) => l.id === link.id)
      );

    // Send email with purchase links
    if (process.env.RESEND_API_KEY) {
      try {
        const emailHtml = await render(
          LookupPurchasesEmail({
            email,
            purchases: uniqueLinks.map((link) => ({
              url: link.url,
              name: link.name || link.url,
              price: Number(link.price),
              purchasedAt: purchases.find((p) => p.linkId === link.id)?.createdAt || link.createdAt,
            })),
          })
        );

        const { data, error } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Granted <no-reply@granted.gg>",
          to: email,
          subject: `Your Purchase History - ${uniqueLinks.length} Link${uniqueLinks.length !== 1 ? 's' : ''}`,
          html: emailHtml,
        });

        if (error) {
          console.error("Error sending lookup email:", error);
          return NextResponse.json(
            { error: "Failed to send email" },
            { status: 500 }
          );
        }

        console.log(`Lookup email sent to ${email}`, data?.id);
      } catch (emailError) {
        console.error("Error sending lookup email:", emailError);
        return NextResponse.json(
          { error: "Failed to send email" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Email sent",
      purchaseCount: uniqueLinks.length,
    });
  } catch (error) {
    console.error("Error in lookup:", error);
    return NextResponse.json(
      { error: "Failed to process lookup request" },
      { status: 500 }
    );
  }
}

