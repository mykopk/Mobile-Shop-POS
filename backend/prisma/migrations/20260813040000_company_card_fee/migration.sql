PRAGMA foreign_keys=OFF;
ALTER TABLE "company_profiles" ADD COLUMN "cardFee" DECIMAL NOT NULL DEFAULT 0;
PRAGMA foreign_keys=ON;
