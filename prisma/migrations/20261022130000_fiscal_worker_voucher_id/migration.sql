ALTER TABLE "FiscalInvoiceRecord"
ADD COLUMN "workerVoucherId" TEXT;

CREATE INDEX "FiscalInvoiceRecord_workerVoucherId_idx"
ON "FiscalInvoiceRecord"("workerVoucherId");
