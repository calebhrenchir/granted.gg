import { NextResponse } from "next/server";
import { checkAdminStatus } from "@/lib/admin-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const policies = await prisma.policy.findMany({
      orderBy: {
        type: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      policies,
    });
  } catch (error) {
    console.error("Error fetching policies:", error);
    return NextResponse.json(
      { error: "Failed to fetch policies" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, sections } = body;

    if (!type || !title || !sections) {
      return NextResponse.json(
        { error: "Type, title, and sections are required" },
        { status: 400 }
      );
    }

    // Validate sections is an array
    if (!Array.isArray(sections)) {
      return NextResponse.json(
        { error: "Sections must be an array" },
        { status: 400 }
      );
    }

    // Upsert policy (create or update)
    const policy = await prisma.policy.upsert({
      where: { type },
      update: {
        title,
        sections: sections as any,
        lastUpdated: new Date(),
      },
      create: {
        type,
        title,
        sections: sections as any,
        lastUpdated: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      policy,
    });
  } catch (error) {
    console.error("Error saving policy:", error);
    return NextResponse.json(
      { error: "Failed to save policy" },
      { status: 500 }
    );
  }
}

