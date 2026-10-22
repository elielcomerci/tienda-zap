CREATE TABLE "FiscalContributor" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "cuit" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "representativeCuit" TEXT NOT NULL,
  "razonSocial" TEXT,
  "authorizationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "permissions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalContributor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FiscalContributor_accountId_cuit_environment_key" ON "FiscalContributor"("accountId", "cuit", "environment");
CREATE INDEX "FiscalContributor_accountId_authorizationStatus_idx" ON "FiscalContributor"("accountId", "authorizationStatus");
ALTER TABLE "FiscalContributor" ADD CONSTRAINT "FiscalContributor_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "FiscalClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
