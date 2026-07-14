-- CreateEnum
CREATE TYPE "AdminType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "AdminOrgPermission" AS ENUM ('COMMUNITY', 'SUPPORT_TICKETS', 'EVENT_APPROVAL', 'STRIPE_FINANCES');

-- CreateEnum
CREATE TYPE "AdminInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "type" "AdminType" NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "AdminOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminOrganizationMembership" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "permissions" "AdminOrgPermission"[],
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminOrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "invitedAdminId" TEXT,
    "invitedByAdminId" TEXT NOT NULL,
    "permissions" "AdminOrgPermission"[],
    "status" "AdminInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminOrganization_slug_key" ON "AdminOrganization"("slug");

-- CreateIndex
CREATE INDEX "AdminOrganizationMembership_organizationId_idx" ON "AdminOrganizationMembership"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminOrganizationMembership_adminId_organizationId_key" ON "AdminOrganizationMembership"("adminId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvitation_token_key" ON "AdminInvitation"("token");

-- CreateIndex
CREATE INDEX "AdminInvitation_organizationId_idx" ON "AdminInvitation"("organizationId");

-- CreateIndex
CREATE INDEX "AdminInvitation_token_idx" ON "AdminInvitation"("token");

-- CreateIndex
CREATE INDEX "AdminInvitation_invitedEmail_idx" ON "AdminInvitation"("invitedEmail");

-- AddForeignKey
ALTER TABLE "AdminOrganization" ADD CONSTRAINT "AdminOrganization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminOrganizationMembership" ADD CONSTRAINT "AdminOrganizationMembership_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminOrganizationMembership" ADD CONSTRAINT "AdminOrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "AdminOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInvitation" ADD CONSTRAINT "AdminInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "AdminOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInvitation" ADD CONSTRAINT "AdminInvitation_invitedAdminId_fkey" FOREIGN KEY ("invitedAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInvitation" ADD CONSTRAINT "AdminInvitation_invitedByAdminId_fkey" FOREIGN KEY ("invitedByAdminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "AdminOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
