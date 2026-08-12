PRAGMA foreign_keys=OFF;
ALTER TABLE "company_profiles" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi';
PRAGMA foreign_keys=ON;
