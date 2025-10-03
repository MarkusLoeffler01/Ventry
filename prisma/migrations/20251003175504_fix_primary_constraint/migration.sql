-- DropIndex
DROP INDEX "public"."ProfilePicture_isPrimary_key";

-- RenameIndex
ALTER INDEX "ProfilePicture_userID_isPrimary_key" RENAME TO "unique_user_primary";
