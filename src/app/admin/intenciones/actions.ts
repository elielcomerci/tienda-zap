'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') throw new Error('No autorizado')
}

export async function createIntention(data: {
  slug: string
  name: string
  icon?: string
  description?: string
  mediaType: string
  mediaUrl?: string
  mediaTitle?: string
  order: number
}) {
  await requireAdmin()

  await prisma.intention.create({
    data,
  })

  revalidatePath('/admin/intenciones')
  revalidatePath('/productos')
}

export async function updateIntention(
  id: string,
  data: {
    slug: string
    name: string
    icon?: string
    description?: string
    mediaType: string
    mediaUrl?: string
    mediaTitle?: string
    order: number
    active: boolean
  }
) {
  await requireAdmin()

  await prisma.intention.update({
    where: { id },
    data,
  })

  revalidatePath('/admin/intenciones')
  revalidatePath('/productos')
}

export async function toggleIntentionActive(id: string, active: boolean) {
  await requireAdmin()

  await prisma.intention.update({
    where: { id },
    data: { active },
  })

  revalidatePath('/admin/intenciones')
  revalidatePath('/productos')
}

export async function deleteIntention(id: string) {
  await requireAdmin()

  await prisma.intention.delete({
    where: { id },
  })

  revalidatePath('/admin/intenciones')
  revalidatePath('/productos')
}
