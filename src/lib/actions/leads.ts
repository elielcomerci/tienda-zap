'use server'

import { prisma } from '@/lib/prisma'
import { getActiveSellerById } from '@/lib/sellers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const publicLeadSchema = z.object({
  sellerId: z.string().min(1),
  name: z.string().trim().min(2, 'El nombre es requerido'),
  phone: z.string().trim().min(6, 'El telefono es requerido'),
  email: z.string().trim().email('Email invalido').optional().or(z.literal('')),
  interest: z.string().trim().optional(),
})

async function logLeadEvent(leadId: string, type: string, note?: string | null) {
  await prisma.sellerLeadEvent.create({
    data: {
      leadId,
      type,
      note: note || null,
    },
  })
}

export async function createPublicSellerLead(formData: FormData) {
  const parsed = publicLeadSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    return {
      error: Object.values(parsed.error.flatten().fieldErrors).flat()[0] || 'Revisa los datos.',
    }
  }

  const data = parsed.data
  const seller = await getActiveSellerById(data.sellerId)
  if (!seller) return { error: 'El vendedor no esta disponible.' }

  const existingUser = data.email
    ? await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true, sellerId: true },
      })
    : null

  if (existingUser?.sellerId && existingUser.sellerId !== seller.id) {
    return { error: 'Ya estas asociado a otro vendedor de ZAP.' }
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
    phone: data.phone,
    email: data.email || null,
    interest: data.interest || 'Consulta desde link de vendedor',
    status: existingUser ? 'WON' as const : 'NEW' as const,
    convertedUserId: existingUser?.id || null,
  }

  let leadId = existingLead?.id

  if (existingLead) {
    await prisma.sellerLead.update({
      where: { id: existingLead.id },
      data: leadData,
    })
  } else {
    const createdLead = await prisma.sellerLead.create({ data: leadData })
    leadId = createdLead.id
  }

  if (leadId) {
    await logLeadEvent(
      leadId,
      existingLead ? 'UPDATED' : 'CREATED',
      'Contacto recibido desde link de vendedor.'
    )
  }

  if (existingUser && !existingUser.sellerId) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { sellerId: seller.id },
    })
    if (leadId) {
      await logLeadEvent(leadId, 'CONVERTED', 'Usuario existente asociado desde formulario publico.')
    }
  }

  revalidatePath('/seller/clientes')
  revalidatePath('/seller/dashboard')
  return { success: true }
}
