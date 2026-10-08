import { prisma } from '@/lib/prisma'
import { catalogFamilies } from '@/lib/catalog-domain'

/** Las familias son internas; la navegación pública se deriva de productos activos. */
export async function getPublicCategories() {
  const activeFamilies = await prisma.product.findMany({
    where: { active: true, engine: { not: null } },
    select: { engine: true },
    distinct: ['engine'],
  })
  const activeEngines = new Set(activeFamilies.map((product) => product.engine).filter(Boolean))
  return catalogFamilies.filter((family) => activeEngines.has(family.engine)).map((family) => ({
    id: family.slug, name: family.label, slug: family.slug,
  }))
}
export const getCategories = getPublicCategories
