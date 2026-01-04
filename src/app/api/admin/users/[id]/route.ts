import { prisma } from "@/lib/prisma";
import { checkAdminStatus } from "@/lib/admin-helpers";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch user with all related data
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        dateOfBirth: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        isAdmin: true,
        isIdentityVerified: true,
        platformFee: true,
        isFrozen: true,
        createdAt: true,
        links: {
          select: {
            id: true,
            url: true,
            name: true,
            price: true,
            totalEarnings: true,
            totalClicks: true,
            totalSales: true,
            createdAt: true,
            _count: {
              select: {
                files: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            links: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Calculate total earnings from all links
    const totalEarnings = user.links.reduce(
      (sum, link) => sum + Number(link.totalEarnings),
      0
    );

    // Format dateOfBirth for form input (YYYY-MM-DD)
    const dateOfBirth = user.dateOfBirth 
      ? user.dateOfBirth.toISOString().split('T')[0] 
      : null;

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        dateOfBirth,
        platformFee: user.platformFee, // Already an Int, no conversion needed
        totalEarnings,
        links: user.links.map((link) => ({
          ...link,
          price: Number(link.price),
          totalEarnings: Number(link.totalEarnings),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Build update data object (only include fields that are provided)
    const updateData: any = {};

    if (body.email !== undefined) updateData.email = body.email;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber;
    if (body.dateOfBirth !== undefined) {
      updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.addressLine1 !== undefined) updateData.addressLine1 = body.addressLine1;
    if (body.addressLine2 !== undefined) updateData.addressLine2 = body.addressLine2 || null;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.isAdmin !== undefined) updateData.isAdmin = body.isAdmin;
    if (body.isIdentityVerified !== undefined) updateData.isIdentityVerified = body.isIdentityVerified;
    if (body.isFrozen !== undefined) updateData.isFrozen = body.isFrozen;
    if (body.platformFee !== undefined) {
      const fee = parseInt(body.platformFee);
      if (isNaN(fee) || fee < 0 || fee > 100) {
        return NextResponse.json(
          { error: "Platform fee must be a whole number between 0 and 100" },
          { status: 400 }
        );
      }
      updateData.platformFee = fee;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        dateOfBirth: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        isAdmin: true,
        isIdentityVerified: true,
        platformFee: true,
        isFrozen: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        dateOfBirth: updatedUser.dateOfBirth 
          ? updatedUser.dateOfBirth.toISOString().split('T')[0] 
          : null,
        platformFee: updatedUser.platformFee, // Already an Int, no conversion needed
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
