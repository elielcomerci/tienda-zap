CREATE TABLE "FiscalSavedCustomer" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "vatCondition" TEXT,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FiscalSavedCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FiscalSavedProduct" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unidad',
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "vatRatePercent" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FiscalSavedProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FiscalSavedCustomer_accountId_name_idx" ON "FiscalSavedCustomer"("accountId", "name");
CREATE INDEX "FiscalSavedCustomer_accountId_documentNumber_idx" ON "FiscalSavedCustomer"("accountId", "documentNumber");
CREATE INDEX "FiscalSavedProduct_accountId_description_idx" ON "FiscalSavedProduct"("accountId", "description");

ALTER TABLE "FiscalSavedCustomer" ADD CONSTRAINT "FiscalSavedCustomer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FiscalClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FiscalSavedProduct" ADD CONSTRAINT "FiscalSavedProduct_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FiscalClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
