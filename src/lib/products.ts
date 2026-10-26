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
    where: { active: true, publicVisible: true },
    select: { catalogType: true },
    distinct: ['catalogType'],
  })
}

export async function getProducts(
  familySlug?: string,
  search?: string,
  options?: { take?: number; situationSlug?: string; needSlug?: string; businessTypeSlug?: string; catalogType?: 'COSA' | 'DESARROLLO'; publicGroup?: string; rankContext?: { situationSlug?: string; needSlug?: string; businessTypeSlug?: string; situationPriority?: string[] } }
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
    publicVisible: true,
    ...(options?.publicGroup ? { publicGroup: options.publicGroup } : { AND: [{ OR: [{ publicGroup: { not: 'PROYECTOS' } }, { publicGroup: null }] }] }),
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
          order: true,
          businessType: { select: { slug: true } },
          situation: { select: { slug: true } },
          need: { select: { slug: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const orderedProducts = products.sort((a, b) => {
    const context = options?.rankContext

    const matrixOrder = (order: number) => order > 0 ? order : Number.MAX_SAFE_INTEGER

    const contextRank = (product: (typeof products)[number]) => {
      if (!context) return [0, product.sortOrder, 0] as const

      const entries = product.offerEntries
      const relevant = entries.filter((entry) =>
        (!context.businessTypeSlug || entry.businessType.slug === context.businessTypeSlug) &&
        (!context.situationSlug || entry.situation.slug === context.situationSlug) &&
        (!context.needSlug || entry.need.slug === context.needSlug)
      )

      // The offer matrix is the source of truth: exact need matches first,
      // then other offers for the same situation, then the rest of the rubro.
      if (context.situationSlug) {
        if (relevant.length > 0) {
          return [0, Math.min(...relevant.map((entry) => matrixOrder(entry.order))), product.sortOrder] as const
        }

        const sameSituation = entries.filter((entry) =>
          (!context.businessTypeSlug || entry.businessType.slug === context.businessTypeSlug) &&
          entry.situation.slug === context.situationSlug
        )
        if (context.needSlug && sameSituation.length > 0) {
          return [1, Math.min(...sameSituation.map((entry) => matrixOrder(entry.order))), product.sortOrder] as const
        }

        const sameBusiness = context.businessTypeSlug
          ? entries.filter((entry) => entry.businessType.slug === context.businessTypeSlug)
          : []
        if (sameBusiness.length > 0) {
          const priorities = context.situationPriority || []
          const bestSituationRank = Math.min(...sameBusiness.map((entry) => {
            const index = priorities.indexOf(entry.situation.slug)
            return index < 0 ? priorities.length : index
          }))
          const bestMatrixOrder = Math.min(...sameBusiness.map((entry) => matrixOrder(entry.order)))
          return [2, bestSituationRank, bestMatrixOrder] as const
        }

        return [3, product.sortOrder, 0] as const
      }

      if (context.businessTypeSlug) {
        const sameBusiness = entries.filter((entry) => entry.businessType.slug === context.businessTypeSlug)
        if (sameBusiness.length === 0) return [1, Number.MAX_SAFE_INTEGER, product.sortOrder] as const

        const priorities = context.situationPriority || []
        const bestSituationRank = Math.min(...sameBusiness.map((entry) => {
          const index = priorities.indexOf(entry.situation.slug)
          return index < 0 ? priorities.length : index
        }))
        const bestMatrixOrder = Math.min(...sameBusiness
          .filter((entry) => {
            const index = priorities.indexOf(entry.situation.slug)
            return (index < 0 ? priorities.length : index) === bestSituationRank
          })
          .map((entry) => matrixOrder(entry.order)))
        const situationCoverage = new Set(sameBusiness.map((entry) => entry.situation.slug)).size
        return [0, bestSituationRank, bestMatrixOrder, -situationCoverage] as const
      }

      return [0, product.sortOrder, 0] as const
    }

    const rankA = contextRank(a)
    const rankB = contextRank(b)
    for (let i = 0; i < Math.max(rankA.length, rankB.length); i += 1) {
      const difference = (rankA[i] ?? 0) - (rankB[i] ?? 0)
      if (difference !== 0) return difference
    }

    return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  })

  return options?.take === undefined ? orderedProducts : orderedProducts.slice(0, options.take)
}

export const getProduct = cache(async function getProduct(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, active: true, publicVisible: true },
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
  return prisma.product.findMany({ where: { active: true, publicVisible: true }, select: { slug: true } })
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
