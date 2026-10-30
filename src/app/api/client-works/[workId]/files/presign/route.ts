import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createPresignedR2UploadUrl, getR2BucketName, getR2PrivateBucketName } from '@/lib/r2'
import { MAX_CLIENT_FILE_SIZE_BYTES, validateClientFile, isClientWorkFilesEnabled } from '@/lib/client-work-files'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ workId: string }> }) {
  if (!isClientWorkFilesEnabled()) return NextResponse.json({ error: 'Trabajos y archivos todavía no está habilitado.' }, { status: 503 })
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Iniciá sesión para subir archivos.' }, { status: 401 })

  try {
    const { workId } = await params
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 })
    const validation = validateClientFile({
      fileName: String(body.fileName || ''),
      contentType: String(body.contentType || 'application/octet-stream'),
      sizeBytes: Number(body.sizeBytes),
    })
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

    const work = await prisma.clientWork.findUnique({ where: { id: workId }, select: { id: true, userId: true } })
    if (!work) return NextResponse.json({ error: 'Trabajo no encontrado.' }, { status: 404 })
    const adminScope = session.user.role === 'ADMIN' && request.nextUrl.searchParams.get('scope') === 'admin'
    if (!adminScope && work.userId !== userId) {
      return NextResponse.json({ error: 'No tenés acceso a este trabajo.' }, { status: 403 })
    }

    const replaceFileId = typeof body.replaceFileId === 'string' ? body.replaceFileId : null
    let bucketName = getR2PrivateBucketName()
    if (replaceFileId) {
      const existing = await prisma.clientWorkFile.findFirst({ where: { id: replaceFileId, workId }, select: { id: true, previousObjectKey: true, bucketName: true } })
      if (!existing) return NextResponse.json({ error: 'El archivo que querés reemplazar no pertenece a este trabajo.' }, { status: 404 })
      bucketName = existing.bucketName || getR2BucketName()
      if (existing.previousObjectKey) return NextResponse.json({ error: 'Primero hay que resolver la limpieza del archivo anterior.' }, { status: 409 })
    }

    const objectKey = `client-file-uploads/${work.userId}/${work.id}/${crypto.randomUUID()}-${validation.fileName}`
    const signedUrl = await createPresignedR2UploadUrl({ objectKey, contentType: validation.contentType, contentLength: Number(body.sizeBytes), bucketName })
    return NextResponse.json({
      signedUrl, objectKey, fileName: validation.fileName,
      contentType: validation.contentType, sizeBytes: validation.ok ? body.sizeBytes : 0,
      maxSizeBytes: MAX_CLIENT_FILE_SIZE_BYTES, replaceFileId,
    })
  } catch (error) {
    console.error('No se pudo preparar la subida de archivo:', error)
    return NextResponse.json({ error: 'No pudimos preparar la subida del archivo.' }, { status: 500 })
  }
}
