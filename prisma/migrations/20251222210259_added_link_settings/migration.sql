-- AlterTable
ALTER TABLE "links" ADD COLUMN     "isDownloadable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLinkTitleVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPurchaseable" BOOLEAN NOT NULL DEFAULT false;
