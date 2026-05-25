'use server'

import { prisma } from '@/lib/prisma'
import { getCouponPresenterName, normalizeCouponCode } from '@/lib/coupons'

export async function getWelcomePromoDetails(couponCode: string) {
  const normalizedCode = normalizeCouponCode(couponCode)
  if (!normalizedCode) return null

  const coupon = await prisma.promotionCoupon.findUnique({
    where: { code: normalizedCode },
    include: { promotion: true },
  })

  if (!coupon || coupon.promotion.status !== 'ACTIVE') {
    return null
  }

  const promo = coupon.promotion
  const presenterName = getCouponPresenterName(coupon)

  const recipientName = coupon.recipientName?.trim() || null
  const recipientBusiness = coupon.recipientBusiness?.trim() || null
  const recipientLabel = recipientName || recipientBusiness

  if (!promo.welcomeTitle && !promo.welcomeMessage && !presenterName && !recipientLabel) {
    return null
  }

  const now = new Date()
  if (promo.activeFrom && promo.activeFrom > now) return null
  if (promo.activeTo && promo.activeTo < now) return null
  if (coupon.status !== 'AVAILABLE' || coupon.usesLeft <= 0) return null

  return {
    code: coupon.code,
    title: promo.welcomeTitle,
    message: promo.welcomeMessage,
    conditions: promo.welcomeConditions,
    logoUrl: promo.welcomeLogoUrl,
    presenterName,
    recipientName,
    recipientBusiness,
    recipientLabel,
    discountKind: promo.discountKind,
    discountValue: promo.discountValue,
  }
}
