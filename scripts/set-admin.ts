/**
 * Script to set a user as admin by email
 * Usage: npx tsx scripts/set-admin.ts <email>
 */

import { prisma } from "../src/lib/prisma";

async function setAdmin(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
    });

    console.log(`✅ Successfully set ${email} as admin`);
    process.exit(0);
  } catch (error) {
    console.error("Error setting admin status:", error);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.error("Usage: npx tsx scripts/set-admin.ts <email>");
  process.exit(1);
}

setAdmin(email);


