import { cache } from 'react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }
}

export async function getProducts(
  categorySlug?: string,
  search?: string,
  options?: { take?: number; intentSlug?: string }
) {
  return prisma.product.findMany({
    where: {
      active: true,
      isCombo: false,
      category: categorySlug ? { slug: categorySlug } : { slug: { not: 'sistema' } },
      ...(options?.intentSlug ? { intentions: { some: { slug: options.intentSlug } } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      category: true,
      variants: {
        select: { price: true },
        orderBy: { price: 'asc' },
      },
      quoterConfig: {
        include: {
          rawMaterial: {
            include: { tiers: { orderBy: { minQty: 'asc' } } },
          },
          allowedMaterials: {
            include: {
              rawMaterial: {
                include: { tiers: { orderBy: { minQty: 'asc' } } },
              },
            },
          },
          finishings: {
            include: {
              finishing: {
                include: { tiers: { orderBy: { minQty: 'asc' } } },
              },
            },
          },
          quantityPresets: { orderBy: { sortOrder: 'asc' } },
          sizePresets: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: options?.take,
  })
}

export const getProduct = cache(async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      options: {
        include: { values: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
      variants: {
        include: {
          options: {
            include: {
              optionValue: {
                include: { option: true },
              },
            },
          },
        },
      },
      quoterConfig: {
        include: {
          rawMaterial: {
            include: { tiers: { orderBy: { minQty: 'asc' } } },
          },
          allowedMaterials: {
            include: {
              rawMaterial: {
                include: { tiers: { orderBy: { minQty: 'asc' } } },
              },
            },
          },
          finishings: {
            include: {
              finishing: {
                include: { tiers: { orderBy: { minQty: 'asc' } } },
              },
            },
          },
          quantityPresets: { orderBy: { sortOrder: 'asc' } },
          sizePresets: { orderBy: { sortOrder: 'asc' } },
        },
      },
      outgoingRelations: {
        include: {
          relatedProduct: {
            include: {
              category: true,
              options: {
                include: { values: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
              },
              variants: {
                include: {
                  options: {
                    include: {
                      optionValue: {
                        include: { option: true },
                      },
                    },
                  },
                },
              },
              quoterConfig: {
                include: {
                  rawMaterial: {
                    include: { tiers: { orderBy: { minQty: 'asc' } } },
                  },
                  allowedMaterials: {
                    include: {
                      rawMaterial: {
                        include: { tiers: { orderBy: { minQty: 'asc' } } },
                      },
                    },
                  },
                  finishings: {
                    include: {
                      finishing: {
                        include: { tiers: { orderBy: { minQty: 'asc' } } },
                      },
                    },
                  },
                  quantityPresets: { orderBy: { sortOrder: 'asc' } },
                  sizePresets: { orderBy: { sortOrder: 'asc' } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
})

export async function getActiveProductSlugs() {
  return prisma.product.findMany({
    where: { 
      active: true,
      category: { slug: { not: 'sistema' } }
    },
    select: { slug: true },
  })
}

export async function getAllProductsAdmin() {
  await requireAdmin()

  return prisma.product.findMany({
    include: {
      category: true,
      options: {
        include: { values: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
      variants: { include: { options: { include: { optionValue: true } } } },
      targetBusinessTypes: { select: { id: true, name: true, slug: true } },
      outgoingRelations: {
        select: { relatedProductId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getProductRelationOptions(excludeProductId?: string) {
  await requireAdmin()

  return prisma.product.findMany({
    where: {
      isCombo: false,
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      images: true,
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })
}

/**
 * Returns combos visible to the user:
 * - If the user has a businessType, returns combos targeting that rubro + combos with no restrictions.
 * - If no user/rubro, returns all active combos.
 */
export async function getCombos(businessTypeId?: string | null, search?: string) {
  const result = await prisma.product.findMany({
    where: {
      active: true,
      isCombo: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(businessTypeId
        ? {
            OR: [
              { targetBusinessTypes: { some: { id: businessTypeId } } },
              { targetBusinessTypes: { none: {} } },
            ],
          }
        : {}),
    },
    include: {
      category: true,
      variants: { select: { price: true }, orderBy: { price: 'asc' } },
      targetBusinessTypes: { select: { id: true, name: true, slug: true } },
      outgoingRelations: {
        include: {
          relatedProduct: {
            include: {
              category: true,
              variants: { select: { price: true }, orderBy: { price: 'asc' } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return result
}
