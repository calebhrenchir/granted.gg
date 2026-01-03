import { NextResponse } from "next/server";
import { stripe, calculatePriceWithFee, dollarsToCents } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { linkId, email } = await request.json();

    if (!linkId) {
      return NextResponse.json(
        { error: "Link ID is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Fetch the link with user to get platform fee
    const link = await prisma.link.findUnique({
      where: { id: linkId },
      include: {
        user: {
          select: {
            platformFee: true,
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    // Get platform fee from user (default to 20% if not set)
    const platformFeePercent = link.user?.platformFee ? Number(link.user.platformFee) : 20;

    // Convert price to cents and add buyer fee (half of platform fee)
    const basePriceInCents = dollarsToCents(Number(link.price));
    const totalPriceInCents = calculatePriceWithFee(basePriceInCents, platformFeePercent);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: [
        "card",
        "link",
      ],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: link.name || `Link ${link.url}`,
              description: "Unlock access to this content",
            },
            unit_amount: totalPriceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/${link.url}?session_id={CHECKOUT_SESSION_ID}&purchased=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/${link.url}`,
      customer_email: email,
      metadata: {
        linkId: link.id,
        linkUrl: link.url,
        linkName: link.name || link.url,
        customerEmail: email,
        basePriceInCents: basePriceInCents.toString(),
        totalPriceInCents: totalPriceInCents.toString(),
        platformFeePercent: platformFeePercent.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
