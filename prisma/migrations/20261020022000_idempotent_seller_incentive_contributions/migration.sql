CREATE TABLE "SellerIncentiveOrderContribution" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "incentiveId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SellerIncentiveOrderContribution_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SellerIncentiveOrderContribution_orderId_incentiveId_key" ON "SellerIncentiveOrderContribution"("orderId", "incentiveId");
CREATE INDEX "SellerIncentiveOrderContribution_sellerId_incentiveId_idx" ON "SellerIncentiveOrderContribution"("sellerId", "incentiveId");
