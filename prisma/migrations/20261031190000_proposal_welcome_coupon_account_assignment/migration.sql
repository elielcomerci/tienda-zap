ALTER TABLE "PromotionCoupon"
  ADD COLUMN "assignedUserId" TEXT,
  ADD COLUMN "welcomeShownAt" TIMESTAMP(3);

ALTER TABLE "CommercialProposal"
  ADD COLUMN "welcomeCouponCode" TEXT;

CREATE INDEX "PromotionCoupon_assignedUserId_welcomeShownAt_idx"
  ON "PromotionCoupon"("assignedUserId", "welcomeShownAt");

CREATE UNIQUE INDEX "CommercialProposal_welcomeCouponCode_key"
  ON "CommercialProposal"("welcomeCouponCode");

ALTER TABLE "PromotionCoupon"
  ADD CONSTRAINT "PromotionCoupon_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommercialProposal"
  ADD CONSTRAINT "CommercialProposal_welcomeCouponCode_fkey"
  FOREIGN KEY ("welcomeCouponCode") REFERENCES "PromotionCoupon"("code")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Reservations created by the previous single-use implementation had not
-- deducted their use yet. Reserve that use now so the new multi-use flow
-- starts from the correct remaining balance.
WITH pending AS (
  SELECT "couponCode", COUNT(*)::INTEGER AS "reservedCount"
  FROM "CouponRedemption"
  WHERE "status" = 'RESERVED'
  GROUP BY "couponCode"
)
UPDATE "PromotionCoupon" AS coupon
SET
  "usesLeft" = GREATEST(0, coupon."usesLeft" - pending."reservedCount"),
  "status" = CASE
    WHEN GREATEST(0, coupon."usesLeft" - pending."reservedCount") = 0
      THEN 'RESERVED'::"CouponStatus"
    ELSE 'AVAILABLE'::"CouponStatus"
  END
FROM pending
WHERE coupon."code" = pending."couponCode"
  AND coupon."status" = 'RESERVED';
