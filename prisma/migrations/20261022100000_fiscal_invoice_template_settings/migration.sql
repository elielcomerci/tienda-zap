CREATE TABLE "FiscalInvoiceTemplate" (
  "id" TEXT NOT NULL,
  "accountId" TEXT,
  "template" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalInvoiceTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FiscalInvoiceTemplate_accountId_key" ON "FiscalInvoiceTemplate"("accountId");
