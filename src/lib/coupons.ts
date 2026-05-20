import {
  CouponRedemptionStatus,
  CouponStatus,
  DiscountKind,
  PromotionStatus,
  Prisma,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveCheckoutOrderItems } from '@/lib/checkout-orders'

const COUPON_QUERY_KEYS = ['coupon', 'couponCode', 'code', 'promo', 'voucher', 'c']
const COUPON_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/

type CouponPreviewItem = {
  productId: string
  quantity: number
  notes?: string
  briefType?: 'NONE' | 'DESIGN' | 'MUSIC' | 'VIDEO'
  briefResponses?: Record<string, string>
  briefReferenceLinks?: string[]
  briefReferenceFiles?: Array<{
    url: string
    objectKey?: string
    fileName: string
    contentType?: string
    sizeBytes?: number
  }>
  designRequested?: boolean
  selectedOptions?: Array<{ name: string; value: string }>
}

type CouponDbClient = typeof prisma | Prisma.TransactionClient
type ResolvedCheckoutItems = Awaited<ReturnType<typeof resolveCheckoutOrderItems>>['resolvedItems']

type CouponLookup = Awaited<ReturnType<typeof loadCouponRecord>>

export type AppliedCouponSummary = {
  code: string
  promotionId: string
  promotionName: string
  presenterName?: string | null
  discountKind: DiscountKind
  discountValue: number
  discountAmount: number
}

export type CheckoutPricingResult = {
  resolvedItems: ResolvedCheckoutItems
  subtotal: number
  discountTotal: number
  total: number
  couponCode?: string
  appliedCoupon?: AppliedCouponSummary
  pricingSnapshot: Prisma.InputJsonValue
}

export type CouponPreviewResult = {
  status: 'recognized' | 'invalid'
  normalizedCode?: string
  title: string
  detail: string
  originalTotal: number
  finalTotal: number
  discountAmount: number
  presenterName?: string | null
}

function getCouponMetadataString(metadata: Prisma.JsonValue | null | undefined, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function getCouponPresenterName(coupon: {
  recipientBusiness?: string | null
  recipientName?: string | null
  metadata?: Prisma.JsonValue | null
}) {
  return (
    getCouponMetadataString(coupon.metadata, 'publicPresenterName') ||
    coupon.recipientBusiness?.trim() ||
    coupon.recipientName?.trim() ||
    null
  )
}

function normalizeCouponSegment(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
}

function looksLikeCouponCode(value: string) {
  return value.length >= 4 && value.length <= 40 && COUPON_CODE_PATTERN.test(value)
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function buildInvalidCouponPreview(
  originalTotal: number,
  detail = 'No encontramos un cupon válido con ese código.'
): CouponPreviewResult {
  return {
    status: 'invalid',
    title: 'Cupon no disponible',
    detail,
    originalTotal,
    finalTotal: originalTotal,
    discountAmount: 0,
  }
}

function isPromotionCurrentlyActive(
  promotion: { status: PromotionStatus; activeFrom: Date | null; activeTo: Date | null },
  now: Date
) {
  if (promotion.status !== 'ACTIVE') return false
  if (promotion.activeFrom && promotion.activeFrom > now) return false
  if (promotion.activeTo && promotion.activeTo < now) return false
  return true
}

function calculateDiscountAmount(subtotal: number, discountKind: DiscountKind, discountValue: number) {
  if (subtotal <= 0 || discountValue <= 0) return 0

  const rawDiscount =
    discountKind === 'PERCENTAGE' ? subtotal * (discountValue / 100) : discountValue

  return Math.min(roundCurrency(rawDiscount), roundCurrency(subtotal))
}

async function loadCouponRecord(db: CouponDbClient, normalizedCode: string) {
  return db.promotionCoupon.findUnique({
    where: { code: normalizedCode },
    include: {
      promotion: true,
    },
  })
}

async function evaluateCouponRecord(input: {
  db: CouponDbClient
  coupon: NonNullable<CouponLookup>
  subtotal: number
  userId?: string
  now?: Date
}) {
  const { db, coupon, subtotal, userId } = input
  const now = input.now ?? new Date()

  if (!isPromotionCurrentlyActive(coupon.promotion, now)) {
    return {
      ok: false as const,
      detail: 'Este cupon no esta activo en este momento.',
    }
  }

  if (coupon.status !== 'AVAILABLE') {
    return {
      ok: false as const,
      detail:
        coupon.status === 'USED'
          ? 'Este cupon ya fue usado.'
          : coupon.status === 'RESERVED'
            ? 'Este cupon ya esta reservado en otro pedido.'
            : 'Este cupon ya no esta disponible.',
    }
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    return {
      ok: false as const,
      detail: 'Este cupon ya vencio.',
    }
  }

  if (coupon.usesLeft <= 0) {
    return {
      ok: false as const,
      detail: 'Este cupon ya no tiene usos disponibles.',
    }
  }

  if (coupon.promotion.maxUses != null) {
    const confirmedPromotionUses = await db.couponRedemption.count({
      where: {
        promotionId: coupon.promotionId,
        status: CouponRedemptionStatus.CONFIRMED,
      },
    })

    if (confirmedPromotionUses >= coupon.promotion.maxUses) {
      return {
        ok: false as const,
        detail: 'Esta promocion ya alcanzo su limite de uso.',
      }
    }
  }

  if (userId && coupon.promotion.perUserLimit != null) {
    const confirmedUserUses = await db.couponRedemption.count({
      where: {
        promotionId: coupon.promotionId,
        status: CouponRedemptionStatus.CONFIRMED,
        order: {
          userId,
        },
      },
    })

    if (confirmedUserUses >= coupon.promotion.perUserLimit) {
      return {
        ok: false as const,
        detail: 'Ya usaste esta promocion el maximo de veces permitido.',
      }
    }
  }

  const discountAmount = calculateDiscountAmount(
    subtotal,
    coupon.promotion.discountKind,
    coupon.promotion.discountValue
  )

  if (discountAmount <= 0) {
    return {
      ok: false as const,
      detail: 'Este cupon no genera descuento para el pedido actual.',
    }
  }

  return {
    ok: true as const,
    discountAmount,
    appliedCoupon: {
      code: coupon.code,
      promotionId: coupon.promotion.id,
      promotionName: coupon.promotion.name,
      presenterName: getCouponPresenterName(coupon),
      discountKind: coupon.promotion.discountKind,
      discountValue: coupon.promotion.discountValue,
      discountAmount,
    } satisfies AppliedCouponSummary,
  }
}

export function extractCouponCode(rawValue: string) {
  const trimmedValue = rawValue.trim()
  if (!trimmedValue) return ''

  try {
    const url = new URL(trimmedValue)

    for (const key of COUPON_QUERY_KEYS) {
      const queryValue = url.searchParams.get(key)
      if (!queryValue) continue

      const normalizedQueryValue = normalizeCouponSegment(queryValue)
      if (looksLikeCouponCode(normalizedQueryValue)) {
        return normalizedQueryValue
      }
    }

    const pathnameSegments = url.pathname
      .split('/')
      .map((segment) => normalizeCouponSegment(segment))
      .filter(Boolean)

    for (const segment of pathnameSegments.reverse()) {
      if (looksLikeCouponCode(segment)) {
        return segment
      }
    }
  } catch {
    // Ignore invalid URLs and treat the raw value as a plain coupon code.
  }

  return normalizeCouponSegment(trimmedValue)
}

export function normalizeCouponCode(rawValue?: string | null) {
  return rawValue ? extractCouponCode(rawValue) : ''
}

export function buildCouponLandingUrl(code: string, baseUrl?: string | null) {
  const normalizedCode = normalizeCouponCode(code)
  const path = `/cupon/${encodeURIComponent(normalizedCode)}`
  const trimmedBaseUrl = baseUrl?.trim()

  if (trimmedBaseUrl) {
    try {
      const url = new URL(trimmedBaseUrl)
      url.pathname = path
      url.search = ''
      url.hash = ''
      return url.toString()
    } catch {
      // If the admin entered a relative base, fall through to the safe string join.
    }
  }

  const normalizedBaseUrl = trimmedBaseUrl?.replace(/\/+$/, '')

  return normalizedBaseUrl ? `${normalizedBaseUrl}${path}` : path
}

export function isCouponCodeFormatValid(rawValue?: string | null) {
  const normalizedCode = normalizeCouponCode(rawValue)
  return looksLikeCouponCode(normalizedCode)
}

export async function recordCouponScan(input: {
  couponCode: string
  userAgent?: string | null
  referrer?: string | null
}) {
  const normalizedCode = normalizeCouponCode(input.couponCode)

  if (!looksLikeCouponCode(normalizedCode)) {
    return null
  }

  const coupon = await prisma.promotionCoupon.findUnique({
    where: { code: normalizedCode },
    select: { code: true },
  })

  if (!coupon) {
    return null
  }

  await prisma.$transaction([
    prisma.couponScan.create({
      data: {
        couponCode: normalizedCode,
        userAgent: input.userAgent?.slice(0, 300) || null,
        referrer: input.referrer?.slice(0, 500) || null,
      },
    }),
    prisma.promotionCoupon.update({
      where: { code: normalizedCode },
      data: {
        scanCount: { increment: 1 },
        lastScannedAt: new Date(),
      },
    }),
  ])

  return normalizedCode
}

export async function evaluateCheckoutPricing(input: {
  items: CouponPreviewItem[]
  couponCode?: string | null
  userId?: string
  db?: CouponDbClient
}): Promise<CheckoutPricingResult> {
  const db = input.db ?? prisma
  const { resolvedItems, total: subtotal } = await resolveCheckoutOrderItems(input.items)
  const normalizedCode = normalizeCouponCode(input.couponCode)

  if (!normalizedCode) {
    return {
      resolvedItems,
      subtotal,
      discountTotal: 0,
      total: subtotal,
      pricingSnapshot: {
        subtotal,
        discountTotal: 0,
        total: subtotal,
        appliedCoupon: null,
      } as Prisma.InputJsonObject,
    }
  }

  if (!looksLikeCouponCode(normalizedCode)) {
    throw new Error(
      'El código de cupon no tiene un formato válido. Revisá letras, números y guiones.'
    )
  }

  const coupon = await loadCouponRecord(db, normalizedCode)
  if (!coupon) {
    throw new Error('No encontramos un cupon activo con ese código.')
  }

  const evaluation = await evaluateCouponRecord({
    db,
    coupon,
    subtotal,
    userId: input.userId,
  })

  if (!evaluation.ok) {
    throw new Error(evaluation.detail)
  }

  const total = roundCurrency(subtotal - evaluation.discountAmount)

  return {
    resolvedItems,
    subtotal,
    discountTotal: evaluation.discountAmount,
    total,
    couponCode: normalizedCode,
    appliedCoupon: evaluation.appliedCoupon,
    pricingSnapshot: {
      subtotal,
      discountTotal: evaluation.discountAmount,
      total,
      appliedCoupon: evaluation.appliedCoupon,
    } as Prisma.InputJsonObject,
  }
}

export async function previewCheckoutCoupon(input: {
  couponCode: string
  items: CouponPreviewItem[]
  userId?: string
}): Promise<CouponPreviewResult> {
  const { total } = await resolveCheckoutOrderItems(input.items)
  const normalizedCode = normalizeCouponCode(input.couponCode)

  if (!looksLikeCouponCode(normalizedCode)) {
    return buildInvalidCouponPreview(
      total,
      'Prueba escanear de nuevo o ingresa el código manualmente con letras, números y guiones.'
    )
  }

  try {
    const pricing = await evaluateCheckoutPricing({
      items: input.items,
      couponCode: normalizedCode,
      userId: input.userId,
    })
    const presenterName = pricing.appliedCoupon?.presenterName

    return {
      status: 'recognized',
      normalizedCode,
      title: pricing.discountTotal > 0 ? 'Cupon validado' : 'Cupon capturado',
      detail:
        pricing.discountTotal > 0
          ? `Aplicamos ${pricing.appliedCoupon?.promotionName ?? 'la promocion'} a este pedido.`
          : 'El código quedo cargado, pero no genero descuento para este pedido.',
      originalTotal: pricing.subtotal,
      finalTotal: pricing.total,
      discountAmount: pricing.discountTotal,
      presenterName,
    }
  } catch (error: any) {
    return buildInvalidCouponPreview(total, error.message || 'No encontramos un cupon válido.')
  }
}

export async function reserveCouponRedemptionForOrder(input: {
  tx: Prisma.TransactionClient
  orderId: string
  couponCode: string
  subtotal: number
  discountTotal: number
  userId?: string
}) {
  const normalizedCode = normalizeCouponCode(input.couponCode)
  const coupon = await loadCouponRecord(input.tx, normalizedCode)

  if (!coupon) {
    throw new Error('No encontramos el cupon al confirmar el pedido.')
  }

  const evaluation = await evaluateCouponRecord({
    db: input.tx,
    coupon,
    subtotal: input.subtotal,
    userId: input.userId,
  })

  if (!evaluation.ok) {
    throw new Error(evaluation.detail)
  }

  if (roundCurrency(evaluation.discountAmount) !== roundCurrency(input.discountTotal)) {
    throw new Error('El valor del cupon cambio mientras confirmabamos el pedido. Revisá el checkout.')
  }

  const reservedCoupon = await input.tx.promotionCoupon.updateMany({
    where: {
      code: normalizedCode,
      status: CouponStatus.AVAILABLE,
      usesLeft: {
        gt: 0,
      },
    },
    data: {
      status: CouponStatus.RESERVED,
    },
  })

  if (reservedCoupon.count !== 1) {
    throw new Error('Otro pedido reservo este cupon antes. Prueba con otro código.')
  }

  await input.tx.couponRedemption.create({
    data: {
      orderId: input.orderId,
      promotionId: coupon.promotionId,
      couponCode: normalizedCode,
      status: CouponRedemptionStatus.RESERVED,
      discountAmount: input.discountTotal,
    },
  })
}

export async function confirmCouponRedemptionForOrder(orderId: string) {
  const redemption = await prisma.couponRedemption.findUnique({
    where: { orderId },
  })

  if (!redemption || redemption.status === CouponRedemptionStatus.CONFIRMED) {
    return
  }

  if (redemption.status !== CouponRedemptionStatus.RESERVED) {
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.couponRedemption.update({
      where: { orderId },
      data: {
        status: CouponRedemptionStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    })

    await tx.promotionCoupon.update({
      where: { code: redemption.couponCode },
      data: {
        status: CouponStatus.USED,
        usesLeft: {
          decrement: 1,
        },
      },
    })
  })
}

export async function releaseCouponRedemptionForOrder(orderId: string) {
  const redemption = await prisma.couponRedemption.findUnique({
    where: { orderId },
  })

  if (!redemption || redemption.status !== CouponRedemptionStatus.RESERVED) {
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.couponRedemption.update({
      where: { orderId },
      data: {
        status: CouponRedemptionStatus.RELEASED,
        releasedAt: new Date(),
      },
    })

    await tx.promotionCoupon.update({
      where: { code: redemption.couponCode },
      data: {
        status: CouponStatus.AVAILABLE,
      },
    })
  })
}
