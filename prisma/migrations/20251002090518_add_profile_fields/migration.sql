-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "pronouns" TEXT,
ADD COLUMN     "showAge" BOOLEAN NOT NULL DEFAULT true;
