'use server'

import { revalidatePath } from 'next/cache'
import { createBusinessType, updateBusinessType, deleteBusinessType } from '@/lib/business-types'

export async function createBusinessTypeAction(formData: FormData) {
  const name = formData.get('name') as string
  const slug = (formData.get('slug') as string)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const categoryIds = formData.getAll('categoryIds') as string[]

  if (!name || !slug) throw new Error('Nombre y slug son requeridos')

  await createBusinessType({ name, slug, categoryIds })
  revalidatePath('/admin/rubros')
}

export async function updateBusinessTypeAction(formData: FormData) {
  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const slug = (formData.get('slug') as string)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const categoryIds = formData.getAll('categoryIds') as string[]

  if (!id || !name || !slug) throw new Error('Datos incompletos')

  await updateBusinessType(id, { name, slug, categoryIds })
  revalidatePath('/admin/rubros')
}

export async function deleteBusinessTypeAction(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) throw new Error('ID requerido')

  await deleteBusinessType(id)
  revalidatePath('/admin/rubros')
}
