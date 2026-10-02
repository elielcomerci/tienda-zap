import { prisma } from '@/lib/prisma'

const publicProduct = {
  active: true,
  isCombo: false,
  category: { slug: { not: 'sistema' } },
}

export type DiscoveryNeed = {
  id: string
  slug: string
  name: string
  description: string | null
  _count: { products: number }
}

export type DiscoverySituation = {
  id: string
  slug: string
  name: string
  icon: string | null
  description: string | null
  needs: DiscoveryNeed[]
}

export async function getPublicSituations(businessTypeSlug?: string) {
  return prisma.situation.findMany({
    where: {
      active: true,
      ...(businessTypeSlug
        ? { businessTypes: { some: { slug: businessTypeSlug } } }
        : {}),
      needs: { some: { active: true } },
    },
    include: {
      needs: {
        where: {
          active: true,
          ...(businessTypeSlug
            ? { businessTypes: { some: { slug: businessTypeSlug } } }
            : {}),
        },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          _count: { select: { products: { where: publicProduct } } },
        },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      },
    },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  })
}
