'use server'

import crypto from 'crypto'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
}

function normalizeOptionalDate(value?: string | null) {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeOptionalInt(value?: number | null) {
  if (value == null || Number.isNaN(value) || value <= 0) return null
  return Math.floor(value)
}

function buildCouponPrefix(rawPrefix: string) {
  const normalized = rawPrefix
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)

  return normalized || 'ZAP'
}

function computeChecksum(input: string) {
  let checksum = 0
  for (const char of input) {
    checksum = (checksum + char.charCodeAt(0)) % 36
  }

  return checksum.toString(36).toUpperCase()
}

function buildCouponCode(prefix: string) {
  const randomSegment = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8)
  const checksum = computeChecksum(`${prefix}${randomSegment}`)
  return `${prefix}-${randomSegment}-${checksum}`
}

async function generateUniqueCouponCodes(quantity: number, prefix: string) {
  const uniqueCodes = new Set<string>()

  while (uniqueCodes.size < quantity) {
    uniqueCodes.add(buildCouponCode(prefix))
  }

  const generatedCodes = Array.from(uniqueCodes)
  const existingCoupons = await prisma.promotionCoupon.findMany({
    where: {
      code: {
        in: generatedCodes,
      },
    },
    select: {
      code: true,
    },
  })

  if (existingCoupons.length === 0) {
    return generatedCodes
  }

  return generateUniqueCouponCodes(quantity, prefix)
}

export async function getPromotions() {
  await requireAdmin()

  return prisma.promotion.findMany({
    include: {
      _count: {
        select: {
          coupons: true,
          redemptions: true,
        },
      },
      coupons: {
        orderBy: { createdAt: 'desc' },
        take: 8,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export type PromotionInput = {
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED'
  priority?: number
  discountKind: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  stackable?: boolean
  activeFrom?: string | null
  activeTo?: string | null
  maxUses?: number | null
  perUserLimit?: number | null
}

function assertPromotionInput(data: PromotionInput) {
  if (!data.name.trim()) {
    throw new Error('El nombre de la promocion es obligatorio.')
  }

  if (!Number.isFinite(data.discountValue) || data.discountValue <= 0) {
    throw new Error('El valor del descuento debe ser mayor a 0.')
  }

  const activeFrom = normalizeOptionalDate(data.activeFrom)
  const activeTo = normalizeOptionalDate(data.activeTo)

  if (activeFrom && activeTo && activeTo < activeFrom) {
    throw new Error('La fecha final no puede ser anterior al inicio.')
  }
}

function toPromotionData(data: PromotionInput) {
  return {
    name: data.name.trim(),
    type: 'COUPON' as const,
    status: data.status,
    priority: Number.isFinite(data.priority) ? Math.floor(data.priority ?? 0) : 0,
    discountKind: data.discountKind,
    discountValue: Number(data.discountValue),
    stackable: Boolean(data.stackable),
    activeFrom: normalizeOptionalDate(data.activeFrom),
    activeTo: normalizeOptionalDate(data.activeTo),
    maxUses: normalizeOptionalInt(data.maxUses),
    perUserLimit: normalizeOptionalInt(data.perUserLimit),
  }
}

export async function createPromotion(data: PromotionInput) {
  await requireAdmin()
  assertPromotionInput(data)

  const promotion = await prisma.promotion.create({
    data: toPromotionData(data),
  })

  revalidatePath('/admin/promociones')
  return promotion
}

export async function updatePromotion(id: string, data: PromotionInput) {
  await requireAdmin()
  assertPromotionInput(data)

  const promotion = await prisma.promotion.update({
    where: { id },
    data: toPromotionData(data),
  })

  revalidatePath('/admin/promociones')
  return promotion
}

export async function togglePromotionStatus(
  id: string,
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED'
) {
  await requireAdmin()

  const promotion = await prisma.promotion.update({
    where: { id },
    data: { status },
  })

  revalidatePath('/admin/promociones')
  return promotion
}

export async function deletePromotion(id: string) {
  await requireAdmin()

  const promotion = await prisma.promotion.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          coupons: true,
          redemptions: true,
        },
      },
    },
  })

  if (!promotion) return

  if (promotion._count.coupons > 0 || promotion._count.redemptions > 0) {
    throw new Error('Esta promocion ya tiene cupones o redenciones. Mejor pausarla que borrarla.')
  }

  await prisma.promotion.delete({
    where: { id },
  })

  revalidatePath('/admin/promociones')
}

export async function generatePromotionCoupons(input: {
  promotionId: string
  quantity: number
  prefix: string
  expiresAt?: string | null
}) {
  await requireAdmin()

  const quantity = Math.floor(input.quantity)
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 500) {
    throw new Error('La cantidad debe estar entre 1 y 500 cupones por lote.')
  }

  const prefix = buildCouponPrefix(input.prefix)
  const expiresAt = normalizeOptionalDate(input.expiresAt)
  const codes = await generateUniqueCouponCodes(quantity, prefix)

  await prisma.promotionCoupon.createMany({
    data: codes.map((code) => ({
      code,
      promotionId: input.promotionId,
      expiresAt,
      status: 'AVAILABLE',
      usesLeft: 1,
    })),
  })

  revalidatePath('/admin/promociones')
  return { quantity, prefix }
}
