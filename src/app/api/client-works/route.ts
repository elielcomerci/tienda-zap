import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { isClientWorkFilesEnabled } from '@/lib/client-work-files'
import { recordClientWorkActivity } from '@/lib/client-work-audit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Iniciá sesión para ver tus trabajos.' }, { status: 401 })

  const requestedScope = new URL(request.url).searchParams.get('scope')
  const isAdminView = session.user?.role === 'ADMIN' && requestedScope === 'admin'
  const works = await prisma.clientWork.findMany({
    where: isAdminView ? undefined : { userId },
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      user: { select: { id: true, name: true, email: true } },
      files: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, fileName: true, contentType: true, sizeBytes: true,
          note: true, createdAt: true, updatedAt: true, uploadedById: true, cleanupError: true,
          uploadedBy: { select: { name: true, role: true } },
          approvals: {
            orderBy: { requestedAt: 'desc' }, take: 20,
            include: { requestedBy: { select: { name: true } }, respondedBy: { select: { name: true } } },
          },
        },
      },
    },
  })
  return NextResponse.json({ works }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest) {
  if (!isClientWorkFilesEnabled()) return NextResponse.json({ error: 'Trabajos y archivos todavía no está habilitado.' }, { status: 503 })
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : ''
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : ''
    if (!userId || !title) return NextResponse.json({ error: 'Seleccioná un cliente y un nombre para el trabajo.' }, { status: 400 })
    const customer = await prisma.user.findFirst({ where: { id: userId, role: 'CUSTOMER', isBanned: false }, select: { id: true } })
    if (!customer) return NextResponse.json({ error: 'No encontramos un cliente habilitado.' }, { status: 404 })
    const work = await prisma.clientWork.create({
      data: { userId, createdById: session.user.id, title, description: description || null },
      include: { user: { select: { id: true, name: true, email: true } }, files: true },
    })
    await recordClientWorkActivity({ actorId: session.user.id, actorEmail: session.user.email, action: 'clientWork.create', entityType: 'ClientWork', entityId: work.id, description: `Trabajo creado: ${work.title}`, metadata: { userId, workId: work.id } })
    return NextResponse.json({ work }, { status: 201 })
  } catch (error) {
    console.error('No se pudo crear el trabajo de cliente:', error)
    return NextResponse.json({ error: 'No pudimos crear el trabajo.' }, { status: 500 })
  }
}
