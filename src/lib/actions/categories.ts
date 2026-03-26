'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') throw new Error('No autorizado')
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } })
}

export async function createCategory(formData: FormData) {
  await requireAdmin()
  const name = formData.get('name') as string
  if (!name) throw new Error('Nombre requerido')
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  await prisma.category.create({ data: { name, slug } })
  revalidatePath('/admin/categorias')
}

export async function updateCategory(id: string, name: string) {
  await requireAdmin()
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  await prisma.category.update({ where: { id }, data: { name, slug } })
  revalidatePath('/admin/categorias')
}

export async function deleteCategory(id: string) {
  await requireAdmin()
  const count = await prisma.product.count({ where: { categoryId: id } })
  if (count > 0) throw new Error(`Esta categoría tiene ${count} producto(s) asociados`)
  await prisma.category.delete({ where: { id } })
  revalidatePath('/admin/categorias')
}
