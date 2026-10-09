import { cache } from 'react'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { engineForCatalogFamily } from '@/lib/catalog-domain'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') throw new Error('No autorizado')
}

const quoterConfigInclude = {
  rawMaterial: { include: { tiers: { orderBy: { minQty: 'asc' as const } } } },
  allowedMaterials: { include: { rawMaterial: { include: { tiers: { orderBy: { minQty: 'asc' as const } } } } } },
  finishings: { include: { finishing: { include: { tiers: { orderBy: { minQty: 'asc' as const } } } } } },
  quantityPresets: { orderBy: { sortOrder: 'asc' as const } },
  sizePresets: { orderBy: { sortOrder: 'asc' as const } },
}

/** Minimal public catalog metadata for homepage entry points. */
export async function getPublicCatalogTypes() {
  return prisma.product.findMany({
    where: { active: true },
    select: { catalogType: true },
    distinct: ['catalogType'],
  })
}

export async function getProducts(
  familySlug?: string,
  search?: string,
  options?: { take?: number; situationSlug?: string; needSlug?: string; businessTypeSlug?: string; catalogType?: 'COSA' | 'DESARROLLO' }
) {
  const engine = engineForCatalogFamily(familySlug)
  const offerFilter: Prisma.OfferMatrixEntryWhereInput = {
    ...(options?.situationSlug ? { situation: { slug: options.situationSlug } } : {}),
    ...(options?.needSlug ? { need: { slug: options.needSlug } } : {}),
    ...(options?.businessTypeSlug ? { businessType: { slug: options.businessTypeSlug } } : {}),
  }
  const hasOfferFilter = Boolean(options?.situationSlug || options?.needSlug || options?.businessTypeSlug)

  const catalogTypeFilter: Prisma.ProductWhereInput = options?.catalogType
    ? { catalogType: options.catalogType }
    : {}

  const where: Prisma.ProductWhereInput = {
    active: true,
    ...catalogTypeFilter,
    ...(engine ? { engine } : {}),
    ...(hasOfferFilter ? { offerEntries: { some: offerFilter } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { whatIs: { contains: search, mode: 'insensitive' } },
            { purpose: { contains: search, mode: 'insensitive' } },
            { offerEntries: { some: { need: { name: { contains: search, mode: 'insensitive' } } } } },
            { offerEntries: { some: { situation: { name: { contains: search, mode: 'insensitive' } } } } },
            { offerEntries: { some: { businessType: { name: { contains: search, mode: 'insensitive' } } } } },
          ],
        }
      : {}),
  }

  return prisma.product.findMany({
    where,
    include: {
      variants: { select: { price: true }, orderBy: { price: 'asc' } },
      quoterConfig: { include: quoterConfigInclude },
      configuratorVersions: { where: { status: 'ACTIVE' }, select: { id: true, schemaVersion: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: options?.take,
  })
}

export const getProduct = cache(async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      options: {
        include: { values: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
      variants: {
        include: { options: { include: { optionValue: { include: { option: true } } } } },
      },
      quoterConfig: { include: quoterConfigInclude },
      configuratorVersions: {
        where: { status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
      },
      outgoingRelations: {
        include: {
          relatedProduct: {
            include: {
              options: { include: { values: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } } },
              variants: { include: { options: { include: { optionValue: { include: { option: true } } } } } },
              quoterConfig: { include: quoterConfigInclude },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
})

export async function getActiveProductSlugs() {
  return prisma.product.findMany({ where: { active: true }, select: { slug: true } })
}

export async function getAllProductsAdmin() {
  await requireAdmin()
  return prisma.product.findMany({
    include: {
      options: { include: { values: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } } },
      variants: { include: { costing: true, options: { include: { optionValue: true } } } },
      quoterConfig: { include: { allowedMaterials: true, finishings: true, quantityPresets: true, sizePresets: true } },
      configuratorVersions: { select: { schemaVersion: true, status: true } },
      outgoingRelations: { select: { relatedProductId: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getProductRelationOptions(excludeProductId?: string) {
  await requireAdmin()
  return prisma.product.findMany({
    where: { ...(excludeProductId ? { id: { not: excludeProductId } } : {}) },
    select: { id: true, name: true, slug: true, active: true, images: true, modality: true, engine: true },
    orderBy: { name: 'asc' },
  })
}

/** Packs now live in Pack/PackItem. v1 intentionally has no active packs. */
export async function getCombos() {
  return []
}
