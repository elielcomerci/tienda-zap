'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function associateClient(emailOrDocument: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const seller = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!seller || (seller.role !== 'SELLER' && seller.role !== 'ADMIN')) {
    throw new Error('Unauthorized')
  }

  const client = await prisma.user.findFirst({
    where: {
      OR: [
        { email: emailOrDocument },
        { documentId: emailOrDocument },
      ],
      role: 'CUSTOMER',
    },
  })

  if (!client) {
    return { error: 'No se encontró ningún cliente con ese correo o documento.' }
  }

  if (client.sellerId === seller.id) {
    return { error: 'Este cliente ya pertenece a tu cartera.' }
  }

  if (client.sellerId) {
    return { error: 'Este cliente ya está asociado a otro vendedor.' }
  }

  await prisma.user.update({
    where: { id: client.id },
    data: { sellerId: seller.id },
  })

  revalidatePath('/seller/clientes')
  return { success: true }
}
