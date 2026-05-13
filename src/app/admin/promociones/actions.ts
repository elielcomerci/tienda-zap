'use server'

import crypto from 'crypto'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { buildCouponLandingUrl } from '@/lib/coupons'
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

type RecipientRow = {
  recipientName?: string
  recipientBusiness?: string
  recipientEmail?: string
  recipientPhone?: string
  metadata?: Record<string, string>
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function splitRecipientLine(line: string) {
  return line
    .split(/[;\t,]/)
    .map((part) => part.trim())
}

function parseRecipientRows(rawValue?: string | null): RecipientRow[] {
  const lines = rawValue
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines?.length) return []

  return lines
    .filter((line, index) => {
      if (index !== 0) return true
      const lowered = line.toLowerCase()
      return !(
        lowered.includes('nombre') ||
        lowered.includes('name') ||
        lowered.includes('negocio') ||
        lowered.includes('business')
      )
    })
    .map((line) => {
      const [name, business, email, phone, ...extra] = splitRecipientLine(line)
      const metadata: Record<string, string> = {}
      extra.forEach((value, index) => {
        if (value) metadata[`variable${index + 1}`] = value
      })

      return {
        recipientName: name || undefined,
        recipientBusiness: business || undefined,
        recipientEmail: email || undefined,
        recipientPhone: phone || undefined,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      }
    })
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
        include: {
          _count: {
            select: {
              scans: true,
              redemptions: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export type PromotionInput = {
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED'
  campaignKind?: string | null
  audienceLabel?: string | null
  qrBaseUrl?: string | null
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
    campaignKind: normalizeOptionalText(data.campaignKind),
    audienceLabel: normalizeOptionalText(data.audienceLabel),
    qrBaseUrl: normalizeOptionalText(data.qrBaseUrl),
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
  batchName?: string | null
  recipients?: string | null
  qrBaseUrl?: string | null
  expiresAt?: string | null
}) {
  await requireAdmin()

  const quantity = Math.floor(input.quantity)
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 500) {
    throw new Error('La cantidad debe estar entre 1 y 500 cupones por lote.')
  }

  const prefix = buildCouponPrefix(input.prefix)
  const recipients = parseRecipientRows(input.recipients)
  const totalToGenerate = recipients.length > 0 ? recipients.length : quantity
  if (recipients.length > 0 && totalToGenerate > 500) {
    throw new Error('El lote no puede superar 500 destinatarios.')
  }
  const expiresAt = normalizeOptionalDate(input.expiresAt)
  const batchName = normalizeOptionalText(input.batchName)
  const promotion = await prisma.promotion.findUnique({
    where: { id: input.promotionId },
    select: { qrBaseUrl: true },
  })
  const qrBaseUrl = normalizeOptionalText(input.qrBaseUrl) ?? promotion?.qrBaseUrl ?? null
  const codes = await generateUniqueCouponCodes(totalToGenerate, prefix)

  await prisma.promotionCoupon.createMany({
    data: codes.map((code, index) => {
      const recipient = recipients[index]
      return {
      code,
      promotionId: input.promotionId,
      recipientName: recipient?.recipientName,
      recipientBusiness: recipient?.recipientBusiness,
      recipientEmail: recipient?.recipientEmail,
      recipientPhone: recipient?.recipientPhone,
      batchName,
      qrPayload: buildCouponLandingUrl(code, qrBaseUrl),
      metadata: recipient?.metadata,
      expiresAt,
      status: 'AVAILABLE',
      usesLeft: 1,
      }
    }),
  })

  revalidatePath('/admin/promociones')
  return { quantity: totalToGenerate, prefix }
}

export async function exportPromotionCouponsCsv(promotionId: string) {
  await requireAdmin()

  const promotion = await prisma.promotion.findUnique({
    where: { id: promotionId },
    include: {
      coupons: {
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              scans: true,
              redemptions: true,
            },
          },
        },
      },
    },
  })

  if (!promotion) {
    throw new Error('Promocion no encontrada.')
  }

  const escapeCsv = (value: unknown) => {
    const rawValue = value == null ? '' : String(value)
    return `"${rawValue.replace(/"/g, '""')}"`
  }

  const rows = [
    [
      'codigo',
      'promocion',
      'estado',
      'destinatario',
      'negocio',
      'email',
      'telefono',
      'lote',
      'qr',
      'escaneos',
      'redenciones',
      'vence',
      'creado',
    ],
    ...promotion.coupons.map((coupon) => [
      coupon.code,
      promotion.name,
      coupon.status,
      coupon.recipientName,
      coupon.recipientBusiness,
      coupon.recipientEmail,
      coupon.recipientPhone,
      coupon.batchName,
      coupon.qrPayload,
      coupon._count.scans,
      coupon._count.redemptions,
      coupon.expiresAt?.toISOString() ?? '',
      coupon.createdAt.toISOString(),
    ]),
  ]

  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
}
