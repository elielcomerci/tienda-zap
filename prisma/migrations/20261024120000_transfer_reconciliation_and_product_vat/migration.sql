ALTER TABLE "Product" ADD COLUMN "vatRatePercent" DOUBLE PRECISION;

CREATE TABLE "TransferPaymentReconciliation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "mercadoPagoPaymentId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "referenceSuffix" TEXT NOT NULL,
    "transferDate" DATE NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferPaymentReconciliation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TransferPaymentReconciliation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TransferPaymentReconciliation_orderId_key" ON "TransferPaymentReconciliation"("orderId");
CREATE UNIQUE INDEX "TransferPaymentReconciliation_mercadoPagoPaymentId_key" ON "TransferPaymentReconciliation"("mercadoPagoPaymentId");
CREATE UNIQUE INDEX "TransferPaymentReconciliation_transactionId_key" ON "TransferPaymentReconciliation"("transactionId");
CREATE INDEX "TransferPaymentReconciliation_transferDate_idx" ON "TransferPaymentReconciliation"("transferDate");
