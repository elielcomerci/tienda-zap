import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { deleteR2Object, getR2PrivateBucketName } from '@/lib/r2'
import { isClientWorkFilesEnabled } from '@/lib/client-work-files'
import { NextResponse } from 'next/server'
import { recordClientWorkActivity } from '@/lib/client-work-audit'

export async function POST(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  if (!isClientWorkFilesEnabled()) return NextResponse.json({ error: 'Trabajos y archivos todavía no está habilitado.' }, { status: 503 })
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo administración puede reintentar la limpieza.' }, { status: 403 })
  }
  const { fileId } = await params
  const file = await prisma.clientWorkFile.findUnique({ where: { id: fileId }, select: { id: true, previousObjectKey: true } })
  if (!file) return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 })
  if (!file.previousObjectKey) return NextResponse.json({ success: true, message: 'No hay archivos anteriores pendientes de limpieza.' })
  try {
    await deleteR2Object(file.previousObjectKey, getR2PrivateBucketName())
    await prisma.clientWorkFile.update({
      where: { id: file.id },
      data: { previousObjectKey: null, cleanupError: null },
    })
    await recordClientWorkActivity({ actorId: session.user.id, actorEmail: session.user.email, action: 'clientWorkFile.cleanup', entityType: 'ClientWorkFile', entityId: file.id, description: 'Limpieza del archivo anterior completada' })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Falló el reintento de limpieza R2:', file.previousObjectKey, error)
    await prisma.clientWorkFile.update({ where: { id: file.id }, data: { cleanupError: 'No se pudo eliminar el archivo anterior de R2.' } })
    await recordClientWorkActivity({ actorId: session.user.id, actorEmail: session.user.email, action: 'clientWorkFile.cleanup_failed', entityType: 'ClientWorkFile', entityId: file.id, description: 'Falló el reintento de limpieza del archivo anterior' })
    return NextResponse.json({ error: 'R2 todavía no confirmó la eliminación. Podés volver a intentarlo.' }, { status: 502 })
  }
}
