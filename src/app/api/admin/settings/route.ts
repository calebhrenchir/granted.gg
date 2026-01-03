import { prisma } from "@/lib/prisma";
import { checkAdminStatus } from "@/lib/admin-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const adminUser = await checkAdminStatus();
    
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check database connection
    let dbStatus = "disconnected";
    let dbError = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch (error: any) {
      dbStatus = "error";
      dbError = error.message;
    }

    // Check environment variables (without exposing values)
    const envVars = {
      database: !!process.env.DATABASE_URL,
      authSecret: !!process.env.AUTH_SECRET,
      googleClientId: !!process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      appleClientId: !!process.env.APPLE_CLIENT_ID,
      appleClientSecret: !!process.env.APPLE_CLIENT_SECRET,
      resendApiKey: !!process.env.RESEND_API_KEY,
      awsAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: !!process.env.AWS_REGION,
      awsS3BucketName: !!process.env.AWS_S3_BUCKET_NAME,
      stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      stripeConnectClientId: !!process.env.STRIPE_CONNECT_CLIENT_ID,
      nodeEnv: process.env.NODE_ENV || "development",
      cookieDomain: !!process.env.COOKIE_DOMAIN,
    };

    // Get system stats
    const [userCount, linkCount, fileCount, activityCount] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.link.count().catch(() => 0),
      prisma.file.count().catch(() => 0),
      prisma.activity.count().catch(() => 0),
    ]);

    return NextResponse.json({
      success: true,
      database: {
        status: dbStatus,
        error: dbError,
      },
      environment: envVars,
      stats: {
        users: userCount,
        links: linkCount,
        files: fileCount,
        activities: activityCount,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
