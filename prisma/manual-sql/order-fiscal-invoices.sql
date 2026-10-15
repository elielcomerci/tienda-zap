-- Persistencia de facturas fiscales emitidas por ARCA.
-- Ejecutar una vez en la base de datos de Tienda ZAP antes de desplegar el código.
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "invoiceSource" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "invoicePdfStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceFiscalJobId" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceExternalId" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceIdempotencyKey" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceRecipientSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "invoiceLineItemsSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "invoiceAmountsSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "invoiceVoucherType" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceEmitterCuit" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceEmitterIibb" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceEmitterPointOfSale" INTEGER,
  ADD COLUMN IF NOT EXISTS "invoiceEmitterEnvironment" TEXT,
  ADD COLUMN IF NOT EXISTS "invoicePointOfSale" INTEGER,
  ADD COLUMN IF NOT EXISTS "invoiceVoucherNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "invoiceCae" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceCaeExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "invoiceIssuedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "invoiceObjectKey" TEXT,
  ADD COLUMN IF NOT EXISTS "invoicePdfGeneratedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "invoiceError" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_invoiceFiscalJobId_key"
  ON "Order"("invoiceFiscalJobId");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_invoiceExternalId_key"
  ON "Order"("invoiceExternalId");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_invoiceIdempotencyKey_key"
  ON "Order"("invoiceIdempotencyKey");
CREATE INDEX IF NOT EXISTS "Order_userId_invoiceStatus_idx"
  ON "Order"("userId", "invoiceStatus");

-- Clasificación fiscal por producto y snapshot en cada línea del pedido.
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "fiscalTaxTreatment" TEXT,
  ADD COLUMN IF NOT EXISTS "fiscalVatRate" DOUBLE PRECISION;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "fiscalTaxTreatment" TEXT,
  ADD COLUMN IF NOT EXISTS "fiscalVatRate" DOUBLE PRECISION;
