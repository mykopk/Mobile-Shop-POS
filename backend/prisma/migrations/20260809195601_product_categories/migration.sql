-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "storage" TEXT,
    "color" TEXT,
    "category" TEXT NOT NULL DEFAULT 'PHONE_NEW',
    "sku" TEXT,
    "barcode" TEXT,
    "image" TEXT,
    "specs" TEXT,
    "sellPrice" DECIMAL NOT NULL,
    "costPrice" DECIMAL NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Product" ("barcode", "brand", "category", "color", "costPrice", "createdAt", "id", "image", "lowStockThreshold", "model", "sellPrice", "sku", "specs", "storage") SELECT "barcode", "brand", "category", "color", "costPrice", "createdAt", "id", "image", "lowStockThreshold", "model", "sellPrice", "sku", "specs", "storage" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_brand_model_idx" ON "Product"("brand", "model");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
