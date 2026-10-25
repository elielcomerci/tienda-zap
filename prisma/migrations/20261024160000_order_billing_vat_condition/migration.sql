ALTER TABLE "Order"
  ADD COLUMN "billingVatCondition" INTEGER,
  ADD COLUMN "billingVatConfirmedAt" TIMESTAMP(3);
