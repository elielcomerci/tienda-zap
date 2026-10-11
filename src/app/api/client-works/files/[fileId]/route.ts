import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { deleteR2Object, getR2PrivateBucketName } from '@/lib/r2'
import { isClientWorkFilesEnabled } from '@/lib/client-work-files'
import { NextResponse } from 'next/server'
import { recordClientWorkActivity } from '@/lib/client-work-audit'

export async function DELETE(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  if (!isClientWorkFilesEnabled()) return NextResponse.json({ error: 'Trabajos y archivos todavía no está habilitado.' }, { status: 503 })
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Iniciá sesión para borrar archivos.' }, { status: 401 })
  try {
    const { fileId } = await params
    const file = await prisma.clientWorkFile.findUnique({
      where: { id: fileId },
      include: { work: { select: { id: true, userId: true } } },
    })
    if (!file) return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 })
    if (session.user.role !== 'ADMIN' && file.work.userId !== userId) {
      return NextResponse.json({ error: 'No tenés acceso a este archivo.' }, { status: 403 })
    }
    // Keep the database row if R2 deletion fails, so the failure remains visible and retryable.
    if (file.previousObjectKey) await deleteR2Object(file.previousObjectKey, getR2PrivateBucketName())
    await deleteR2Object(file.objectKey, getR2PrivateBucketName())
    await prisma.clientWorkFile.delete({ where: { id: file.id } })
    await prisma.clientWork.update({ where: { id: file.work.id }, data: { updatedAt: new Date() } })
    await recordClientWorkActivity({ actorId: userId, actorEmail: session.user.email, action: 'clientWorkFile.delete', entityType: 'ClientWorkFile', entityId: file.id, description: 'Archivo eliminado: ' + file.fileName, metadata: { workId: file.work.id, fileName: file.fileName, sizeBytes: file.sizeBytes } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('No se pudo eliminar el archivo de trabajo:', error)
    return NextResponse.json({ error: 'No pudimos borrar el archivo del almacenamiento. No se quitó de la lista.' }, { status: 500 })
  }
}
