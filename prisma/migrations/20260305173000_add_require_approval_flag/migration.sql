-- Add event-level approval gate for registrations
ALTER TABLE "Event"
ADD COLUMN "requireApproval" BOOLEAN NOT NULL DEFAULT false;
