'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { collectEditableProviderCostValues, isEditableProviderCostPath } from '@/lib/pricing/pricing-matrix-admin'

const MANAGED_SLUGS = [
  'tarjetas-vouchers',
  'flyers-desplegables',
  'tags-etiquetas',
  'adhesivos-stickers',
  'carpetas-folders',
] as const

async function requirePricingAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') throw new Error('No autorizado')
  return session.user
}

function isManagedSlug(slug: string) {
  return (MANAGED_SLUGS as readonly string[]).includes(slug)
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getProviderFinishedCostMatrix(pricing: unknown): Record<string, any> | null {
  if (!isRecord(pricing)) return null
  const matrix = pricing['providerFinishedCostMatrix']
  return isRecord(matrix) ? matrix : null
}

function getAtPath(root: unknown, path: string[]): unknown {
  let current: any = root
  for (const segment of path) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return undefined
      const index = Number(segment)
      if (!Number.isSafeInteger(index) || index >= current.length) return undefined
      current = current[index]
      continue
    }
    if (!isRecord(current) || !Object.hasOwn(current, segment)) return undefined
    current = current[segment]
  }
  return current
}

function setAtPath(root: Record<string, any>, path: string[], value: number) {
  let current: any = root
  for (const segment of path.slice(0, -1)) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) throw new Error('La celda ya no existe en esta matriz.')
      const index = Number(segment)
      if (!Number.isSafeInteger(index) || index >= current.length) throw new Error('La celda ya no existe en esta matriz.')
      current = current[index]
      continue
    }
    if (!isRecord(current) || !Object.hasOwn(current, segment)) throw new Error('La celda ya no existe en esta matriz.')
    current = current[segment]
  }
  const leaf = path[path.length - 1]
  if (Array.isArray(current)) {
    if (!/^(0|[1-9]\d*)$/.test(leaf)) throw new Error('Solo se pueden editar importes numéricos de una matriz de costos.')
    const index = Number(leaf)
    if (!Number.isSafeInteger(index) || index >= current.length || typeof current[index] !== 'number') {
      throw new Error('Solo se pueden editar importes numéricos de una matriz de costos.')
    }
    current[index] = value
    return
  }
  if (!isRecord(current) || !Object.hasOwn(current, leaf) || typeof current[leaf] !== 'number') {
    throw new Error('Solo se pueden editar importes numéricos de una matriz de costos.')
  }
  current[leaf] = value
}

async function writeAudit(tx: Prisma.TransactionClient, actor: { id?: string; email?: string | null }, data: {
  action: string
  productId: string
  description: string
  before?: Prisma.InputJsonValue
  after?: Prisma.InputJsonValue
  metadata?: Prisma.InputJsonValue
}) {
  await tx.adminAuditLog.create({
    data: {
      actorId: actor.id || null,
      actorEmail: actor.email || null,
      action: data.action,
      entityType: 'PRICING_VERSION',
      entityId: data.productId,
      description: data.description,
      before: data.before,
      after: data.after,
      metadata: data.metadata ?? {},
    },
  })
}

export async function createPricingDraft(productId: string) {
  const actor = await requirePricingAdmin()
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, name: true },
  })
  if (!product || !isManagedSlug(product.slug)) throw new Error('Producto fuera del alcance de Precios ZAP.')

  const versions = await prisma.configuratorVersion.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
  })
  if (versions.some((version) => version.status === 'DRAFT')) {
    redirect(`/admin/precios-zap/${productId}`)
  }
  const active = versions.find((version) => version.status === 'ACTIVE')
  const activeCostMatrix = getProviderFinishedCostMatrix(active?.pricing)
  if (!active || !activeCostMatrix) {
    throw new Error('El producto no tiene una matriz de costos activa compatible con esta primera versión.')
  }

  const latest = versions[0] ?? active
  const parts = latest.schemaVersion.split('.').map((part) => Number(part))
  const validParts = parts.length > 0 && parts.every((part) => Number.isInteger(part) && part >= 0)
  const nextVersion = validParts
    ? [...parts.slice(0, -1), (parts[parts.length - 1] ?? 0) + 1].join('.')
    : `${active.schemaVersion}.1`

  await prisma.$transaction(async (tx) => {
    const draft = await tx.configuratorVersion.create({
      data: {
        productId,
        schemaVersion: nextVersion,
        status: 'DRAFT',
        schema: active.schema,
        compatibility: active.compatibility ?? Prisma.JsonNull,
        pricing: active.pricing,
      },
    })
    await writeAudit(tx, actor, {
      action: 'PRICING_DRAFT_CREATED',
      productId,
      description: `Borrador de costos ${nextVersion} creado para ${product.name}.`,
      before: { activeVersionId: active.id, activeSchemaVersion: active.schemaVersion },
      after: { draftVersionId: draft.id, draftSchemaVersion: nextVersion },
    })
  })

  revalidatePath('/admin/precios-zap')
  redirect(`/admin/precios-zap/${productId}`)
}

export async function saveDraftCostCell(versionId: string, path: string[], value: number) {
  const actor = await requirePricingAdmin()
  if (!Array.isArray(path) || path.length < 2 || path[0] !== 'providerFinishedCostMatrix') {
    throw new Error('Ruta de matriz no válida.')
  }
  if (path.some((segment) => typeof segment !== 'string' || !segment || segment === '__proto__' || segment === 'constructor')) {
    throw new Error('Ruta de matriz no válida.')
  }
  if (!Number.isFinite(value) || value < 0) throw new Error('El costo debe ser un número válido igual o mayor que cero.')
  if (!isEditableProviderCostPath(path)) {
    throw new Error('Esta ruta no corresponde a un importe de costo editable.')
  }

  const version = await prisma.configuratorVersion.findUnique({
    where: { id: versionId },
    include: { product: { select: { id: true, name: true, slug: true } } },
  })
  if (!version || version.status !== 'DRAFT' || !isManagedSlug(version.product.slug)) {
    throw new Error('Solo se puede editar un borrador de una familia habilitada.')
  }
  const oldValue = getAtPath(version.pricing, path)
  if (typeof oldValue !== 'number') throw new Error('La celda no contiene un costo numérico editable.')

  const nextPricing = structuredClone(version.pricing) as Record<string, any>
  setAtPath(nextPricing, path, value)

  await prisma.$transaction(async (tx) => {
    const updated = await tx.configuratorVersion.updateMany({
      where: { id: versionId, status: 'DRAFT', updatedAt: version.updatedAt },
      data: { pricing: nextPricing as Prisma.InputJsonValue },
    })
    if (updated.count !== 1) throw new Error('El borrador cambió de estado. Recargá la página antes de continuar.')
    await writeAudit(tx, actor, {
      action: 'PRICING_COST_CELL_UPDATED',
      productId: version.productId,
      description: `Costo actualizado en ${version.product.name}.`,
      before: { versionId, path, value: oldValue },
      after: { versionId, path, value },
    })
  })

  revalidatePath(`/admin/precios-zap/${version.productId}`)
  return { success: true, value }
}

export async function publishPricingDraft(versionId: string, formData: FormData) {
  const actor = await requirePricingAdmin()
  if (process.env.PRICING_ZAP_PUBLISH_ENABLED !== 'true') {
    throw new Error('La publicación está bloqueada hasta completar y aprobar la auditoría comercial de esta matriz.')
  }
  if (formData.get('confirmReview') !== 'yes') throw new Error('Confirmá que revisaste los costos y las combinaciones antes de publicar.')
  const draft = await prisma.configuratorVersion.findUnique({
    where: { id: versionId },
    include: { product: { select: { id: true, name: true, slug: true } } },
  })
  if (!draft || draft.status !== 'DRAFT' || !isManagedSlug(draft.product.slug)) {
    throw new Error('No encontramos un borrador publicable.')
  }
  const draftCostMatrix = getProviderFinishedCostMatrix(draft.pricing)
  if (!draftCostMatrix) {
    throw new Error('La matriz de costos no tiene la estructura esperada.')
  }
  const values = collectEditableProviderCostValues(draftCostMatrix)
  if (values.length === 0 || values.some((value) => value < 0 || !Number.isFinite(value))) {
    throw new Error('La matriz no contiene costos válidos. No se publicó ningún cambio.')
  }

  await prisma.$transaction(async (tx) => {
    const active = await tx.configuratorVersion.findFirst({
      where: { productId: draft.productId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, schemaVersion: true },
    })
    const stillDraft = await tx.configuratorVersion.updateMany({
      where: { id: versionId, status: 'DRAFT' },
      data: { status: 'ARCHIVED' },
    })
    if (stillDraft.count !== 1) throw new Error('El borrador ya no está disponible para publicar.')

    await tx.configuratorVersion.updateMany({
      where: { productId: draft.productId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    })
    await tx.configuratorVersion.update({
      where: { id: versionId },
      data: { status: 'ACTIVE' },
    })
    await writeAudit(tx, actor, {
      action: 'PRICING_VERSION_PUBLISHED',
      productId: draft.productId,
      description: `Matriz de costos ${draft.schemaVersion} publicada para ${draft.product.name}.`,
      before: { activeVersionId: active?.id ?? null, activeSchemaVersion: active?.schemaVersion ?? null },
      after: { versionId, schemaVersion: draft.schemaVersion },
    })
  })

  revalidatePath('/admin/precios-zap')
  revalidatePath(`/admin/precios-zap/${draft.productId}`)
  revalidatePath('/admin/productos')
  redirect(`/admin/precios-zap/${draft.productId}?published=1`)
}

export async function restorePricingVersion(versionId: string, formData: FormData) {
  const actor = await requirePricingAdmin()
  if (process.env.PRICING_ZAP_PUBLISH_ENABLED !== 'true') {
    throw new Error('La restauración está bloqueada hasta completar y aprobar la auditoría comercial de esta matriz.')
  }
  if (formData.get('confirmRestore') !== 'yes') throw new Error('Confirmá la reversión para continuar.')
  const selected = await prisma.configuratorVersion.findUnique({
    where: { id: versionId },
    include: { product: { select: { id: true, name: true, slug: true } } },
  })
  if (!selected || selected.status !== 'ARCHIVED' || !isManagedSlug(selected.product.slug)) {
    throw new Error('Solo se puede restaurar una versión archivada de las familias habilitadas.')
  }
  const selectedCostMatrix = getProviderFinishedCostMatrix(selected.pricing)
  if (!selectedCostMatrix) {
    throw new Error('La versión no contiene una matriz de costos compatible.')
  }

  const pendingDraft = await prisma.configuratorVersion.findFirst({
    where: { productId: selected.productId, status: 'DRAFT' },
    select: { id: true },
  })
  if (pendingDraft) throw new Error('Publicá o descartá el borrador antes de restaurar una versión anterior.')

  await prisma.$transaction(async (tx) => {
    const active = await tx.configuratorVersion.findFirst({
      where: { productId: selected.productId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, schemaVersion: true },
    })
    await tx.configuratorVersion.updateMany({
      where: { productId: selected.productId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    })
    const restored = await tx.configuratorVersion.updateMany({
      where: { id: versionId, status: 'ARCHIVED' },
      data: { status: 'ACTIVE' },
    })
    if (restored.count !== 1) throw new Error('La versión cambió de estado. No se realizó la reversión.')
    await writeAudit(tx, actor, {
      action: 'PRICING_VERSION_RESTORED',
      productId: selected.productId,
      description: `Versión ${selected.schemaVersion} restaurada para ${selected.product.name}.`,
      before: { activeVersionId: active?.id ?? null, activeSchemaVersion: active?.schemaVersion ?? null },
      after: { versionId, schemaVersion: selected.schemaVersion },
    })
  })

  revalidatePath('/admin/precios-zap')
  revalidatePath(`/admin/precios-zap/${selected.productId}`)
  revalidatePath('/admin/productos')
  redirect(`/admin/precios-zap/${selected.productId}?restored=1`)
}
