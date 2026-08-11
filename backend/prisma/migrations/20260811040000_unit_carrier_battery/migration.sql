-- Add carrier + batteryHealth to Unit
ALTER TABLE "Unit" ADD COLUMN "carrier" TEXT NOT NULL DEFAULT 'NON_PTA';
ALTER TABLE "Unit" ADD COLUMN "batteryHealth" INTEGER;
