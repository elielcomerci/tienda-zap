CREATE TABLE "FiscalFeatureFlag" (
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalFeatureFlag_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "FiscalFeatureFlag_enabled_idx" ON "FiscalFeatureFlag"("enabled");
