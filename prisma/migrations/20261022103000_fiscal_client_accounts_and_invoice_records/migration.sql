CREATE TABLE "FiscalClientAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "tenantName" TEXT NOT NULL,
  "tenantSlug" TEXT NOT NULL,
  "encryptedApiKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalClientAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FiscalInvoiceRecord" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "cuit" TEXT NOT NULL,
  "pointOfSale" INTEGER NOT NULL,
  "voucherType" INTEGER NOT NULL,
  "voucherNumber" INTEGER NOT NULL,
  "result" TEXT,
  "cae" TEXT,
  "caeExpiresAt" TIMESTAMP(3),
  "amount" DECIMAL(14,2),
  "currency" TEXT DEFAULT 'PES',
  "jobId" TEXT,
  "requestReference" TEXT,
  "invoicePdfUrl" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalInvoiceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FiscalClientAccount_userId_key" ON "FiscalClientAccount"("userId");
CREATE UNIQUE INDEX "FiscalClientAccount_tenantId_key" ON "FiscalClientAccount"("tenantId");
CREATE UNIQUE INDEX "FiscalClientAccount_tenantSlug_key" ON "FiscalClientAccount"("tenantSlug");
CREATE INDEX "FiscalClientAccount_status_createdAt_idx" ON "FiscalClientAccount"("status", "createdAt");
CREATE UNIQUE INDEX "FiscalInvoiceRecord_environment_cuit_pointOfSale_voucherType_voucherNumber_key" ON "FiscalInvoiceRecord"("environment", "cuit", "pointOfSale", "voucherType", "voucherNumber");
CREATE INDEX "FiscalInvoiceRecord_accountId_createdAt_idx" ON "FiscalInvoiceRecord"("accountId", "createdAt");
CREATE INDEX "FiscalInvoiceRecord_accountId_environment_cuit_createdAt_idx" ON "FiscalInvoiceRecord"("accountId", "environment", "cuit", "createdAt");
CREATE INDEX "FiscalInvoiceRecord_jobId_idx" ON "FiscalInvoiceRecord"("jobId");

ALTER TABLE "FiscalClientAccount"
ADD CONSTRAINT "FiscalClientAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FiscalInvoiceRecord"
ADD CONSTRAINT "FiscalInvoiceRecord_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "FiscalClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
