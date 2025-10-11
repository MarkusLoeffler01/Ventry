/*
  Warnings:

  - You are about to drop the column `isVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `access_token` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `confirmed_at` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `disable_email_login` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `email_token` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `email_token_sent_at` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `email_verified` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `id_token` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `provider_account_id` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `provider_email` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `token_expires_at` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `token_type` on the `pending_account_links` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `pending_account_links` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[emailToken]` on the table `pending_account_links` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,provider]` on the table `pending_account_links` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expiresAt` to the `pending_account_links` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerAccountId` to the `pending_account_links` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerEmail` to the `pending_account_links` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `pending_account_links` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."pending_account_links" DROP CONSTRAINT "pending_account_links_user_id_fkey";

-- DropIndex
DROP INDEX "public"."pending_account_links_email_token_idx";

-- DropIndex
DROP INDEX "public"."pending_account_links_email_token_key";

-- DropIndex
DROP INDEX "public"."pending_account_links_user_id_provider_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isVerified",
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pending_account_links" DROP COLUMN "access_token",
DROP COLUMN "confirmed_at",
DROP COLUMN "created_at",
DROP COLUMN "disable_email_login",
DROP COLUMN "email_token",
DROP COLUMN "email_token_sent_at",
DROP COLUMN "email_verified",
DROP COLUMN "expires_at",
DROP COLUMN "id_token",
DROP COLUMN "provider_account_id",
DROP COLUMN "provider_email",
DROP COLUMN "refresh_token",
DROP COLUMN "token_expires_at",
DROP COLUMN "token_type",
DROP COLUMN "user_id",
ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "disableEmailLogin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailToken" TEXT,
ADD COLUMN     "emailTokenSentAt" TIMESTAMP(3),
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "idToken" TEXT,
ADD COLUMN     "providerAccountId" TEXT NOT NULL,
ADD COLUMN     "providerEmail" TEXT NOT NULL,
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "tokenExpiresAt" INTEGER,
ADD COLUMN     "tokenType" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "pending_account_links_emailToken_key" ON "pending_account_links"("emailToken");

-- CreateIndex
CREATE INDEX "pending_account_links_emailToken_idx" ON "pending_account_links"("emailToken");

-- CreateIndex
CREATE UNIQUE INDEX "pending_account_links_userId_provider_key" ON "pending_account_links"("userId", "provider");

-- AddForeignKey
ALTER TABLE "pending_account_links" ADD CONSTRAINT "pending_account_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
