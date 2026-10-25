import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { isClientWorkFilesEnabled } from '@/lib/client-work-files'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ workId: string; fileId: string }> }

async function resolveApprovalAccess(request: NextRequest, workId: string, fileId: string) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { response: NextResponse.json({ error: 'Iniciá sesión para continuar.' }, { status: 401 }) }
  const adminScope = session.user.role === 'ADMIN' && new URL(request.url).searchParams.get('scope') === 'admin'
  const file = await prisma.clientWorkFile.findFirst({
    where: { id: fileId, workId, ...(adminScope ? {} : { work: { userId } }) },
    select: { id: true, updatedAt: true, uploadedBy: { select: { role: true } } },
  })
  if (!file) return { response: NextResponse.json({ error: 'No encontramos este archivo.' }, { status: 404 }) }
  return { userId, file, adminScope }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  if (!isClientWorkFilesEnabled()) return NextResponse.json({ error: 'El espacio de trabajos no está habilitado.' }, { status: 503 })
  const { workId, fileId } = await params
  const access = await resolveApprovalAccess(request, workId, fileId)
  if ('response' in access) return access.response
  const approvals = await prisma.clientWorkFileApproval.findMany({
    where: { fileId }, orderBy: { requestedAt: 'desc' }, take: 20,
    include: { requestedBy: { select: { name: true } }, respondedBy: { select: { name: true } } },
  })
  return NextResponse.json({ approvals }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!isClientWorkFilesEnabled()) return NextResponse.json({ error: 'El espacio de trabajos no está habilitado.' }, { status: 503 })
  const { workId, fileId } = await params
  const access = await resolveApprovalAccess(request, workId, fileId)
  if ('response' in access) return access.response

  try {
    const payload = await request.json()
    if (access.adminScope) {
      if (access.file.uploadedBy.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Solo se pueden enviar a aprobación las entregas del equipo ZAP.' }, { status: 400 })
      }
      const pending = await prisma.clientWorkFileApproval.findFirst({ where: { fileId, status: 'PENDING', fileUpdatedAt: access.file.updatedAt }, select: { id: true } })
      if (pending) return NextResponse.json({ error: 'Este archivo ya tiene una aprobación pendiente.' }, { status: 409 })
      const approval = await prisma.clientWorkFileApproval.create({ data: { fileId, requestedById: access.userId, fileUpdatedAt: access.file.updatedAt, activeKey: `${fileId}:${access.file.updatedAt.toISOString()}` } })
      return NextResponse.json({ approval }, { status: 201 })
    }

    if (access.file.uploadedBy.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Este archivo no es una entrega del equipo ZAP.' }, { status: 400 })
    }
    const status = payload?.status
    if (status !== 'APPROVED' && status !== 'CHANGES_REQUESTED') {
      return NextResponse.json({ error: 'Elegí aprobar la entrega o solicitar cambios.' }, { status: 400 })
    }
    const responseText = typeof payload.response === 'string' ? payload.response.trim().slice(0, 2000) : ''
    if (status === 'CHANGES_REQUESTED' && !responseText) {
      return NextResponse.json({ error: 'Contanos qué cambios necesitás para que el equipo pueda revisarlos.' }, { status: 400 })
    }
    const pending = await prisma.clientWorkFileApproval.findFirst({ where: { fileId, status: 'PENDING', fileUpdatedAt: access.file.updatedAt }, orderBy: { requestedAt: 'desc' }, select: { id: true } })
    if (!pending) return NextResponse.json({ error: 'No hay una solicitud de aprobación pendiente para este archivo.' }, { status: 409 })
    const approval = await prisma.clientWorkFileApproval.update({
      where: { id: pending.id },
      data: { status, activeKey: null, response: responseText || null, respondedById: access.userId, respondedAt: new Date() },
    })
    return NextResponse.json({ approval })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Este archivo ya tiene una solicitud de aprobación pendiente.' }, { status: 409 })
    }
    console.error('No se pudo procesar la aprobación del archivo:', error)
    return NextResponse.json({ error: 'No pudimos guardar la respuesta de aprobación.' }, { status: 500 })
  }
}
