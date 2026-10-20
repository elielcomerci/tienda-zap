ALTER TABLE "OrderEvent" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "OrderEvent_idempotencyKey_key" ON "OrderEvent"("idempotencyKey");
