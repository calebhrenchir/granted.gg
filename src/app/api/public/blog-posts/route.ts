import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const blogPosts = await prisma.blogPost.findMany({
      orderBy: {
        publishedAt: "desc",
      },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        imageUrl: true,
        author: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      blogPosts,
    });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 }
    );
  }
}

