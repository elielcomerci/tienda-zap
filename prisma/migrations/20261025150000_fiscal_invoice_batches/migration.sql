CREATE TABLE "FiscalInvoiceBatch" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'TSV',
    "sourceName" TEXT,
    "fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "rowCount" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FiscalInvoiceBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FiscalInvoiceBatchItem" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "environment" TEXT,
    "cuit" TEXT,
    "externalId" TEXT,
    "idempotencyKey" TEXT,
    "input" JSONB NOT NULL,
    "requestPayload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'INVALID',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "jobId" TEXT,
    "invoiceRecordId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FiscalInvoiceBatchItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FiscalInvoiceBatch_id_accountId_key" ON "FiscalInvoiceBatch"("id", "accountId");
CREATE UNIQUE INDEX "FiscalInvoiceBatch_accountId_fingerprint_key" ON "FiscalInvoiceBatch"("accountId", "fingerprint");
CREATE INDEX "FiscalInvoiceBatch_accountId_updatedAt_idx" ON "FiscalInvoiceBatch"("accountId", "updatedAt");
CREATE INDEX "FiscalInvoiceBatch_createdByUserId_createdAt_idx" ON "FiscalInvoiceBatch"("createdByUserId", "createdAt");

CREATE UNIQUE INDEX "FiscalInvoiceBatchItem_invoiceRecordId_key" ON "FiscalInvoiceBatchItem"("invoiceRecordId");
CREATE UNIQUE INDEX "FiscalInvoiceBatchItem_batchId_rowNumber_key" ON "FiscalInvoiceBatchItem"("batchId", "rowNumber");
CREATE UNIQUE INDEX "FiscalInvoiceBatchItem_accountId_idempotencyKey_key" ON "FiscalInvoiceBatchItem"("accountId", "idempotencyKey");
CREATE UNIQUE INDEX "FiscalInvoiceBatchItem_accountId_jobId_key" ON "FiscalInvoiceBatchItem"("accountId", "jobId");
CREATE INDEX "FiscalInvoiceBatchItem_accountId_status_updatedAt_idx" ON "FiscalInvoiceBatchItem"("accountId", "status", "updatedAt");

ALTER TABLE "FiscalInvoiceBatch"
    ADD CONSTRAINT "FiscalInvoiceBatch_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "FiscalClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FiscalInvoiceBatch"
    ADD CONSTRAINT "FiscalInvoiceBatch_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FiscalInvoiceBatchItem"
    ADD CONSTRAINT "FiscalInvoiceBatchItem_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "FiscalClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FiscalInvoiceBatchItem"
    ADD CONSTRAINT "FiscalInvoiceBatchItem_batchId_accountId_fkey"
    FOREIGN KEY ("batchId", "accountId") REFERENCES "FiscalInvoiceBatch"("id", "accountId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FiscalInvoiceBatchItem"
    ADD CONSTRAINT "FiscalInvoiceBatchItem_invoiceRecordId_fkey"
    FOREIGN KEY ("invoiceRecordId") REFERENCES "FiscalInvoiceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
