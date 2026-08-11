-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- Seed brands from existing product data
INSERT INTO "brands" ("id", "name", "sortOrder", "active")
SELECT 'brand-' || lower(replace("brand", ' ', '-')), "brand", 10, true
FROM (SELECT DISTINCT "brand" FROM "Product" WHERE "brand" IS NOT NULL AND "brand" <> '');

-- Ensure a fallback brand exists
INSERT INTO "brands" ("id", "name", "sortOrder", "active") VALUES ('brand-other', 'Other', 99, true)
ON CONFLICT("name") DO NOTHING;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brandId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "storage" TEXT,
    "color" TEXT,
    "categoryId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "image" TEXT,
    "specs" TEXT,
    "sellPrice" DECIMAL NOT NULL,
    "costPrice" DECIMAL NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Product" ("id", "brandId", "model", "storage", "color", "categoryId", "sku", "barcode", "image", "specs", "sellPrice", "costPrice", "lowStockThreshold", "createdAt")
SELECT p."id", b."id", p."model", p."storage", p."color", p."categoryId", p."sku", p."barcode", p."image", p."specs", p."sellPrice", p."costPrice", p."lowStockThreshold", p."createdAt"
FROM "Product" p
JOIN "brands" b ON b."name" = p."brand";

DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_model_idx" ON "Product"("model");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
