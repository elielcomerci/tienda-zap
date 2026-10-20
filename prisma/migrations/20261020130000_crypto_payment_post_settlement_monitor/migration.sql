ALTER TABLE "CryptoPayment" ADD COLUMN "lastCanonicalCheckAt" TIMESTAMP(3);

CREATE INDEX "CryptoPayment_status_lastCanonicalCheckAt_idx" ON "CryptoPayment"("status", "lastCanonicalCheckAt");
