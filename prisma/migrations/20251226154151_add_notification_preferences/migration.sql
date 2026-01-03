-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailNotificationCashOut" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotificationLinkPurchases" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotificationLinkViews" BOOLEAN NOT NULL DEFAULT true;
