'use server'

import { prisma } from '@/lib/prisma'
import { normalizeCouponCode } from '@/lib/coupons'

export async function getWelcomePromoDetails(couponCode: string) {
  const normalizedCode = normalizeCouponCode(couponCode)
  if (!normalizedCode) return null

  const coupon = await prisma.promotionCoupon.findUnique({
    where: { code: normalizedCode },
    include: { promotion: true }
  })

  if (!coupon || coupon.promotion.status !== 'ACTIVE') {
    return null
  }

  const promo = coupon.promotion

  if (!promo.welcomeTitle && !promo.welcomeMessage) {
    return null // Solo mostramos modal si la promoción está configurada para ello
  }

  // Verificar si la promo no venció y el cupón está disponible
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
    discountKind: promo.discountKind,
    discountValue: promo.discountValue,
  }
}
