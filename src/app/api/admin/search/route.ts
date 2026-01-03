import { prisma } from "@/lib/prisma";
import { checkAdminStatus } from "@/lib/admin-helpers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        users: [],
        links: [],
      });
    }

    // Search users by name, email, or id
    const userWhere: any = {
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { id: { contains: query, mode: "insensitive" } },
        {
          AND: [
            { firstName: { contains: query.split(" ")[0] || "", mode: "insensitive" } },
            { lastName: { contains: query.split(" ")[1] || "", mode: "insensitive" } },
          ],
        },
      ],
    };

    // Search links by name, url, or id
    const linkWhere: any = {
      OR: [
        { url: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { id: { contains: query, mode: "insensitive" } },
      ],
    };

    // Fetch users and links in parallel
    const [users, links] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          name: true,
          email: true,
          firstName: true,
          lastName: true,
          image: true,
        },
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.link.findMany({
        where: linkWhere,
        select: {
          id: true,
          url: true,
          name: true,
          price: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      users: users.map((user) => ({
        ...user,
        displayName: user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.name || user.email || "Unknown",
      })),
      links: links.map((link) => ({
        ...link,
        price: Number(link.price),
        displayName: link.name || link.url,
        ownerName: link.user
          ? link.user.firstName && link.user.lastName
            ? `${link.user.firstName} ${link.user.lastName}`
            : link.user.name || link.user.email || "Unknown"
          : "No Owner",
      })),
    });
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
