import { prisma } from '@/lib/prisma'

export async function getCategories() {
  return prisma.category.findMany({ 
    where: { slug: { not: 'sistema' } },
    orderBy: { name: 'asc' } 
  })
}

export async function getPublicCategories() {
  return prisma.category.findMany({
    where: {
      slug: { not: 'sistema' },
      products: {
        some: {
          active: true,
          isCombo: false,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: { name: 'asc' },
  })
}
