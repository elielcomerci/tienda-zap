import { prisma } from '@/lib/prisma'

export type DiscoveryNeed = {
  id: string
  slug: string
  name: string
  description: string | null
  _count: { offerEntries: number }
}

export type DiscoverySituation = {
  id: string
  slug: string
  name: string
  icon: string | null
  description: string | null
  needs: DiscoveryNeed[]
}

const activeOffer = { product: { active: true } }

function mapSituation(situation: {
  id: string
  slug: string
  name: string
  icon: string | null
  description: string | null
  offerEntries: Array<{
    needId: string
    need: { id: string; slug: string; name: string; description: string | null; active: boolean; order: number }
  }>
}): DiscoverySituation {
  const needs = Array.from(
    new Map(situation.offerEntries.map((entry) => [entry.need.id, entry.need])).values()
  )
    .filter((need) => need.active)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((need) => ({
      id: need.id,
      slug: need.slug,
      name: need.name,
      description: need.description,
      _count: {
        offerEntries: situation.offerEntries.filter((entry) => entry.needId === need.id).length,
      },
    }))

  return {
    id: situation.id,
    slug: situation.slug,
    name: situation.name,
    icon: situation.icon,
    description: situation.description,
    needs,
  }
}

export async function getPublicSituationBySlug(slug?: string, businessTypeSlug?: string) {
  if (!slug) return undefined

  const situation = await prisma.situation.findFirst({
    where: { slug, active: true },
    include: {
      offerEntries: {
        where: {
        ...activeOffer,
        ...(businessTypeSlug ? { businessType: { slug: businessTypeSlug } } : {}),
      },
        include: { need: true },
        orderBy: { order: 'asc' },
      },
    },
  })
  return situation ? mapSituation(situation) : null
}

export async function getPublicSituations(businessTypeSlug?: string) {
  const situations = await prisma.situation.findMany({
    where: {
      active: true,
      offerEntries: {
        some: {
          ...activeOffer,
          ...(businessTypeSlug ? { businessType: { slug: businessTypeSlug } } : {}),
        },
      },
    },
    include: {
      offerEntries: {
        where: {
          ...activeOffer,
          ...(businessTypeSlug ? { businessType: { slug: businessTypeSlug } } : {}),
        },
        include: { need: true },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  })

  return situations.map(mapSituation)
}
