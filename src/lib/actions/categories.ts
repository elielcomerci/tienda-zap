'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slug'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') throw new Error('No autorizado')
}

async function uniqueCategorySlug(value: string, excludeId?: string) {
  const base = slugify(value)
  if (!base) throw new Error('La categoría necesita un nombre o slug válido.')
  let slug = base
  let suffix = 2
  while (await prisma.category.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })) {
    slug = `${base}-${suffix++}`
  }
  return slug
}

function refreshCatalog() {
  revalidatePath('/admin/categorias')
  revalidatePath('/admin/productos')
  revalidatePath('/productos')
  revalidatePath('/')
}

export async function createCategory(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get('name') || '').trim()
  if (!name) throw new Error('El nombre de la categoría es obligatorio.')
  await prisma.category.create({
    data: {
      name,
      slug: await uniqueCategorySlug(String(formData.get('slug') || name)),
      description: String(formData.get('description') || '').trim() || null,
      sortOrder: Number(formData.get('sortOrder') || 0),
      active: formData.get('active') === 'on',
    },
  })
  refreshCatalog()
}

export async function updateCategory(id: string, formData: FormData) {
  await requireAdmin()
  const name = String(formData.get('name') || '').trim()
  if (!name) throw new Error('El nombre de la categoría es obligatorio.')
  await prisma.category.update({
    where: { id },
    data: {
      name,
      slug: await uniqueCategorySlug(String(formData.get('slug') || name), id),
      description: String(formData.get('description') || '').trim() || null,
      sortOrder: Number(formData.get('sortOrder') || 0),
      active: formData.get('active') === 'on',
    },
  })
  refreshCatalog()
}
