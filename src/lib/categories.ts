import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/** La navegación pública se administra desde ZAP Admin y sólo muestra categorías con productos activos. */
export async function getPublicCategories() {
  const categories = await prisma.category.findMany({
    where: {
      active: true,
      products: { some: { product: { active: true } } },
    },
    select: { id: true, name: true, slug: true, sortOrder: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  return categories.map(({ sortOrder: _sortOrder, ...category }) => category)
}

export async function getAdminCategories() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') throw new Error('No autorizado')
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

export const getCategories = getPublicCategories
