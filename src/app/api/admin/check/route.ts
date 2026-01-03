import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      console.log("[Admin Check] No session or user ID");
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    console.log("[Admin Check] Checking user ID:", session.user.id);

    // Check admin status directly from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        isAdmin: true,
      },
    });

    console.log("[Admin Check] User found:", user ? { id: user.id, email: user.email, isAdmin: user.isAdmin } : "null");

    return NextResponse.json({
      isAdmin: user?.isAdmin || false,
      userId: session.user.id,
      userEmail: user?.email || null,
    });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json({ isAdmin: false, error: String(error) }, { status: 200 });
  }
}
