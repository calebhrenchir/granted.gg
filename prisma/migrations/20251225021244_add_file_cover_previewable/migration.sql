-- AlterTable
ALTER TABLE "files" ADD COLUMN     "isCoverPhoto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPreviewable" BOOLEAN NOT NULL DEFAULT false;
