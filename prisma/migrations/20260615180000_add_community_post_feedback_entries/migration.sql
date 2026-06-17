-- Add grouped feedback storage to community posts.
ALTER TABLE "CommunityPost"
ADD COLUMN "feedbackEntries" JSONB NOT NULL DEFAULT '[]';

-- Backfill existing single feedback posts into the grouped structure.
UPDATE "CommunityPost"
SET "feedbackEntries" = jsonb_build_array(
  jsonb_build_object(
    'content', "content",
    'feedbackRating', "feedbackRating",
    'feedbackType', "feedbackType"
  )
)
WHERE "feedbackType" IS NOT NULL OR "feedbackRating" IS NOT NULL;
