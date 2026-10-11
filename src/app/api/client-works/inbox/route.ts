import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { isClientWorkFilesEnabled } from '@/lib/client-work-files'
import { recordClientWorkActivity } from '@/lib/client-work-audit'

export const dynamic = 'force-dynamic'

/**
 * Ensures a customer has a general-purpose work area for sending material to ZAP.
 * This lets customers upload files before an administrator has created a named project.
 */
export async function POST() {
  if (!isClientWorkFilesEnabled()) {
    return NextResponse.json({ error: 'Trabajos y archivos todavía no está habilitado.' }, { status: 503 })
  }

  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Iniciá sesión para enviar archivos.' }, { status: 401 })
  }
  if (session.user.role === 'ADMIN') {
    return NextResponse.json({ error: 'Usá la administración para crear un trabajo para un cliente.' }, { status: 403 })
  }

  try {
    const title = 'Material compartido'
    let work = await prisma.clientWork.findFirst({
      where: { userId, title },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true },
    })

    if (!work) {
      work = await prisma.clientWork.create({
        data: {
          userId,
          createdById: userId,
          title,
          description: 'Espacio general para enviar archivos y material a ZAP.',
        },
        select: { id: true, title: true },
      })
      await recordClientWorkActivity({
        actorId: userId,
        actorEmail: session.user.email,
        action: 'clientWork.inbox.create',
        entityType: 'ClientWork',
        entityId: work.id,
        description: 'Espacio general de material creado por el cliente',
        metadata: { workId: work.id },
      })
    }

    return NextResponse.json({ work }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('No se pudo preparar el espacio de material del cliente:', error)
    return NextResponse.json({ error: 'No pudimos preparar el espacio para tus archivos.' }, { status: 500 })
  }
}
