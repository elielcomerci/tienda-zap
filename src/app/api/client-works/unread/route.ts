import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { isClientWorkFilesEnabled } from '@/lib/client-work-files'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isClientWorkFilesEnabled()) return NextResponse.json({ unread: 0 }, { headers: { 'Cache-Control': 'private, no-store' } })
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Inicia sesion para continuar.' }, { status: 401 })

  const adminScope = session.user.role === 'ADMIN' && new URL(request.url).searchParams.get('scope') === 'admin'
  const unread = await prisma.clientWorkMessage.count({
    where: {
      senderId: { not: userId },
      sender: { role: adminScope ? { not: 'ADMIN' } : 'ADMIN' },
      work: adminScope ? {} : { userId },
      reads: { none: { userId } },
    },
  })
  return NextResponse.json({ unread }, { headers: { 'Cache-Control': 'private, no-store' } })
}
