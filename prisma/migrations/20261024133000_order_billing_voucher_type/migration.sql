ALTER TABLE "Order"
  ADD COLUMN "billingName" TEXT,
  ADD COLUMN "billingVoucherType" TEXT,
  ADD COLUMN "billingServiceFrom" TIMESTAMP(3),
  ADD COLUMN "billingServiceTo" TIMESTAMP(3),
  ADD COLUMN "billingPaymentDueDate" TIMESTAMP(3);
