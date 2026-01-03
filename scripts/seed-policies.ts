import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const termsSections = [
  {
    title: "Terms of Service",
    description: "These Terms of Service (\"Terms\") govern your access to and use of the services provided by granted.gg (\"Service\") and the website at https://granted.gg (\"Site\"). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree with these Terms, please do not use the Service."
  },
  {
    title: "Acceptance of Terms",
    description: "By creating an account, accessing, or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms."
  },
  {
    title: "Description of Service",
    description: "granted.gg is a digital content marketplace platform that enables users (\"Sellers\") to create and sell access to digital content through shareable links. Buyers can purchase access to content, and Sellers receive payment for their sales. The Service facilitates transactions between Sellers and Buyers and processes payments through third-party payment processors."
  },
  {
    title: "User Accounts",
    description: "To use certain features of the Service, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete. You must be at least 18 years old to use the Service."
  },
  {
    title: "Identity Verification",
    description: "To sell content and receive payments, Sellers must complete identity verification through our third-party verification provider (Stripe Identity). This process requires providing government-issued identification and may include additional verification steps. We reserve the right to refuse service to anyone who fails to complete identity verification or provides false information."
  },
  {
    title: "Content and Intellectual Property",
    description: "You retain all ownership rights to content you upload to the Service. By uploading content, you grant granted.gg a limited, non-exclusive license to store, display, and distribute your content solely for the purpose of providing the Service. You represent and warrant that you own or have the necessary rights to all content you upload and that your content does not violate any third-party rights or applicable laws."
  },
  {
    title: "Prohibited Content",
    description: "You may not upload, sell, or distribute content that: (a) violates any applicable laws or regulations; (b) infringes on intellectual property rights; (c) contains illegal, harmful, or offensive material; (d) promotes violence, hate speech, or discrimination; (e) contains personal information of others without consent; (f) is fraudulent or misleading; or (g) violates any other provision of these Terms. We reserve the right to remove any content that violates these Terms without notice."
  },
  {
    title: "Pricing and Payments",
    description: "Sellers set their own prices for content. All prices are displayed in USD. When a Buyer purchases content, the total price includes the Seller's set price plus a 10% processing fee. granted.gg retains 20% of each sale as a platform fee (10% platform fee + 10% privacy fee). Payments are processed through Stripe, and all payment information is handled by Stripe in accordance with their terms of service."
  },
  {
    title: "Refunds",
    description: "All sales are final. Once content is purchased and access is granted, no refunds will be provided except as required by law or at our sole discretion. Buyers are responsible for ensuring they understand what they are purchasing before completing a transaction."
  },
  {
    title: "Payouts to Sellers",
    description: "Sellers receive 80% of each sale (after platform fees). To receive payouts, Sellers must complete identity verification and provide valid bank account information through Stripe Connect. Payouts are processed to the Seller's connected bank account and typically arrive within 1-3 business days after the payout is initiated. Sellers are responsible for providing accurate banking information."
  },
  {
    title: "File Uploads and Storage",
    description: "Sellers may upload up to 10 files per content link. Files are stored securely on AWS S3. Content may be processed, blurred, or hashed for security and preview purposes. You are responsible for ensuring your files comply with these Terms and applicable laws. We reserve the right to remove files that violate these Terms."
  },
  {
    title: "Service Availability",
    description: "We strive to maintain the Service's availability but do not guarantee uninterrupted access. The Service may be unavailable due to maintenance, technical issues, or circumstances beyond our control. We reserve the right to modify, suspend, or discontinue any part of the Service at any time without notice."
  },
  {
    title: "User Conduct",
    description: "You agree not to: (a) use the Service for any illegal purpose; (b) attempt to gain unauthorized access to the Service or other users' accounts; (c) interfere with or disrupt the Service; (d) use automated systems to access the Service without permission; (e) impersonate any person or entity; (f) collect or harvest information about other users; or (g) engage in any activity that violates these Terms."
  },
  {
    title: "Termination",
    description: "We reserve the right to suspend or terminate your account and access to the Service at any time, with or without cause or notice, for any reason including violation of these Terms. Upon termination, your right to use the Service will immediately cease. We may also remove or delete your content and account information. Outstanding payouts will be processed according to our standard procedures."
  },
  {
    title: "Disclaimers",
    description: "THE SERVICE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE."
  },
  {
    title: "Limitation of Liability",
    description: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, GRANTED.GG SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE."
  },
  {
    title: "Indemnification",
    description: "You agree to indemnify, defend, and hold harmless granted.gg, its affiliates, and their respective officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising out of or relating to your use of the Service, your content, or your violation of these Terms."
  },
  {
    title: "Changes to Terms",
    description: "We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on the Site and updating the \"Last updated\" date. Your continued use of the Service after such changes constitutes acceptance of the modified Terms."
  },
  {
    title: "Governing Law",
    description: "These Terms shall be governed by and construed in accordance with the laws of the State of Arizona, United States, without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service shall be resolved in the courts of Maricopa County, Arizona."
  },
  {
    title: "Contact Information",
    description: "If you have any questions about these Terms, please contact us at support@granted.gg."
  }
];

const privacySections = [
  {
    title: "Privacy Policy",
    description: "This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from https://granted.gg (the \"Site\") or use our services (the \"Service\")."
  },
  {
    title: "Information We Collect",
    description: "We collect information that you provide directly to us, including: Account Information: Email address, name, profile image, and authentication credentials when you create an account. Identity Verification Information: For sellers, we collect first name, last name, date of birth, phone number, address (including street address, city, state, postal code, and country), and government-issued identification documents through our third-party identity verification provider (Stripe Identity). Payment Information: Payment method details are collected and processed by Stripe. We do not store full payment card numbers on our servers. Banking Information: For sellers receiving payouts, bank account information (routing number, account number, account type) is collected through Stripe Connect. Content Information: Files you upload, including file names, types, sizes, and the content itself. Usage Information: Information about how you use the Service, including link views, purchases, clicks, and other activity data. Device Information: Information about your device, browser, and how you access the Service."
  },
  {
    title: "How We Use Your Information",
    description: "We use the information we collect to: Provide and maintain the Service, including processing transactions and facilitating content sales. Verify your identity for compliance and security purposes. Process payments and payouts through third-party payment processors. Send you transactional emails, including purchase confirmations, account notifications, and service updates (you can manage email preferences in your account settings). Improve and optimize the Service, including analyzing usage patterns and user behavior. Ensure security and prevent fraud, abuse, and illegal activity. Comply with legal obligations and enforce our Terms of Service. Communicate with you about the Service, respond to your inquiries, and provide customer support."
  },
  {
    title: "Information Sharing and Disclosure",
    description: "We share your information only in the following circumstances: Payment Processing: We share payment and transaction information with Stripe to process payments and payouts. Stripe's use of your information is governed by their Privacy Policy. Identity Verification: We share identity verification information with Stripe Identity to verify your identity for compliance purposes. File Storage: Your uploaded files are stored on Amazon Web Services (AWS) S3. AWS's use of your information is governed by their Privacy Policy. Email Services: We use Resend to send transactional and notification emails. Resend's use of your information is governed by their Privacy Policy. Authentication: If you sign in using Google or Apple, we share authentication information with those providers in accordance with their privacy policies. Legal Requirements: We may disclose your information if required by law, court order, or government regulation, or to protect our rights, property, or safety, or that of our users or others. Business Transfers: In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity."
  },
  {
    title: "Data Security",
    description: "We implement appropriate technical and organizational security measures to protect your personal information. This includes: Encryption of data in transit and at rest. Secure storage of files on AWS S3 with access controls. Blurring and hashing of content for security and preview purposes. Regular security assessments and updates. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security."
  },
  {
    title: "Data Retention",
    description: "We retain your personal information for as long as necessary to provide the Service, comply with legal obligations, resolve disputes, and enforce our agreements. Account information is retained while your account is active. Transaction and activity data is retained for record-keeping and legal compliance purposes. Content files are retained until you delete them or your account is terminated. Identity verification information is retained as required by law and our payment processor's requirements."
  },
  {
    title: "Your Rights and Choices",
    description: "You have the following rights regarding your personal information: Access: You can access and update your account information through your account settings. Deletion: You can request deletion of your account and associated data by contacting us at support@granted.gg. Email Preferences: You can manage your email notification preferences in your account settings. Content Control: You can delete your uploaded content at any time. Data Portability: You can request a copy of your data by contacting us. Please note that we may retain certain information as required by law or for legitimate business purposes, such as transaction records."
  },
  {
    title: "Cookies and Tracking Technologies",
    description: "We use cookies and similar tracking technologies to: Maintain your session and authentication state. Remember your preferences and settings. Analyze how you use the Service to improve functionality. You can control cookies through your browser settings, but disabling cookies may affect your ability to use certain features of the Service."
  },
  {
    title: "Third-Party Services",
    description: "Our Service integrates with third-party services that have their own privacy policies: Stripe: Processes payments, handles identity verification, and manages payouts. See Stripe's Privacy Policy. Amazon Web Services (AWS): Stores your uploaded files securely. See AWS's Privacy Policy. Resend: Sends transactional and notification emails. See Resend's Privacy Policy. Google: Provides authentication services if you choose to sign in with Google. See Google's Privacy Policy. Apple: Provides authentication services if you choose to sign in with Apple. See Apple's Privacy Policy. Vercel: Hosts our Service and provides analytics (production only). See Vercel's Privacy Policy. We encourage you to review the privacy policies of these third-party services."
  },
  {
    title: "Children's Privacy",
    description: "The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected information from a child under 18, we will take steps to delete such information. If you believe we have collected information from a child under 18, please contact us at support@granted.gg."
  },
  {
    title: "International Data Transfers",
    description: "Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using the Service, you consent to the transfer of your information to these countries. We take appropriate safeguards to ensure your information receives adequate protection."
  },
  {
    title: "California Privacy Rights",
    description: "If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA): Right to Know: You can request information about the categories and specific pieces of personal information we collect. Right to Delete: You can request deletion of your personal information. Right to Opt-Out: You can opt-out of the sale of personal information (we do not sell personal information). Right to Non-Discrimination: We will not discriminate against you for exercising your privacy rights. To exercise these rights, please contact us at support@granted.gg."
  },
  {
    title: "Changes to This Privacy Policy",
    description: "We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated Privacy Policy on the Site and updating the \"Last updated\" date. Your continued use of the Service after such changes constitutes acceptance of the updated Privacy Policy."
  },
  {
    title: "Contact Us",
    description: "If you have any questions about this Privacy Policy or our data practices, please contact us at support@granted.gg."
  }
];

async function main() {
  console.log("Seeding policies...");

  // Seed Terms of Service
  await prisma.policy.upsert({
    where: { type: "terms" },
    update: {
      title: "Terms of Service",
      sections: termsSections as any,
      lastUpdated: new Date(),
    },
    create: {
      type: "terms",
      title: "Terms of Service",
      sections: termsSections as any,
      lastUpdated: new Date(),
    },
  });

  console.log("✓ Terms of Service seeded");

  // Seed Privacy Policy
  await prisma.policy.upsert({
    where: { type: "privacy" },
    update: {
      title: "Privacy Policy",
      sections: privacySections as any,
      lastUpdated: new Date(),
    },
    create: {
      type: "privacy",
      title: "Privacy Policy",
      sections: privacySections as any,
      lastUpdated: new Date(),
    },
  });

  console.log("✓ Privacy Policy seeded");

  console.log("All policies seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

