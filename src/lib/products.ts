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
  options?: { take?: number; situationSlug?: string; needSlug?: string; businessTypeSlug?: string; catalogType?: 'COSA' | 'DESARROLLO'; rankContext?: { situationSlug?: string; needSlug?: string; businessTypeSlug?: string; situationPriority?: string[] } }
) {
  const engine = engineForCatalogFamily(familySlug)
  const categoryFilter = familySlug ? { categoryLinks: { some: { category: { slug: familySlug, active: true } } } } : {}
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
    ...(familySlug ? categoryFilter : engine ? { engine } : {}),
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

  const products = await prisma.product.findMany({
    where,
    include: {
      variants: { select: { price: true }, orderBy: { price: 'asc' } },
      quoterConfig: { include: quoterConfigInclude },
      configuratorVersions: { where: { status: 'ACTIVE' }, select: { id: true, schemaVersion: true, status: true } },
      categoryLinks: { where: { category: { active: true } }, include: { category: { select: { id: true, name: true, slug: true, sortOrder: true } } }, orderBy: { category: { sortOrder: 'asc' } } },
      offerEntries: {
        select: {
          businessType: { select: { slug: true } },
          situation: { select: { slug: true } },
          need: { select: { slug: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const orderedProducts = products.sort((a, b) => {
    if (options?.rankContext) {
      const context = options.rankContext
      const contextRank = (product: (typeof products)[number]) => {
        const entries = product.offerEntries
        const matches = (entry: (typeof entries)[number], includeNeed: boolean) =>
          (!context.businessTypeSlug || entry.businessType.slug === context.businessTypeSlug) &&
          (!context.situationSlug || entry.situation.slug === context.situationSlug) &&
          (!includeNeed || !context.needSlug || entry.need.slug === context.needSlug)

        if (context.situationSlug) {
          if (entries.some((entry) => matches(entry, true))) return [0, 0, 0] as const
          if (context.needSlug && entries.some((entry) => matches(entry, false))) return [1, 0, 0] as const
          if (context.businessTypeSlug && entries.some((entry) => entry.businessType.slug === context.businessTypeSlug)) {
            return [2, 0, 0] as const
          }
          return [3, 0, 0] as const
        }

        if (context.businessTypeSlug) {
          const relevant = entries.filter((entry) => entry.businessType.slug === context.businessTypeSlug)
          if (relevant.length === 0) return [1, Number.MAX_SAFE_INTEGER, 0] as const
          const priorities = context.situationPriority || []
          const ranks = relevant.map((entry) => {
            const index = priorities.indexOf(entry.situation.slug)
            return index < 0 ? priorities.length : index
          })
          const firstPriority = Math.min(...ranks)
          const situationCoverage = new Set(relevant.map((entry) => entry.situation.slug)).size
          // Prioritize the rubro's highest-priority situations, then products useful
          // across more of that rubro's situations. Editorial order breaks ties.
          return [0, firstPriority, -situationCoverage] as const
        }

        return [0, 0, 0] as const
      }
      const rankA = contextRank(a)
      const rankB = contextRank(b)
      for (let i = 0; i < rankA.length; i += 1) {
        if (rankA[i] !== rankB[i]) return rankA[i] - rankB[i]
      }
    }

    return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  })

  return options?.take === undefined ? orderedProducts : orderedProducts.slice(0, options.take)
}

export const getProduct = cache(async function getProduct(slug: string) {
  const product = await prisma.product.findUnique({
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
        orderBy: { schemaVersion: 'desc' },
      },
      categoryLinks: { where: { category: { active: true } }, include: { category: { select: { id: true, name: true, slug: true, sortOrder: true } } }, orderBy: { category: { sortOrder: 'asc' } } },
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

  if (!product) return product

  // The database is the only public source for configurator versions.
  return product
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
      categoryLinks: { where: { category: { active: true } }, include: { category: { select: { id: true, name: true, slug: true, sortOrder: true } } }, orderBy: { category: { sortOrder: 'asc' } } },
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
