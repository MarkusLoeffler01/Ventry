/*
  Warnings:

  - A unique constraint covering the columns `[id,providerId]` on the table `account` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accountId` to the `pending_account_links` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "pending_account_links" ADD COLUMN     "accountId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "account_id_providerId_key" ON "account"("id", "providerId");

-- AddForeignKey
ALTER TABLE "pending_account_links" ADD CONSTRAINT "pending_account_links_accountId_provider_fkey" FOREIGN KEY ("accountId", "provider") REFERENCES "account"("id", "providerId") ON DELETE CASCADE ON UPDATE CASCADE;
