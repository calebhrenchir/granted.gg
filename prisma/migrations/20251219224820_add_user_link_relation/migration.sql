-- AlterTable
ALTER TABLE "files" ADD COLUMN     "blurredS3Key" TEXT;

-- AlterTable
ALTER TABLE "links" ADD COLUMN     "coverPhotoS3Key" TEXT,
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
