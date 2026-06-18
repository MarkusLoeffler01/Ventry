CREATE TABLE "BadgeTemplate" (
    "id" TEXT NOT NULL,
    "eventId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "widthMm" DOUBLE PRECISION NOT NULL DEFAULT 85,
    "heightMm" DOUBLE PRECISION NOT NULL DEFAULT 55,
    "background" JSONB NOT NULL DEFAULT '{}',
    "elements" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BadgeTemplate_eventId_idx" ON "BadgeTemplate"("eventId");
CREATE INDEX "BadgeTemplate_eventId_isDefault_idx" ON "BadgeTemplate"("eventId", "isDefault");

ALTER TABLE "BadgeTemplate"
ADD CONSTRAINT "BadgeTemplate_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
