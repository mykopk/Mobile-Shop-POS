ALTER TABLE "print_layouts" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "print_layouts_isSystem_idx" ON "print_layouts"("isSystem");
