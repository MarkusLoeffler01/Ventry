/*
  Warnings:

  - You are about to drop the column `paymentDueMinutes` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "paymentDueMinutes",
ADD COLUMN     "paymentDeadline" TIMESTAMP(3);
