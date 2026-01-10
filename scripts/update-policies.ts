import { PrismaClient } from "@prisma/client";
import policiesContent from "../policies-content.json";

const prisma = new PrismaClient();

async function updatePolicies() {
  try {
    console.log("Updating policies...");

    // Update Terms of Service
    const terms = policiesContent.terms;
    await prisma.policy.upsert({
      where: { type: "terms" },
      update: {
        title: terms.title,
        sections: terms.sections as any,
        lastUpdated: new Date(),
      },
      create: {
        type: "terms",
        title: terms.title,
        sections: terms.sections as any,
        lastUpdated: new Date(),
      },
    });
    console.log("✓ Terms of Service updated");

    // Update Privacy Policy
    const privacy = policiesContent.privacy;
    await prisma.policy.upsert({
      where: { type: "privacy" },
      update: {
        title: privacy.title,
        sections: privacy.sections as any,
        lastUpdated: new Date(),
      },
      create: {
        type: "privacy",
        title: privacy.title,
        sections: privacy.sections as any,
        lastUpdated: new Date(),
      },
    });
    console.log("✓ Privacy Policy updated");

    // Update Removal Policy
    const removal = policiesContent.removal;
    await prisma.policy.upsert({
      where: { type: "removal" },
      update: {
        title: removal.title,
        sections: removal.sections as any,
        lastUpdated: new Date(),
      },
      create: {
        type: "removal",
        title: removal.title,
        sections: removal.sections as any,
        lastUpdated: new Date(),
      },
    });
    console.log("✓ Removal Policy updated");

    console.log("\nAll policies have been successfully updated!");
  } catch (error) {
    console.error("Error updating policies:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updatePolicies();


