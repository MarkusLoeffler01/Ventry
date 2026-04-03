-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "customFields" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "customFieldData" JSONB NOT NULL DEFAULT '{}';
