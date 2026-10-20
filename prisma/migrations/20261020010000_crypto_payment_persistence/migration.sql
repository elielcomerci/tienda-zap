-- Crypto checkout persistence. This migration is additive; it does not change existing payment flows.
ALTER TYPE "PaymentType" ADD VALUE IF NOT EXISTS 'CRYPTO';

CREATE TYPE "CryptoPaymentStatus" AS ENUM (
  'QUOTED',
  'AWAITING_PAYMENT',
  'TX_SUBMITTED',
  'DETECTED',
  'CONFIRMING',
  'VERIFIED',
  'EXPIRED',
  'REVIEW',
  'CANCELLED'
);

CREATE TABLE "CryptoPayment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" "CryptoPaymentStatus" NOT NULL DEFAULT 'QUOTED',
  "arsAmount" DECIMAL(18,2) NOT NULL,
  "tokenAmount" DECIMAL(36,18) NOT NULL,
  "amountUnits" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "networkKey" TEXT NOT NULL,
  "tokenSymbol" TEXT NOT NULL,
  "tokenContract" TEXT NOT NULL,
  "tokenDecimals" INTEGER NOT NULL,
  "recipientAddress" TEXT NOT NULL,
  "quotePriceArs" DECIMAL(30,12) NOT NULL,
  "quoteSource" TEXT NOT NULL,
  "quoteObservedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "txHash" TEXT,
  "logIndex" INTEGER,
  "blockNumber" BIGINT,
  "confirmations" INTEGER NOT NULL DEFAULT 0,
  "detectedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "reviewReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CryptoPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CryptoPayment_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CryptoPayment_chainId_txHash_logIndex_key"
  ON "CryptoPayment"("chainId", "txHash", "logIndex");
CREATE INDEX "CryptoPayment_orderId_status_idx"
  ON "CryptoPayment"("orderId", "status");
CREATE INDEX "CryptoPayment_status_expiresAt_idx"
  ON "CryptoPayment"("status", "expiresAt");
CREATE INDEX "CryptoPayment_chainId_txHash_idx"
  ON "CryptoPayment"("chainId", "txHash");
