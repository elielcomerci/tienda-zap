CREATE TABLE "FiscalInvoiceTemplate" (
  "id" TEXT NOT NULL DEFAULT 'site-settings',
  "template" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalInvoiceTemplate_pkey" PRIMARY KEY ("id")
);
