import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                firstName: true,
                lastName: true,
                dateOfBirth: true,
                phoneNumber: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                postalCode: true,
                country: true,
                isIdentityVerified: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Format date of birth for form input (YYYY-MM-DD)
        const dateOfBirth = user.dateOfBirth 
            ? user.dateOfBirth.toISOString().split('T')[0] 
            : null;

        return NextResponse.json({
            success: true,
            data: {
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                dateOfBirth: dateOfBirth || "",
                phoneNumber: user.phoneNumber || "",
                addressLine1: user.addressLine1 || "",
                addressLine2: user.addressLine2 || "",
                city: user.city || "",
                state: user.state || "",
                postalCode: user.postalCode || "",
                country: user.country || "US",
                isIdentityVerified: user.isIdentityVerified,
            },
        });
    } catch (error) {
        console.error("Error fetching onboarding data:", error);
        return NextResponse.json(
            { error: "Failed to fetch onboarding data" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            firstName,
            lastName,
            dateOfBirth,
            phoneNumber,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country,
        } = body;

        // Build update data object (only include fields that are provided)
        const updateData: any = {};

        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1;
        if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2 || null;
        if (city !== undefined) updateData.city = city;
        if (state !== undefined) updateData.state = state;
        if (postalCode !== undefined) updateData.postalCode = postalCode;
        if (country !== undefined) updateData.country = country;

        // Update user with onboarding data (partial update allowed)
        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
            },
        });
    } catch (error) {
        console.error("Error saving onboarding data:", error);
        return NextResponse.json(
            { error: "Failed to save onboarding data" },
            { status: 500 }
        );
    }
}

