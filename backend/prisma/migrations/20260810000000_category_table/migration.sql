-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PHONE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- Seed default categories
INSERT INTO "categories" ("id", "name", "type", "sortOrder", "active") VALUES
('cat-phone-new', 'New Phone', 'PHONE', 1, true),
('cat-phone-used', 'Used Phone', 'PHONE', 2, true),
('cat-accessory', 'Accessory', 'ACCESSORY', 3, true);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
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
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Product" ("id", "brand", "model", "storage", "color", "categoryId", "sku", "barcode", "image", "specs", "sellPrice", "costPrice", "lowStockThreshold", "createdAt")
SELECT "id", "brand", "model", "storage", "color",
       CASE "category"
         WHEN 'PHONE_NEW' THEN 'cat-phone-new'
         WHEN 'PHONE_USED' THEN 'cat-phone-used'
         ELSE 'cat-accessory'
       END,
       "sku", "barcode", "image", "specs", "sellPrice", "costPrice", "lowStockThreshold", "createdAt"
FROM "Product";

DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_brand_model_idx" ON "Product"("brand", "model");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
