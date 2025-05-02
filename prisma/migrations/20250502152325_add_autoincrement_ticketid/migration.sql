/*
  Warnings:

  - The `ticketId` column on the `Registration` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Registration" DROP COLUMN "ticketId",
ADD COLUMN     "ticketId" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Registration_ticketId_key" ON "Registration"("ticketId");
