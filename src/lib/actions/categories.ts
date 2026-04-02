'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slug'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('No autorizado')
  }
}

export async function createCategory(formData: FormData) {
  await requireAdmin()

  const name = (formData.get('name') as string) || ''
  if (!name.trim()) {
    throw new Error('Nombre requerido')
  }

  const slug = slugify(name)
  if (!slug) {
    throw new Error('No pudimos generar un slug valido para la categoria.')
  }

  const isService = formData.getAll('isService').includes('true')

  await prisma.category.create({
    data: {
      name,
      slug,
      isService,
    },
  })

  revalidatePath('/')
  revalidatePath('/admin/categorias')
  revalidatePath('/productos')
}

export async function updateCategory(id: string, name: string, isService = false) {
  await requireAdmin()

  const slug = slugify(name)
  if (!slug) {
    throw new Error('No pudimos generar un slug valido para la categoria.')
  }

  await prisma.category.update({
    where: { id },
    data: { name, slug, isService },
  })

  revalidatePath('/')
  revalidatePath('/admin/categorias')
  revalidatePath('/productos')
}

export async function setCategoryServiceFlag(id: string, isService: boolean) {
  await requireAdmin()

  await prisma.category.update({
    where: { id },
    data: { isService },
  })

  revalidatePath('/')
  revalidatePath('/admin/categorias')
  revalidatePath('/admin/productos')
  revalidatePath('/productos')
}

export async function deleteCategory(id: string) {
  await requireAdmin()
  const count = await prisma.product.count({ where: { categoryId: id } })
  if (count > 0) throw new Error(`Esta categoria tiene ${count} producto(s) asociados`)
  await prisma.category.delete({ where: { id } })
  revalidatePath('/')
  revalidatePath('/admin/categorias')
  revalidatePath('/productos')
}
