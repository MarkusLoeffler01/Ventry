/*
  Warnings:

  - Made the column `storagePath` on table `ProfilePicture` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ProfilePicture" ALTER COLUMN "storagePath" SET NOT NULL;
