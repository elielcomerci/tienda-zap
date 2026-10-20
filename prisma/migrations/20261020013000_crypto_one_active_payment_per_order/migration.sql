-- Prevent concurrent quote requests from creating multiple active payments for one order.
-- REVIEW remains blocking until a human resolves the payment.
CREATE UNIQUE INDEX "CryptoPayment_one_active_per_order_key"
  ON "CryptoPayment" ("orderId")
  WHERE "status" IN (
    'QUOTED',
    'AWAITING_PAYMENT',
    'TX_SUBMITTED',
    'DETECTED',
    'CONFIRMING',
    'VERIFIED',
    'REVIEW'
  );
