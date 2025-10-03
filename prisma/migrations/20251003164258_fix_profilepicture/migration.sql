/*
  Warnings:

  - A unique constraint covering the columns `[isPrimary]` on the table `ProfilePicture` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProfilePicture_isPrimary_key" ON "ProfilePicture"("isPrimary");
