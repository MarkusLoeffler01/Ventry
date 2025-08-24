-- DropForeignKey
ALTER TABLE "public"."Location" DROP CONSTRAINT "Location_eventId_fkey";

-- AlterTable
CREATE SEQUENCE "public".event_id_seq;
ALTER TABLE "public"."Event" ALTER COLUMN "id" SET DEFAULT nextval('"public".event_id_seq');
ALTER SEQUENCE "public".event_id_seq OWNED BY "public"."Event"."id";

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
