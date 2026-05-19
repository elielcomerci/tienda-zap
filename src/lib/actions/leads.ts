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

  if (existingLead) {
    await prisma.sellerLead.update({
      where: { id: existingLead.id },
      data: leadData,
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
