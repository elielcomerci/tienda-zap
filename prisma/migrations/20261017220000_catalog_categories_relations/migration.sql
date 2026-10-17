CREATE TYPE "ProductRelationType" AS ENUM ('UPSELL', 'COMPLEMENTARY', 'ALTERNATIVE');

ALTER TABLE "ProductRelation"
ADD COLUMN "type" "ProductRelationType" NOT NULL DEFAULT 'COMPLEMENTARY';

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_active_sortOrder_idx" ON "Category"("active", "sortOrder");

CREATE TABLE "ProductCategory" (
  "productId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId", "categoryId")
);
CREATE INDEX "ProductCategory_categoryId_sortOrder_idx" ON "ProductCategory"("categoryId", "sortOrder");
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Category" ("id","name","slug","sortOrder","updatedAt") VALUES
('cat_impresos_packaging','Impresos & Packaging','impresos-packaging',10,CURRENT_TIMESTAMP),
('cat_presencia_fisica','Presencia física','presencia-fisica',20,CURRENT_TIMESTAMP),
('cat_textil','Indumentaria & Textil','textil',30,CURRENT_TIMESTAMP),
('cat_digital','Soluciones digitales','digital',40,CURRENT_TIMESTAMP),
('cat_campanas','Campañas','campanas',50,CURRENT_TIMESTAMP),
('cat_talonarios_formularios','Talonarios & Formularios','talonarios-formularios',11,CURRENT_TIMESTAMP);

INSERT INTO "ProductCategory" ("productId","categoryId","sortOrder")
SELECT p."id", c."id", 0
FROM "Product" p
JOIN "Category" c ON c."slug" = CASE p."engine"::text
  WHEN 'IMPRESOS_PACKAGING' THEN 'impresos-packaging'
  WHEN 'PRESENCIA_FISICA' THEN 'presencia-fisica'
  WHEN 'TEXTIL' THEN 'textil'
  WHEN 'DIGITAL' THEN 'digital'
  WHEN 'CAMPANAS' THEN 'campanas'
END
WHERE p."engine" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "ProductCategory" ("productId","categoryId","sortOrder")
SELECT p."id", 'cat_talonarios_formularios', 0
FROM "Product" p
WHERE p."slug" IN ('bonos-para-lavaderos','talonarios-recibos','talonarios-remitos')
ON CONFLICT DO NOTHING;
