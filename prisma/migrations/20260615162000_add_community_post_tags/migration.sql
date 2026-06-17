-- AlterTable
ALTER TABLE "CommunityPost"
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill tags from existing post shape so filters work for earlier rows.
UPDATE "CommunityPost"
SET "tags" =
  ARRAY[lower("type"::TEXT)] ||
  CASE
    WHEN "type" IN ('IMAGE', 'VIDEO') THEN ARRAY['media']::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END ||
  CASE
    WHEN "feedbackRating" IS NOT NULL THEN ARRAY['rating']::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;

-- CreateIndex
CREATE INDEX "CommunityPost_tags_idx" ON "CommunityPost" USING GIN ("tags");
