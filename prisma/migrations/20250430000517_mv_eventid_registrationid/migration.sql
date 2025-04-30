/*
  Warnings:

  - You are about to drop the column `eventId` on the `Payment` table. All the data in the column will be lost.
  - Added the required column `registrationId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_eventId_fkey";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "eventId",
ADD COLUMN     "registrationId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
