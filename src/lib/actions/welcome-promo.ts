'use server'

import { getWelcomePromoDetails as getDetailsFromCoupons } from '@/lib/coupons'

export async function getWelcomePromoDetails(couponCode: string) {
  return getDetailsFromCoupons(couponCode)
}
