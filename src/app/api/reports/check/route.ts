import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");
    const email = searchParams.get("email");

    if (!linkId || !email) {
      return NextResponse.json(
        { error: "Link ID and email are required" },
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

    // Check if this email has already reported this link
    const normalizedEmail = email.toLowerCase().trim();
    const existingReport = await prisma.report.findFirst({
      where: {
        linkId,
        reporterEmail: normalizedEmail,
      },
    });

    return NextResponse.json({
      success: true,
      hasReported: !!existingReport,
    });
  } catch (error) {
    console.error("Error checking report status:", error);
    return NextResponse.json(
      { error: "Failed to check report status" },
      { status: 500 }
    );
  }
}


