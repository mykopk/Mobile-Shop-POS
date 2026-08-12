PRAGMA foreign_keys=OFF;
ALTER TABLE "company_profiles" ADD COLUMN "compactPrices" BOOLEAN NOT NULL DEFAULT 1;
PRAGMA foreign_keys=ON;
