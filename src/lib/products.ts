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
  options?: { take?: number }
) {
  return prisma.product.findMany({
    where: {
      active: true,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
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
        include: { values: true },
        orderBy: { id: 'asc' },
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
      outgoingRelations: {
        include: {
          relatedProduct: {
            include: {
              category: true,
              variants: {
                select: { price: true },
                orderBy: { price: 'asc' },
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
    where: { active: true },
    select: { slug: true },
  })
}

export async function getAllProductsAdmin() {
  await requireAdmin()

  return prisma.product.findMany({
    include: {
      category: true,
      options: { include: { values: true } },
      variants: { include: { options: { include: { optionValue: true } } } },
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
    where: excludeProductId ? { id: { not: excludeProductId } } : undefined,
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
