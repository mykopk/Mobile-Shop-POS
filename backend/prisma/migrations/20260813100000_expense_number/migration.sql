PRAGMA foreign_keys=OFF;
ALTER TABLE "Expense" ADD COLUMN "number" TEXT NOT NULL DEFAULT '';
PRAGMA foreign_keys=ON;