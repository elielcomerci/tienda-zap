ALTER TABLE "FiscalInvoiceRecord" ALTER COLUMN "voucherNumber" DROP NOT NULL;
DROP INDEX IF EXISTS "FiscalInvoiceRecord_jobId_idx";
CREATE UNIQUE INDEX "FiscalInvoiceRecord_jobId_key" ON "FiscalInvoiceRecord"("jobId");
