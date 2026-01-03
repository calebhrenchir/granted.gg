import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { newEmail, code } = await request.json();

    if (!newEmail || typeof newEmail !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    // Find verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: newEmail,
        token: code,
        expires: {
          gt: new Date(),
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    // Check if email is already in use by another user
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: "This email is already in use" },
        { status: 400 }
      );
    }

    // Update user email
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        email: newEmail,
        emailVerified: new Date(),
      },
      select: {
        id: true,
        email: true,
      },
    });

    // Delete used token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: newEmail,
          token: code,
        },
      },
    });

    return NextResponse.json({
      success: true,
      email: updatedUser.email,
    });
  } catch (error: any) {
    console.error("Error verifying email:", error);
    
    // Handle unique constraint violation (email already exists)
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return NextResponse.json(
        { error: "This email is already in use" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}





