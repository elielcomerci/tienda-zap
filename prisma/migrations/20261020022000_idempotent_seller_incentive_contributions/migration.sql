CREATE TABLE "SellerIncentiveOrderContribution" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "incentiveId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SellerIncentiveOrderContribution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SellerIncentiveOrderContribution_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SellerIncentiveOrderContribution_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SellerIncentiveOrderContribution_incentiveId_fkey" FOREIGN KEY ("incentiveId") REFERENCES "SellerIncentive"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SellerIncentiveOrderContribution_orderId_incentiveId_key" ON "SellerIncentiveOrderContribution"("orderId", "incentiveId");
CREATE INDEX "SellerIncentiveOrderContribution_sellerId_incentiveId_idx" ON "SellerIncentiveOrderContribution"("sellerId", "incentiveId");
