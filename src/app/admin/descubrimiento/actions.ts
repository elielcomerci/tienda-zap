'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slug'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') throw new Error('No autorizado')
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

function refreshDiscovery() {
  revalidatePath('/')
  revalidatePath('/productos')
  revalidatePath('/admin/descubrimiento')
}

export async function saveSituation(formData: FormData) {
  await requireAdmin()
  const id = text(formData, 'id')
  const name = text(formData, 'name')
  const slug = slugify(text(formData, 'slug') || name)
  if (!name || !slug) throw new Error('La situación necesita nombre y URL válidos.')
  const businessTypes = formData.getAll('businessTypeIds').map((id) => ({ id: String(id) }))
  const needs = formData.getAll('needIds').map((id) => ({ id: String(id) }))
  const data = {
    name, slug, icon: text(formData, 'icon') || null, description: text(formData, 'description') || null,
    active: formData.get('active') === 'on', order: Number(formData.get('order') || 0),
  }
  if (id) {
    await prisma.situation.update({
      where: { id },
      data: { ...data, businessTypes: { set: businessTypes }, needs: { set: needs } },
    })
  } else {
    await prisma.situation.create({
      data: { ...data, businessTypes: { connect: businessTypes }, needs: { connect: needs } },
    })
  }
  refreshDiscovery()
}

export async function saveNeed(formData: FormData) {
  await requireAdmin()
  const id = text(formData, 'id')
  const name = text(formData, 'name')
  const slug = slugify(text(formData, 'slug') || name)
  if (!name || !slug) throw new Error('La necesidad necesita nombre y URL válidos.')
  const businessTypes = formData.getAll('businessTypeIds').map((id) => ({ id: String(id) }))
  const situations = formData.getAll('situationIds').map((id) => ({ id: String(id) }))
  const data = {
    name, slug, description: text(formData, 'description') || null,
    active: formData.get('active') === 'on', order: Number(formData.get('order') || 0),
  }
  if (id) {
    await prisma.need.update({
      where: { id },
      data: { ...data, businessTypes: { set: businessTypes }, situations: { set: situations } },
    })
  } else {
    await prisma.need.create({
      data: { ...data, businessTypes: { connect: businessTypes }, situations: { connect: situations } },
    })
  }
  refreshDiscovery()
}

export async function deleteSituation(formData: FormData) {
  await requireAdmin()
  await prisma.situation.delete({ where: { id: text(formData, 'id') } })
  refreshDiscovery()
}

export async function deleteNeed(formData: FormData) {
  await requireAdmin()
  await prisma.need.delete({ where: { id: text(formData, 'id') } })
  refreshDiscovery()
}
