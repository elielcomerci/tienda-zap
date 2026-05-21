import { prisma } from '@/lib/prisma'

export type MediaType = 'YOUTUBE' | 'AUDIO' | 'IMAGE' | 'NONE'

export interface Intention {
  id: string
  slug: string
  name: string
  icon: string | null
  description: string | null
  mediaType: string | null
  mediaUrl: string | null
  mediaTitle: string | null
}

export async function getIntentions() {
  return prisma.intention.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
  })
}

export async function getPublicIntentions() {
  return prisma.intention.findMany({
    where: {
      active: true,
      products: {
        some: {
          active: true,
          isCombo: false,
          category: { slug: { not: 'sistema' } },
        },
      },
    },
    orderBy: { order: 'asc' },
  })
}
