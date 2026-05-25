'use server'

import crypto from 'crypto'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { buildCouponLandingUrl } from '@/lib/coupons'
import { createPresignedR2UploadUrl, getR2BucketName, getR2Client } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { revalidatePath } from 'next/cache'

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return ''
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
  return session
}

function toAuditJson(value: unknown) {
  return value == null ? Prisma.JsonNull : JSON.parse(JSON.stringify(value))
}

async function writeAdminAuditLog(input: {
  actor: Awaited<ReturnType<typeof requireAdmin>>
  action: string
  entityType: string
  entityId?: string | null
  description?: string
  before?: unknown
  after?: unknown
  metadata?: unknown
}) {
  await prisma.adminAuditLog.create({
    data: {
      actorId: input.actor.user?.id ?? null,
      actorEmail: input.actor.user?.email ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      description: input.description,
      before: toAuditJson(input.before),
      after: toAuditJson(input.after),
      metadata: toAuditJson(input.metadata),
    },
  })
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

function normalizeIdList(values?: string[] | null) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))]
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

const COUPONS_PAGE_SIZE = 20

type PromotionCouponFilters = {
  promotionId: string
  query?: string
  status?: 'ALL' | 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED'
  batchName?: string
  expiresMode?: 'ALL' | 'ACTIVE' | 'EXPIRED' | 'NO_EXPIRATION'
}

function buildPromotionCouponWhere(input: PromotionCouponFilters) {
  const query = input.query?.trim()
  const status = input.status && input.status !== 'ALL' ? input.status : null
  const batchName = input.batchName?.trim()
  const now = new Date()
  const filters: Prisma.PromotionCouponWhereInput[] = []

  if (input.expiresMode === 'ACTIVE') {
    filters.push({ OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] })
  }

  if (input.expiresMode === 'EXPIRED') {
    filters.push({ expiresAt: { lt: now } })
  }

  if (input.expiresMode === 'NO_EXPIRATION') {
    filters.push({ expiresAt: null })
  }

  if (query) {
    filters.push({
      OR: [
        { code: { contains: query, mode: 'insensitive' } },
        { recipientName: { contains: query, mode: 'insensitive' } },
        { recipientBusiness: { contains: query, mode: 'insensitive' } },
        { recipientEmail: { contains: query, mode: 'insensitive' } },
        { recipientPhone: { contains: query, mode: 'insensitive' } },
        { batchName: { contains: query, mode: 'insensitive' } },
      ],
    })
  }

  return {
    promotionId: input.promotionId,
    ...(status ? { status } : {}),
    ...(batchName ? { batchName: { contains: batchName, mode: 'insensitive' } } : {}),
    ...(filters.length ? { AND: filters } : {}),
  } satisfies Prisma.PromotionCouponWhereInput
}

export async function getPromotions() {
  await requireAdmin()

  const promotions = await prisma.promotion.findMany({
    include: {
      _count: {
        select: {
          coupons: true,
          redemptions: true,
        },
      },
      coupons: {
        orderBy: { createdAt: 'desc' },
        take: COUPONS_PAGE_SIZE,
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

  return Promise.all(
    promotions.map(async (promotion) => {
      const [scanAggregate, reservedRedemptions, confirmedRedemptions] = await Promise.all([
        prisma.promotionCoupon.aggregate({
          where: { promotionId: promotion.id },
          _sum: { scanCount: true },
        }),
        prisma.couponRedemption.count({
          where: {
            promotionId: promotion.id,
            status: 'RESERVED',
          },
        }),
        prisma.couponRedemption.findMany({
          where: {
            promotionId: promotion.id,
            status: 'CONFIRMED',
          },
          select: {
            discountAmount: true,
            order: {
              select: {
                total: true,
                subtotal: true,
              },
            },
          },
        }),
      ])

      const confirmedCount = confirmedRedemptions.length
      const totalScans = scanAggregate._sum.scanCount ?? 0
      const attributedRevenue = confirmedRedemptions.reduce(
        (sum, redemption) => sum + redemption.order.total,
        0
      )
      const attributedSubtotal = confirmedRedemptions.reduce(
        (sum, redemption) => sum + (redemption.order.subtotal ?? redemption.order.total),
        0
      )
      const discountGranted = confirmedRedemptions.reduce(
        (sum, redemption) => sum + redemption.discountAmount,
        0
      )

      return {
        ...promotion,
        analytics: {
          totalScans,
          reservedRedemptions,
          confirmedRedemptions: confirmedCount,
          attributedRevenue,
          attributedSubtotal,
          discountGranted,
          scanConversionRate: totalScans > 0 ? (confirmedCount / totalScans) * 100 : 0,
          couponConversionRate:
            promotion._count.coupons > 0 ? (confirmedCount / promotion._count.coupons) * 100 : 0,
          revenuePerDiscountPeso: discountGranted > 0 ? attributedRevenue / discountGranted : null,
        },
      }
    })
  )
}

export async function getPromotionCoupons(input: {
  promotionId: string
  query?: string
  status?: 'ALL' | 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED'
  batchName?: string
  expiresMode?: 'ALL' | 'ACTIVE' | 'EXPIRED' | 'NO_EXPIRATION'
  page?: number
  pageSize?: number
}) {
  await requireAdmin()

  const pageSize = Math.min(Math.max(Math.floor(input.pageSize || COUPONS_PAGE_SIZE), 1), 100)
  const page = Math.max(Math.floor(input.page || 1), 1)
  const where = buildPromotionCouponWhere(input)

  const [total, coupons] = await Promise.all([
    prisma.promotionCoupon.count({ where }),
    prisma.promotionCoupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: {
            scans: true,
            redemptions: true,
          },
        },
      },
    }),
  ])

  return {
    coupons,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
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
  minOrderAmount?: number | null
  firstOrderOnly?: boolean
  allowedProductIds?: string[]
  excludedProductIds?: string[]
  allowedCategoryIds?: string[]
  excludedCategoryIds?: string[]

  welcomeTitle?: string | null
  welcomeMessage?: string | null
  welcomeConditions?: string | null
  welcomeLogoUrl?: string | null
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
    minOrderAmount:
      data.minOrderAmount != null && Number.isFinite(data.minOrderAmount) && data.minOrderAmount > 0
        ? Number(data.minOrderAmount)
        : null,
    firstOrderOnly: Boolean(data.firstOrderOnly),
    allowedProductIds: normalizeIdList(data.allowedProductIds),
    excludedProductIds: normalizeIdList(data.excludedProductIds),
    allowedCategoryIds: normalizeIdList(data.allowedCategoryIds),
    excludedCategoryIds: normalizeIdList(data.excludedCategoryIds),
    welcomeTitle: normalizeOptionalText(data.welcomeTitle),
    welcomeMessage: normalizeOptionalText(data.welcomeMessage),
    welcomeConditions: normalizeOptionalText(data.welcomeConditions),
    welcomeLogoUrl: normalizeOptionalText(data.welcomeLogoUrl),
  }
}

export async function createPromotion(data: PromotionInput) {
  const actor = await requireAdmin()
  assertPromotionInput(data)

  const promotion = await prisma.promotion.create({
    data: toPromotionData(data),
  })

  await writeAdminAuditLog({
    actor,
    action: 'promotion.create',
    entityType: 'Promotion',
    entityId: promotion.id,
    description: `Creo la promocion ${promotion.name}`,
    after: promotion,
  })

  revalidatePath('/admin/promociones')
  return promotion
}

export async function updatePromotion(id: string, data: PromotionInput) {
  const actor = await requireAdmin()
  assertPromotionInput(data)

  const before = await prisma.promotion.findUnique({ where: { id } })
  if (!before) throw new Error('Promocion no encontrada.')

  const promotion = await prisma.promotion.update({
    where: { id },
    data: toPromotionData(data),
  })

  await writeAdminAuditLog({
    actor,
    action: 'promotion.update',
    entityType: 'Promotion',
    entityId: promotion.id,
    description: `Edito la promocion ${promotion.name}`,
    before,
    after: promotion,
  })

  revalidatePath('/admin/promociones')
  return promotion
}

export async function togglePromotionStatus(
  id: string,
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED'
) {
  const actor = await requireAdmin()

  const before = await prisma.promotion.findUnique({ where: { id } })
  if (!before) throw new Error('Promocion no encontrada.')

  const promotion = await prisma.promotion.update({
    where: { id },
    data: { status },
  })

  await writeAdminAuditLog({
    actor,
    action: 'promotion.status.update',
    entityType: 'Promotion',
    entityId: promotion.id,
    description: `Cambio estado de promocion a ${status}`,
    before: { status: before.status },
    after: { status: promotion.status },
  })

  revalidatePath('/admin/promociones')
  return promotion
}

export async function deletePromotion(id: string) {
  const actor = await requireAdmin()

  const promotion = await prisma.promotion.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          coupons: true,
          redemptions: true,
        },
      },
    },
  })

  if (!promotion) return

  if (promotion._count.redemptions > 0) {
    throw new Error('Esta promocion ya fue usada por un cliente. No se puede borrar, debes pausarla.')
  }

  await prisma.promotion.delete({
    where: { id },
  })

  await writeAdminAuditLog({
    actor,
    action: 'promotion.delete',
    entityType: 'Promotion',
    entityId: id,
    description: `Elimino la promocion ${promotion.name}`,
    before: promotion,
  })

  revalidatePath('/admin/promociones')
}

export async function uploadPromoLogoToServer(formData: FormData) {
  await requireAdmin()

  const file = formData.get('file') as File | null
  if (!file) throw new Error('No se encontro el archivo')

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const objectKey = `promos/${Date.now()}-${fileName}`

  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: objectKey,
    Body: buffer,
    ContentType: file.type,
  })

  await getR2Client().send(command)

  // Usamos el endpoint interno para servir la imagen (cacheada inmutable)
  const publicUrl = `/api/r2/public/${objectKey}`

  return { publicUrl }
}

export async function generatePromotionCoupons(input: {
  promotionId: string
  quantity: number
  prefix: string
  batchName?: string | null
  publicPresenterName?: string | null
  recipients?: string | null
  qrBaseUrl?: string | null
  expiresAt?: string | null
}) {
  const actor = await requireAdmin()

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
  const publicPresenterName = normalizeOptionalText(input.publicPresenterName)
  const promotion = await prisma.promotion.findUnique({
    where: { id: input.promotionId },
    select: { qrBaseUrl: true },
  })
  const qrBaseUrl = normalizeOptionalText(input.qrBaseUrl) ?? promotion?.qrBaseUrl ?? null
  const codes = await generateUniqueCouponCodes(totalToGenerate, prefix)

  await prisma.promotionCoupon.createMany({
    data: codes.map((code, index) => {
      const recipient = recipients[index]
      const couponPresenterName =
        publicPresenterName ||
        normalizeOptionalText(recipient?.recipientBusiness) ||
        normalizeOptionalText(recipient?.recipientName)
      const metadata = {
        ...(recipient?.metadata ?? {}),
        ...(couponPresenterName ? { publicPresenterName: couponPresenterName } : {}),
      }
      return {
      code,
      promotionId: input.promotionId,
      recipientName: recipient?.recipientName,
      recipientBusiness: recipient?.recipientBusiness,
      recipientEmail: recipient?.recipientEmail,
      recipientPhone: recipient?.recipientPhone,
      batchName,
      qrPayload: buildCouponLandingUrl(code, qrBaseUrl),
      metadata: Object.keys(metadata).length ? metadata : undefined,
      expiresAt,
      status: 'AVAILABLE',
      usesLeft: 1,
      }
    }),
  })

  await writeAdminAuditLog({
    actor,
    action: 'promotion.coupons.generate',
    entityType: 'Promotion',
    entityId: input.promotionId,
    description: `Genero ${totalToGenerate} cupones con prefijo ${prefix}`,
    metadata: {
      quantity: totalToGenerate,
      prefix,
      batchName,
      expiresAt,
      hasRecipients: recipients.length > 0,
      qrBaseUrl,
    },
  })

  revalidatePath('/admin/promociones')
  return { quantity: totalToGenerate, prefix }
}

export async function updatePromotionCoupon(input: {
  code: string
  recipientName?: string | null
  recipientBusiness?: string | null
  recipientEmail?: string | null
  recipientPhone?: string | null
  batchName?: string | null
  publicPresenterName?: string | null
  expiresAt?: string | null
  status?: 'AVAILABLE' | 'EXPIRED'
}) {
  const actor = await requireAdmin()

  const code = input.code.trim().toUpperCase()
  if (!code) throw new Error('El codigo del cupon es obligatorio.')

  const coupon = await prisma.promotionCoupon.findUnique({
    where: { code },
  })

  if (!coupon) throw new Error('Cupon no encontrado.')
  if (coupon.status === 'RESERVED' || coupon.status === 'USED') {
    throw new Error('Este cupon ya esta reservado o usado. No se puede editar.')
  }

  const currentMetadata =
    coupon.metadata && typeof coupon.metadata === 'object' && !Array.isArray(coupon.metadata)
      ? (coupon.metadata as Record<string, unknown>)
      : {}
  const publicPresenterName = normalizeOptionalText(input.publicPresenterName)
  const metadata = {
    ...currentMetadata,
    ...(publicPresenterName ? { publicPresenterName } : {}),
  }

  if (!publicPresenterName) {
    delete metadata.publicPresenterName
  }

  const updatedCoupon = await prisma.promotionCoupon.update({
    where: { code },
    data: {
      status: input.status || coupon.status,
      recipientName: normalizeOptionalText(input.recipientName),
      recipientBusiness: normalizeOptionalText(input.recipientBusiness),
      recipientEmail: normalizeOptionalText(input.recipientEmail),
      recipientPhone: normalizeOptionalText(input.recipientPhone),
      batchName: normalizeOptionalText(input.batchName),
      expiresAt: normalizeOptionalDate(input.expiresAt),
      metadata: Object.keys(metadata).length ? metadata : Prisma.JsonNull,
    },
  })

  await writeAdminAuditLog({
    actor,
    action: 'promotionCoupon.update',
    entityType: 'PromotionCoupon',
    entityId: code,
    description: `Edito el cupon ${code}`,
    before: coupon,
    after: updatedCoupon,
  })

  revalidatePath('/admin/promociones')
  revalidatePath(`/cupon/${encodeURIComponent(code)}`)
}

export async function exportPromotionCouponsCsv(input: PromotionCouponFilters & { filtered?: boolean }) {
  const actor = await requireAdmin()

  const promotion = await prisma.promotion.findUnique({
    where: { id: input.promotionId },
  })

  if (!promotion) {
    throw new Error('Promocion no encontrada.')
  }

  const where = input.filtered
    ? buildPromotionCouponWhere(input)
    : { promotionId: input.promotionId }
  const coupons = await prisma.promotionCoupon.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          scans: true,
          redemptions: true,
        },
      },
    },
  })

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
      'referente_publico',
      'qr',
      'escaneos',
      'redenciones',
      'vence',
      'creado',
    ],
    ...coupons.map((coupon) => [
      coupon.code,
      promotion.name,
      coupon.status,
      coupon.recipientName,
      coupon.recipientBusiness,
      coupon.recipientEmail,
      coupon.recipientPhone,
      coupon.batchName,
      getMetadataString(coupon.metadata, 'publicPresenterName'),
      coupon.qrPayload,
      coupon._count.scans,
      coupon._count.redemptions,
      coupon.expiresAt?.toISOString() ?? '',
      coupon.createdAt.toISOString(),
    ]),
  ]

  await writeAdminAuditLog({
    actor,
    action: 'promotion.coupons.exportCsv',
    entityType: 'Promotion',
    entityId: input.promotionId,
    description: input.filtered
      ? `Exporto CSV filtrado de cupones de ${promotion.name}`
      : `Exporto CSV total de cupones de ${promotion.name}`,
    metadata: {
      coupons: coupons.length,
      filtered: Boolean(input.filtered),
      query: input.query?.trim() || null,
      status: input.status || 'ALL',
      batchName: input.batchName?.trim() || null,
      expiresMode: input.expiresMode || 'ALL',
    },
  })

  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
}
