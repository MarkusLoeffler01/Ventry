-- AlterTable
ALTER TABLE "user" ADD COLUMN     "showExactBirthdate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "socialLinks" JSONB NOT NULL DEFAULT '{}';
