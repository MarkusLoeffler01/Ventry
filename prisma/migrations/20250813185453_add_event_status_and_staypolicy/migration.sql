/*
  Warnings:

  - Made the column `description` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "status" "public"."EventStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "stayPolicy" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "description" SET NOT NULL;
