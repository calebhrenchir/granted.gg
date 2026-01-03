import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user's verification status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        isIdentityVerified: true,
        stripeVerificationSessionId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // If already verified, return verified status
    if (user.isIdentityVerified) {
      return NextResponse.json({
        isVerified: true,
        status: "verified",
      });
    }

    // If there's a verification session, check its status
    if (user.stripeVerificationSessionId) {
      try {
        const verificationSession = await stripe.identity.verificationSessions.retrieve(
          user.stripeVerificationSessionId
        );

        if (verificationSession.status === "verified") {
          // Update user's verification status
          await prisma.user.update({
            where: { id: session.user.id },
            data: { isIdentityVerified: true },
          });

          return NextResponse.json({
            isVerified: true,
            status: "verified",
          });
        } else if (verificationSession.status === "requires_input") {
          return NextResponse.json({
            isVerified: false,
            status: "requires_input",
          });
        } else {
          return NextResponse.json({
            isVerified: false,
            status: verificationSession.status || "pending",
          });
        }
      } catch (error) {
        console.error("Error checking verification session:", error);
        return NextResponse.json({
          isVerified: false,
          status: "pending",
        });
      }
    }

    // No verification session yet
    return NextResponse.json({
      isVerified: false,
      status: "pending",
    });
  } catch (error) {
    console.error("Error checking verification status:", error);
    return NextResponse.json(
      { error: "Failed to check verification status" },
      { status: 500 }
    );
  }
}

