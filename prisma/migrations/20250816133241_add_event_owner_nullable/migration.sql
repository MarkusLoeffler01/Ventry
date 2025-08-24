-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "ownerId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
