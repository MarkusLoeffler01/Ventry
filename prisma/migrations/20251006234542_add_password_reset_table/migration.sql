/*
  Warnings:

  - You are about to drop the column `expires` on the `password_resets` table. All the data in the column will be lost.
  - Added the required column `expiresAt` to the `password_resets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "password_resets" DROP COLUMN "expires",
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "used" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usedAt" TIMESTAMP(3);
