-- CreateEnum
CREATE TYPE "CommunityFeedbackType" AS ENUM ('VENUE', 'ORGANIZATION', 'EVENTS', 'OVERALL_EXPERIENCE');

-- AlterTable
ALTER TABLE "CommunityPost"
ADD COLUMN "feedbackType" "CommunityFeedbackType";

-- Backfill a default category for existing feedback posts.
UPDATE "CommunityPost"
SET "feedbackType" = 'OVERALL_EXPERIENCE'
WHERE "type" = 'FEEDBACK' AND "feedbackType" IS NULL;
