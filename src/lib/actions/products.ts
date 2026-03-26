'use server'

import { prisma } from '@/lib/prisma'
import { productSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }
}

export async function createProduct(formData: FormData) {
  await requireAdmin()

  const raw = {
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    description: formData.get('description') as string,
    price: formData.get('price'),
    categoryId: formData.get('categoryId') as string,
    stock: formData.get('stock'),
    images: JSON.parse(formData.get('images') as string),
    active: formData.get('active') === 'true',
  }

  const data = productSchema.parse(raw)

  await prisma.product.create({ data })
  revalidatePath('/admin/productos')
  revalidatePath('/productos')
  redirect('/admin/productos')
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdmin()

  const raw = {
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    description: formData.get('description') as string,
    price: formData.get('price'),
    categoryId: formData.get('categoryId') as string,
    stock: formData.get('stock'),
    images: JSON.parse(formData.get('images') as string),
    active: formData.get('active') === 'true',
  }

  const data = productSchema.parse(raw)

  await prisma.product.update({ where: { id }, data })
  revalidatePath('/admin/productos')
  revalidatePath('/productos')
  redirect('/admin/productos')
}

export async function deleteProduct(id: string) {
  await requireAdmin()
  await prisma.product.update({ where: { id }, data: { active: false } })
  revalidatePath('/admin/productos')
}

export async function duplicateProduct(id: string) {
  await requireAdmin()
  const original = await prisma.product.findUnique({ where: { id } })
  if (!original) throw new Error('Producto no encontrado')

  const { id: _, createdAt, updatedAt, ...rest } = original
  await prisma.product.create({
    data: {
      ...rest,
      name: `${rest.name} (copia)`,
      slug: `${rest.slug}-copia-${Date.now()}`,
      active: false,
    },
  })
  revalidatePath('/admin/productos')
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
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: { category: true },
  })
}

export async function getAllProductsAdmin() {
  return prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  })
}
