import { prisma } from '@/lib/prisma'

export async function getCategories() {
  return prisma.category.findMany({ 
    where: { slug: { not: 'sistema' } },
    orderBy: { name: 'asc' } 
  })
}
