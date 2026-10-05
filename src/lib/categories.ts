import { catalogFamilies } from '@/lib/catalog-domain'

/**
 * Compatibilidad de ruta: el catálogo ahora se organiza por familia comercial
 * derivada del motor, no por el modelo Prisma Category retirado.
 */
export async function getPublicCategories() {
  return catalogFamilies.map((family) => ({
    id: family.slug,
    name: family.label,
    slug: family.slug,
  }))
}

export const getCategories = getPublicCategories
