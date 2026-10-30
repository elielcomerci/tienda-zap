import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function resolveAccess(request: NextRequest, workId: string) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { response: NextResponse.json({ error: 'Inicia sesion para continuar.' }, { status: 401 })
  const account = await prisma.user.findUnique({ where: { id: userId }, select: { isBanned: true } })
  if (!account || account.isBanned) return { response: NextResponse.json({ error: 'La cuenta no puede realizar esta operación.' }, { status: 403 }) }

  const adminScope = session.user.role === 'ADMIN' && new URL(request.url).searchParams.get('scope') === 'admin'
  const work = await prisma.clientWork.findFirst({
    where: adminScope ? { id: workId } : { id: workId, userId },
    select: { id: true },
  })
  if (!work) return { response: NextResponse.json({ error: 'No encontramos este trabajo.' }, { status: 404 }) }
  return { userId, workId, adminScope }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ workId: string }> }) {
  const { workId } = await params
  const access = await resolveAccess(request, workId)
  if ('response' in access) return access.response

  const messages = await prisma.clientWorkMessage.findMany({
    where: { workId: access.workId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, body: true, createdAt: true, senderId: true, sender: { select: { name: true, role: true } } },
  })
  const incomingMessageIds = messages.filter(message => message.senderId !== access.userId).map(message => message.id)
  if (incomingMessageIds.length) {
    await prisma.clientWorkMessageRead.createMany({
      data: incomingMessageIds.map(messageId => ({ messageId, userId: access.userId })),
      skipDuplicates: true,
    })
  }
  return NextResponse.json({ messages: messages.reverse() }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ workId: string }> }) {
  const { workId } = await params
  const access = await resolveAccess(request, workId)
  if ('response' in access) return access.response

  try {
    const payload = await request.json()
    const body = typeof payload?.body === 'string' ? payload.body.trim() : ''
    if (!body || body.length > 4000) {
      return NextResponse.json({ error: 'El mensaje debe tener entre 1 y 4000 caracteres.' }, { status: 400 })
    }
    const message = await prisma.$transaction(async tx => {
      const created = await tx.clientWorkMessage.create({
        data: { workId: access.workId, senderId: access.userId, body },
        select: { id: true, body: true, createdAt: true, senderId: true, sender: { select: { name: true, role: true } } },
      })
      await tx.clientWork.update({ where: { id: workId }, data: { updatedAt: new Date() } })
      return created
    })
    return NextResponse.json({ message }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('No se pudo guardar el mensaje del trabajo:', error)
    return NextResponse.json({ error: 'No pudimos enviar el mensaje.' }, { status: 500 })
  }
}
