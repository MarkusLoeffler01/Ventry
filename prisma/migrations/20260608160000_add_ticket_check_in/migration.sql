ALTER TABLE "user"
ADD COLUMN "legalName" TEXT,
ADD COLUMN "addressLine1" TEXT,
ADD COLUMN "addressLine2" TEXT,
ADD COLUMN "addressCity" TEXT,
ADD COLUMN "addressState" TEXT,
ADD COLUMN "addressPostalCode" TEXT,
ADD COLUMN "addressCountry" TEXT;

ALTER TABLE "Event"
ADD COLUMN "scanOnce" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Registration"
ADD COLUMN "checkedInAt" TIMESTAMP(3),
ADD COLUMN "checkedInByAdminId" TEXT,
ADD COLUMN "checkInCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "RegistrationCheckInLog" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT,
    "eventId" INTEGER NOT NULL,
    "adminId" TEXT,
    "ticketId" INTEGER NOT NULL,
    "clientOperationId" TEXT NOT NULL,
    "clientScannedAt" TIMESTAMP(3),
    "serverProcessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL,
    "notes" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "RegistrationCheckInLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationCheckInLog_clientOperationId_key" ON "RegistrationCheckInLog"("clientOperationId");
CREATE INDEX "Registration_eventId_ticketId_idx" ON "Registration"("eventId", "ticketId");
CREATE INDEX "Registration_checkedInByAdminId_idx" ON "Registration"("checkedInByAdminId");
CREATE INDEX "RegistrationCheckInLog_eventId_ticketId_idx" ON "RegistrationCheckInLog"("eventId", "ticketId");
CREATE INDEX "RegistrationCheckInLog_registrationId_idx" ON "RegistrationCheckInLog"("registrationId");
CREATE INDEX "RegistrationCheckInLog_adminId_idx" ON "RegistrationCheckInLog"("adminId");

ALTER TABLE "Registration"
ADD CONSTRAINT "Registration_checkedInByAdminId_fkey"
FOREIGN KEY ("checkedInByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RegistrationCheckInLog"
ADD CONSTRAINT "RegistrationCheckInLog_registrationId_fkey"
FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationCheckInLog"
ADD CONSTRAINT "RegistrationCheckInLog_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationCheckInLog"
ADD CONSTRAINT "RegistrationCheckInLog_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
