import { prisma } from '@/lib/prisma'
import { catalogFamilies, catalogGroups } from '@/lib/catalog-domain'

/** Las familias son internas; la navegación pública se deriva de productos activos. */
export async function getPublicCategories() {
  const activeFamilies = await prisma.product.findMany({
    where: { active: true, engine: { not: null } },
    select: { engine: true },
    distinct: ['engine'],
  })
  const activeEngines = new Set(activeFamilies.map((product) => product.engine).filter(Boolean))
  const families = catalogFamilies.filter((family) => activeEngines.has(family.engine)).map((family) => ({
    id: family.slug, name: family.label, slug: family.slug,
  }))
  const activeProducts = await prisma.product.findMany({
    where: { active: true },
    select: { slug: true },
  })
  const activeSlugs = new Set(activeProducts.map((product) => product.slug))
  const groups = catalogGroups
    .filter((group) => group.productSlugs.some((slug) => activeSlugs.has(slug)))
    .map((group) => ({ id: group.slug, name: group.label, slug: group.slug }))
  return families.flatMap((family) =>
    family.slug === 'impresos-packaging' ? [family, ...groups] : [family]
  )
}
export const getCategories = getPublicCategories
