'use server'

import { createHash } from 'node:crypto'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireCustomerDataAccess() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { sellerProfile: true },
  })

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
    throw new Error('No tenés permiso para importar conversaciones.')
  }
  if (user.role === 'SELLER' && !user.sellerProfile?.active) {
    throw new Error('Tu cuenta de asesor todavía no está activa.')
  }
  return user
}

export async function importCustomerConversation(formData: FormData) {
  const user = await requireCustomerDataAccess()
  const businessAccountId = String(formData.get('businessAccountId') || '').trim()
  const title = String(formData.get('title') || '').trim().slice(0, 180)
  const rawTranscript = String(formData.get('rawTranscript') || '').trim()
  const dateValue = String(formData.get('conversationAt') || '').trim()

  if (!businessAccountId || rawTranscript.length < 10) {
    redirect('/admin/clientes/conversaciones?error=missing')
  }
  if (rawTranscript.length > 100000) {
    redirect('/admin/clientes/conversaciones?error=length')
  }

  const account = await prisma.businessAccount.findFirst({
    where: {
      id: businessAccountId,
      ...(user.role === 'ADMIN'
        ? {}
        : {
            OR: [
              { assignedSellerId: user.id },
              { operationalSellerId: user.id },
              { sellerLeads: { some: { sellerId: user.id } } },
            ],
          }),
    },
    select: { id: true },
  })
  if (!account) throw new Error('La cuenta no existe o no pertenece a tu cartera.')

  const contentHash = createHash('sha256').update(rawTranscript).digest('hex')
  const conversationAt = dateValue ? new Date(dateValue + 'T12:00:00') : null
  if (conversationAt && Number.isNaN(conversationAt.getTime())) {
    redirect('/admin/clientes/conversaciones?error=date')
  }

  try {
    const conversation = await prisma.customerConversation.create({
      data: {
        businessAccountId,
        importedById: user.id,
        title: title || null,
        source: 'WHATSAPP_PASTE',
        rawTranscript,
        contentHash,
        conversationAt,
      },
    })

    await prisma.customerTimelineEvent.create({
      data: {
        businessAccountId,
        actorUserId: user.id,
        eventType: 'CONVERSATION_IMPORTED',
        sourceType: 'CUSTOMER_CONVERSATION',
        sourceId: conversation.id,
        occurredAt: conversationAt || conversation.importedAt,
        payload: { source: 'WHATSAPP_PASTE', title: title || null },
      },
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      redirect('/admin/clientes/conversaciones?error=duplicate')
    }
    throw error
  }

  revalidatePath('/admin/clientes')
  revalidatePath('/admin/clientes/conversaciones')
  redirect('/admin/clientes/conversaciones?saved=1')
}
