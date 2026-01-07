import { NextResponse } from "next/server";
import { checkAdminStatus } from "@/lib/admin-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blogPosts = await prisma.blogPost.findMany({
      orderBy: {
        publishedAt: "desc",
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

export async function POST(request: Request) {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, slug, title, excerpt, content, publishedAt, imageUrl, author } = body;

    if (!slug || !title || !excerpt || !content || !publishedAt || !author) {
      return NextResponse.json(
        { error: "Slug, title, excerpt, content, publishedAt, and author are required" },
        { status: 400 }
      );
    }

    // Validate content is an array
    if (!Array.isArray(content)) {
      return NextResponse.json(
        { error: "Content must be an array" },
        { status: 400 }
      );
    }

    // If id is provided, update existing post
    if (id) {
      const blogPost = await prisma.blogPost.update({
        where: { id },
        data: {
          slug,
          title,
          excerpt,
          content: content as any,
          publishedAt: new Date(publishedAt),
          imageUrl: imageUrl || null,
          author,
        },
      });

      return NextResponse.json({
        success: true,
        blogPost,
      });
    } else {
      // Check if slug already exists
      const existingPost = await prisma.blogPost.findUnique({
        where: { slug },
      });

      if (existingPost) {
        return NextResponse.json(
          { error: "A blog post with this slug already exists" },
          { status: 400 }
        );
      }

      // Create new post
      const blogPost = await prisma.blogPost.create({
        data: {
          slug,
          title,
          excerpt,
          content: content as any,
          publishedAt: new Date(publishedAt),
          imageUrl: imageUrl || null,
          author,
        },
      });

      return NextResponse.json({
        success: true,
        blogPost,
      });
    }
  } catch (error) {
    console.error("Error saving blog post:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to save blog post", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Blog post ID is required" },
        { status: 400 }
      );
    }

    await prisma.blogPost.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Blog post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    return NextResponse.json(
      { error: "Failed to delete blog post" },
      { status: 500 }
    );
  }
}

