import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Fetch user to get onboarding data
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
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
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Validate that user has completed onboarding
        if (!user.firstName || !user.lastName || !user.dateOfBirth || 
            !user.phoneNumber || !user.addressLine1 || !user.city || 
            !user.state || !user.postalCode || !user.country) {
            return NextResponse.json(
                { error: "Please complete onboarding first" },
                { status: 400 }
            );
        }

        // Format date of birth for Stripe (YYYY-MM-DD)
        const dob = user.dateOfBirth.toISOString().split('T')[0];
        const [year, month, day] = dob.split('-');

        // Get the return URL - construct from request headers or use environment variable
        let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        
        // If not set, try to get from request headers
        if (!baseUrl) {
            const origin = request.headers.get('origin') || request.headers.get('referer');
            if (origin) {
                try {
                    const url = new URL(origin);
                    baseUrl = `${url.protocol}//${url.host}`;
                } catch (e) {
                    // Invalid URL, use default
                }
            }
        }
        
        // Fallback to defaults based on environment
        if (!baseUrl) {
            if (process.env.NODE_ENV === 'production') {
                baseUrl = 'https://app.granted.gg';
            } else {
                baseUrl = 'http://app.localhost:3000';
            }
        }
        
        // Ensure it's a valid URL
        try {
            new URL(baseUrl);
        } catch (e) {
            console.error('Invalid base URL:', baseUrl);
            baseUrl = process.env.NODE_ENV === 'production' 
                ? 'https://app.granted.gg' 
                : 'http://app.localhost:3000';
        }
        
        // Stripe Identity automatically appends the verification session ID as a query parameter
        // The parameter name is typically 'session_id' or it may be appended differently
        // We'll use the base URL and let Stripe append the session information
        const returnUrl = `app.${baseUrl}/onboarding`;

        // Create Stripe Identity VerificationSession
        const verificationSession = await stripe.identity.verificationSessions.create({
            type: 'document',
            metadata: {
                user_id: user.id,
                first_name: user.firstName,
                last_name: user.lastName,
                phone: user.phoneNumber,
                address_line1: user.addressLine1,
                address_line2: user.addressLine2 || '',
                city: user.city,
                state: user.state,
                postal_code: user.postalCode,
                country: user.country,
                date_of_birth: dob,
            },
            return_url: returnUrl,
            options: {
                document: {
                    allowed_types: ['driving_license', 'id_card', 'passport'],
                    require_id_number: true, // Enable ID number collection for Connect account requirements
                    require_live_capture: true,
                    require_matching_selfie: false,
                },
            },
        });

        // Save verification session ID to user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                stripeVerificationSessionId: verificationSession.id,
            },
        });

        // Get the client secret for the frontend
        const clientSecret = verificationSession.client_secret;

        return NextResponse.json({
            success: true,
            verificationSessionId: verificationSession.id,
            clientSecret,
            verificationUrl: verificationSession.url,
        });
    } catch (error) {
        console.error("Error creating verification session:", error);
        return NextResponse.json(
            { error: "Failed to create verification session" },
            { status: 500 }
        );
    }
}

