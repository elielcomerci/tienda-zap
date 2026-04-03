'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
}

export async function getCampaigns() {
  await requireAdmin()
  return prisma.partnerCampaign.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function createCampaign(data: {
  zone: string
  format: string
  title: string
  description?: string
  ctaText?: string
  imageUrl?: string
  backgroundColor?: string
  textColor?: string
  actionType: string
  actionUrl?: string
  productId?: string
  active?: boolean
}) {
  await requireAdmin()
  
  const campaign = await prisma.partnerCampaign.create({
    data: {
      description: data.description || null,
      ctaText: data.ctaText || null,
      imageUrl: data.imageUrl || null,
      backgroundColor: data.backgroundColor || null,
      textColor: data.textColor || null,
      actionUrl: data.actionUrl || null,
      productId: data.productId || null,
      title: data.title,
      zone: data.zone,
      format: data.format,
      actionType: data.actionType,
      active: data.active ?? true,
    }
  })
  revalidatePath('/admin/campanas')
  return campaign
}

export async function updateCampaign(id: string, data: Partial<Parameters<typeof createCampaign>[0]>) {
  await requireAdmin()
  const campaign = await prisma.partnerCampaign.update({
    where: { id },
    data: {
      title: data.title,
      zone: data.zone,
      format: data.format,
      actionType: data.actionType,
      active: data.active,
      description: data.description || null,
      ctaText: data.ctaText || null,
      imageUrl: data.imageUrl || null,
      backgroundColor: data.backgroundColor || null,
      textColor: data.textColor || null,
      actionUrl: data.actionUrl || null,
      productId: data.productId || null,
    }
  })
  revalidatePath('/admin/campanas')
  return campaign
}

export async function toggleCampaignActive(id: string, active: boolean) {
  await requireAdmin()
  const campaign = await prisma.partnerCampaign.update({
    where: { id },
    data: { active }
  })
  revalidatePath('/admin/campanas')
  return campaign
}

export async function deleteCampaign(id: string) {
  await requireAdmin()
  await prisma.partnerCampaign.delete({ where: { id } })
  revalidatePath('/admin/campanas')
}
