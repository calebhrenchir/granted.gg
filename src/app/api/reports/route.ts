import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { linkId, linkUrl, reason, description, reporterEmail } = body;

    if (!linkId || !linkUrl || !reason || !description || !reporterEmail) {
      return NextResponse.json(
        { error: "Link ID, URL, reason, description, and reporter email are required" },
        { status: 400 }
      );
    }

    if (description.trim().length < 20) {
      return NextResponse.json(
        { error: "Description must be at least 20 characters" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(reporterEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Verify link exists
    const link = await prisma.link.findUnique({
      where: { id: linkId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    // Check if this email has already reported this link
    const normalizedEmail = reporterEmail.toLowerCase().trim();
    const existingReport = await prisma.report.findFirst({
      where: {
        linkId,
        reporterEmail: normalizedEmail,
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already reported this link" },
        { status: 400 }
      );
    }

    // Store report in database
    const report = await prisma.report.create({
      data: {
        linkId,
        reason,
        description: description.trim(),
        reporterEmail: normalizedEmail,
        status: "pending",
      },
    });
    
    // Send email notification to admins
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      try {
        const reportEmail = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #000; color: #fff;">
            <h1 style="color: #fff; font-size: 24px; margin-bottom: 20px;">Content Report</h1>
            
            <div style="margin-bottom: 20px;">
              <h2 style="color: #fff; font-size: 18px; margin-bottom: 10px;">Report Details</h2>
              <p style="color: #ccc; margin: 5px 0;"><strong>Link ID:</strong> ${linkId}</p>
              <p style="color: #ccc; margin: 5px 0;"><strong>Link URL:</strong> ${linkUrl}</p>
              <p style="color: #ccc; margin: 5px 0;"><strong>Link Name:</strong> ${link.name || linkUrl}</p>
              <p style="color: #ccc; margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h2 style="color: #fff; font-size: 18px; margin-bottom: 10px;">Description</h2>
              <p style="color: #ccc; white-space: pre-wrap;">${description}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h2 style="color: #fff; font-size: 18px; margin-bottom: 10px;">Link Owner</h2>
              <p style="color: #ccc; margin: 5px 0;"><strong>Email:</strong> ${link.user?.email || "N/A"}</p>
              <p style="color: #ccc; margin: 5px 0;"><strong>Name:</strong> ${link.user?.firstName || ""} ${link.user?.lastName || ""}</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://granted.gg"}/admin/links" 
                 style="display: inline-block; padding: 10px 20px; background-color: #fff; color: #000; text-decoration: none; border-radius: 5px;">
                View in Admin Panel
              </a>
            </div>
          </div>
        `;

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Granted <no-reply@granted.gg>",
          to: process.env.ADMIN_EMAIL,
          subject: `Content Report: ${link.name || linkUrl} - ${reason}`,
          html: reportEmail,
        });
      } catch (emailError) {
        console.error("Error sending report email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Report submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting report:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}

