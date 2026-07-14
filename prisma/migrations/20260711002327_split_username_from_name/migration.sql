-- DropIndex
DROP INDEX "user_name_key";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "username" VARCHAR(255);

-- CreateTable
CREATE TABLE "username_history" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "username_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "username_history_username_expiresAt_idx" ON "username_history"("username", "expiresAt");

-- CreateIndex
CREATE INDEX "username_history_userId_idx" ON "username_history"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- AddForeignKey
ALTER TABLE "username_history" ADD CONSTRAINT "username_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
