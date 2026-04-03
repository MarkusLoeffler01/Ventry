/*
  Warnings:

  - A unique constraint covering the columns `[userId,eventId]` on the table `Registration` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventId` to the `Registration` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_eventId_fkey";

-- DropIndex
DROP INDEX "public"."Registration_userId_key";

-- AlterTable
CREATE SEQUENCE location_id_seq;
ALTER TABLE "Location" ALTER COLUMN "id" SET DEFAULT nextval('location_id_seq');
ALTER SEQUENCE location_id_seq OWNED BY "Location"."id";

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "eventId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "eventId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Registration_userId_eventId_key" ON "Registration"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
