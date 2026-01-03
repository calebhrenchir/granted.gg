-- AlterTable
ALTER TABLE "users" ALTER COLUMN "platformFee" TYPE INTEGER USING ROUND("platformFee"::numeric)::integer;


