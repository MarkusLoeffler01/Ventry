-- CreateTable
CREATE TABLE "pending_account_links" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "provider_email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "token_expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "disable_email_login" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "email_token" TEXT,
    "email_token_sent_at" TIMESTAMP(3),

    CONSTRAINT "pending_account_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_account_links_email_token_key" ON "pending_account_links"("email_token");

-- CreateIndex
CREATE INDEX "pending_account_links_email_token_idx" ON "pending_account_links"("email_token");

-- CreateIndex
CREATE UNIQUE INDEX "pending_account_links_user_id_provider_key" ON "pending_account_links"("user_id", "provider");

-- AddForeignKey
ALTER TABLE "pending_account_links" ADD CONSTRAINT "pending_account_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
