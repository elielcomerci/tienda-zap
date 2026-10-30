import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createPresignedR2DownloadUrl, createPresignedR2InlineUrl, getR2BucketName } from '@/lib/r2'
import { isSafeInlineClientFile, isClientWorkFilesEnabled } from '@/lib/client-work-files'
import { NextRequest, NextResponse } from 'next/server'
import { recordClientWorkActivity } from '@/lib/client-work-audit'

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  if (!isClientWorkFilesEnabled()) return NextResponse.json({ error: 'Trabajos y archivos todavía no está habilitado.' }, { status: 503 })
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Iniciá sesión para acceder al archivo.' }, { status: 401 })
  try {
    const { fileId } = await params
    const file = await prisma.clientWorkFile.findUnique({
      where: { id: fileId },
      include: { work: { select: { userId: true } } },
    })
    if (!file) return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 })
    const adminScope = session.user.role === 'ADMIN' && request.nextUrl.searchParams.get('scope') === 'admin'
    if (!adminScope && file.work.userId !== userId) {
      return NextResponse.json({ error: 'No tenés acceso a este archivo.' }, { status: 403 })
    }
    const inline = request.nextUrl.searchParams.get('inline') === '1' && isSafeInlineClientFile(file)
    const url = inline
      ? await createPresignedR2InlineUrl({ objectKey: file.objectKey, contentType: file.contentType, bucketName: file.bucketName || getR2BucketName() })
      : await createPresignedR2DownloadUrl({ objectKey: file.objectKey, fileName: file.fileName, bucketName: getR2PrivateBucketName() })
    await recordClientWorkActivity({ actorId: userId, actorEmail: session.user.email, action: inline ? 'clientWorkFile.preview' : 'clientWorkFile.download', entityType: 'ClientWorkFile', entityId: file.id, description: (inline ? 'Vista previa abierta: ' : 'Archivo descargado: ') + file.fileName, metadata: { fileName: file.fileName, contentType: file.contentType, sizeBytes: file.sizeBytes } })
    return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('No se pudo generar el acceso al archivo:', error)
    return NextResponse.json({ error: 'No pudimos abrir el archivo.' }, { status: 500 })
  }
}
