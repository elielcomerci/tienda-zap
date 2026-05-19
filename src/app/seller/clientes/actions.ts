'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const leadSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es requerido'),
  email: z.string().trim().email('Email invalido').optional().or(z.literal('')),
  phone: z.string().trim().min(6, 'El telefono es requerido'),
  businessName: z.string().trim().optional(),
  businessTypeId: z.string().trim().optional(),
  interest: z.string().trim().optional(),
  status: z.enum(['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST']).default('NEW'),
  notes: z.string().trim().optional(),
  nextContactAt: z.string().trim().optional(),
})

async function requireSeller() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const seller = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { sellerProfile: true },
  })

  if (!seller || (seller.role !== 'SELLER' && seller.role !== 'ADMIN')) {
    throw new Error('Unauthorized')
  }

  if (seller.role !== 'ADMIN' && !seller.sellerProfile?.active) {
    throw new Error('Tu cuenta de vendedor todavia no esta activa.')
  }

  return seller
}

export async function createSellerLead(formData: FormData) {
  const seller = await requireSeller()
  const parsed = leadSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    return {
      error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] || 'Revisa los datos del prospecto.',
    }
  }

  const data = parsed.data
  const existingUser = data.email
    ? await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true, sellerId: true },
      })
    : null

  if (existingUser?.sellerId && existingUser.sellerId !== seller.id) {
    return { error: 'Ese email ya pertenece a un cliente asociado a otro vendedor.' }
  }

  const existingLead = await prisma.sellerLead.findFirst({
    where: {
      sellerId: seller.id,
      convertedUserId: null,
      OR: [
        ...(data.email ? [{ email: data.email }] : []),
        { phone: data.phone },
      ],
    },
    select: { id: true },
  })

  const leadData = {
    sellerId: seller.id,
    name: data.name,
    email: data.email || null,
    phone: data.phone,
    businessName: data.businessName || null,
    businessTypeId: data.businessTypeId || null,
    interest: data.interest || null,
    status: existingUser ? 'WON' as const : data.status,
    notes: data.notes || null,
    nextContactAt: data.nextContactAt ? new Date(`${data.nextContactAt}T12:00:00`) : null,
    convertedUserId: existingUser?.id || null,
  }

  if (existingLead) {
    await prisma.sellerLead.update({
      where: { id: existingLead.id },
      data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone,
      businessName: data.businessName || null,
      businessTypeId: data.businessTypeId || null,
      interest: data.interest || null,
      status: existingUser ? 'WON' : data.status,
      notes: data.notes || null,
      nextContactAt: data.nextContactAt ? new Date(`${data.nextContactAt}T12:00:00`) : null,
      convertedUserId: existingUser?.id || null,
      },
    })
  } else {
    await prisma.sellerLead.create({ data: leadData })
  }

  if (existingUser && !existingUser.sellerId) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { sellerId: seller.id },
    })
  }

  revalidatePath('/seller/clientes')
  revalidatePath('/seller/dashboard')
  return { success: true }
}

export async function updateSellerLeadStatus(leadId: string, status: 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST') {
  const seller = await requireSeller()

  await prisma.sellerLead.updateMany({
    where: { id: leadId, sellerId: seller.id },
    data: { status },
  })

  revalidatePath('/seller/clientes')
  revalidatePath('/seller/dashboard')
}

export async function updateSellerLeadNote(leadId: string, note: string | null) {
  const seller = await requireSeller()

  await prisma.sellerLead.updateMany({
    where: { id: leadId, sellerId: seller.id },
    data: { notes: note },
  })

  revalidatePath('/seller/clientes')
}
