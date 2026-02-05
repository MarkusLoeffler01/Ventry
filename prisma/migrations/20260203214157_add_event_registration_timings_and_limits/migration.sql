-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "maxRegistrations" INTEGER,
ADD COLUMN     "paymentDueMinutes" INTEGER NOT NULL DEFAULT 1440,
ADD COLUMN     "publishAt" TIMESTAMP(3),
ADD COLUMN     "registrationOpensAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "expiresAt" TIMESTAMP(3);
