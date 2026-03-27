import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }
}

export async function getProducts(categorySlug?: string, search?: string) {
  return prisma.product.findMany({
    where: {
      active: true,
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      category: true,
      variants: {
        select: { price: true },
        orderBy: { price: 'asc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getProduct(slug: string) {
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
    },
  })
}

export async function getAllProductsAdmin() {
  await requireAdmin()

  return prisma.product.findMany({
    include: {
      category: true,
      options: { include: { values: true } },
      variants: { include: { options: { include: { optionValue: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
