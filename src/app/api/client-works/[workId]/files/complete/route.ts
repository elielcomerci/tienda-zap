import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { copyR2Object, deleteR2Object, getR2ObjectMetadata } from '@/lib/r2'
import { MAX_CLIENT_FILE_SIZE_BYTES, validateClientFile, isClientWorkFilesEnabled } from '@/lib/client-work-files'
import { NextRequest, NextResponse } from 'next/server'
import { recordClientWorkActivity } from '@/lib/client-work-audit'

export async function POST(request: NextRequest, { params }: { params: Promise<{ workId: string }> }) {
  if (!isClientWorkFilesEnabled()) return NextResponse.json({ error: 'Trabajos y archivos todavía no está habilitado.' }, { status: 503 })
  const session = await auth()
  const actorId = session?.user?.id
  if (!actorId) return NextResponse.json({ error: 'Iniciá sesión para completar la subida.' }, { status: 401 })

  let uploadedKey: string | null = null
  let finalObjectKey: string | null = null
  const bucketName = process.env.R2_BUCKET_NAME
  if (!bucketName) return NextResponse.json({ error: 'Falta configurar el bucket R2.' }, { status: 503 })

  try {
    const { workId } = await params
    const body = await request.json()
    const work = await prisma.clientWork.findUnique({ where: { id: workId }, select: { id: true, userId: true } })
    if (!work) return NextResponse.json({ error: 'Trabajo no encontrado.' }, { status: 404 })
    const adminScope = session.user.role === 'ADMIN' && request.nextUrl.searchParams.get('scope') === 'admin'
    if (!adminScope && work.userId !== actorId) {
      return NextResponse.json({ error: 'No tenés acceso a este trabajo.' }, { status: 403 })
    }

    const sizeBytes = Number(body.sizeBytes)
    const validation = validateClientFile({
      fileName: String(body.fileName || ''),
      contentType: String(body.contentType || 'application/octet-stream'),
      sizeBytes,
    })
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

    const stagingKey = typeof body.objectKey === 'string' ? body.objectKey : ''
    const expectedPrefix = `client-file-uploads/${work.userId}/${work.id}/`
    if (!stagingKey.startsWith(expectedPrefix) || stagingKey.includes('..') || stagingKey.includes('\\')) {
      return NextResponse.json({ error: 'La referencia del archivo no es válida.' }, { status: 400 })
    }
    uploadedKey = stagingKey

    const replaceFileId = typeof body.replaceFileId === 'string' ? body.replaceFileId : null
    const existing = replaceFileId
      ? await prisma.clientWorkFile.findFirst({
          where: { id: replaceFileId, workId },
          select: { id: true, objectKey: true, previousObjectKey: true },
        })
      : null
    if (replaceFileId && !existing) return NextResponse.json({ error: 'El archivo que querés reemplazar ya no existe.' }, { status: 404 })
    if (existing?.previousObjectKey) return NextResponse.json({ error: 'Primero hay que resolver la limpieza del archivo anterior.' }, { status: 409 })

    const metadata = await getR2ObjectMetadata(stagingKey, bucketName)
    if (!metadata.ContentLength || metadata.ContentLength !== sizeBytes || metadata.ContentLength > MAX_CLIENT_FILE_SIZE_BYTES) {
      try { await deleteR2Object(stagingKey, bucketName) } catch (cleanupError) { console.error('No se pudo limpiar una subida inválida:', stagingKey, cleanupError) }
      return NextResponse.json({ error: 'El archivo subido no coincide con el tamaño declarado.' }, { status: 400 })
    }
    if (metadata.ContentType && metadata.ContentType.split(';')[0].trim().toLowerCase() !== validation.contentType) {
      try { await deleteR2Object(stagingKey, bucketName) } catch (cleanupError) { console.error('No se pudo limpiar una subida inválida:', stagingKey, cleanupError) }
      return NextResponse.json({ error: 'El tipo de archivo subido no coincide con el declarado.' }, { status: 400 })
    }

    finalObjectKey = `client-files/${work.userId}/${work.id}/${crypto.randomUUID()}-${validation.fileName}`
    await copyR2Object(stagingKey, finalObjectKey, bucketName)
    const finalMetadata = await getR2ObjectMetadata(finalObjectKey, bucketName)
    if (finalMetadata.ContentLength !== sizeBytes || finalMetadata.ContentType?.split(';')[0].trim().toLowerCase() !== validation.contentType) {
      try { await deleteR2Object(finalObjectKey, bucketName) } catch (cleanupError) { console.error('No se pudo limpiar el objeto final inválido:', finalObjectKey, cleanupError) }
      try { await deleteR2Object(stagingKey, bucketName) } catch (cleanupError) { console.error('No se pudo limpiar la subida inválida:', stagingKey, cleanupError) }
      return NextResponse.json({ error: 'No pudimos verificar el archivo copiado al almacenamiento privado.' }, { status: 502 })
    }

    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) || null : null
    let file
    let oldObjectKey: string | null = null
    if (existing) {
      oldObjectKey = existing.objectKey
      file = await prisma.clientWorkFile.update({
        where: { id: existing.id },
        data: {
          fileName: validation.fileName, contentType: validation.contentType,
          sizeBytes: sizeBytes, objectKey: finalObjectKey,
          previousObjectKey: existing.objectKey, cleanupError: null, note, uploadedById: actorId,
        },
        select: { id: true, fileName: true, contentType: true, sizeBytes: true, note: true, createdAt: true, updatedAt: true, uploadedById: true },
      })
    } else {
      file = await prisma.clientWorkFile.create({
        data: {
          workId, uploadedById: actorId, fileName: validation.fileName,
          contentType: validation.contentType, sizeBytes: sizeBytes, objectKey: finalObjectKey, note,
        },
        select: { id: true, fileName: true, contentType: true, sizeBytes: true, note: true, createdAt: true, updatedAt: true, uploadedById: true },
      })
    }

    if (existing) {
      await prisma.clientWorkFileApproval.updateMany({
        where: { fileId: file.id, status: 'PENDING', fileUpdatedAt: { not: file.updatedAt } },
        data: { status: 'SUPERSEDED', activeKey: null, respondedAt: new Date() },
      })
    }

    await prisma.clientWork.update({ where: { id: workId }, data: { updatedAt: new Date() } })
    let cleanupWarning: string | null = null
    if (oldObjectKey) {
      try {
        await deleteR2Object(oldObjectKey, bucketName)
        await prisma.clientWorkFile.update({ where: { id: file.id }, data: { previousObjectKey: null, cleanupError: null } })
      } catch (cleanupError) {
        cleanupWarning = 'El archivo nuevo está guardado, pero quedó pendiente eliminar el anterior. ZAP puede reintentar la limpieza desde administración.'
        await prisma.clientWorkFile.update({ where: { id: file.id }, data: { cleanupError: 'No se pudo eliminar el archivo anterior de R2.' } })
        console.error('No se pudo limpiar el archivo reemplazado en R2:', oldObjectKey, cleanupError)
      }
    }
    try {
      await deleteR2Object(stagingKey, bucketName)
    } catch (cleanupError) {
      cleanupWarning = cleanupWarning || 'El archivo está guardado, pero la subida temporal quedó pendiente de limpieza automática.'
      console.error('No se pudo limpiar el objeto temporal de R2:', stagingKey, cleanupError)
    }
    await recordClientWorkActivity({ actorId, actorEmail: session.user.email, action: existing ? 'clientWorkFile.replace' : 'clientWorkFile.upload', entityType: 'ClientWorkFile', entityId: file.id, description: (existing ? 'Archivo reemplazado: ' : 'Archivo cargado: ') + validation.fileName, metadata: { workId, fileName: validation.fileName, contentType: validation.contentType, sizeBytes: sizeBytes } })
    return NextResponse.json({ file, cleanupWarning })
  } catch (error) {
    if (uploadedKey) {
      try { await deleteR2Object(uploadedKey, bucketName) }
      catch (cleanupError) { console.error('No se pudo limpiar una subida incompleta de R2:', uploadedKey, cleanupError) }
    }
    if (finalObjectKey) {
      try {
        const alreadyRegistered = await prisma.clientWorkFile.findUnique({ where: { objectKey: finalObjectKey }, select: { id: true } })
        if (!alreadyRegistered) await deleteR2Object(finalObjectKey, bucketName)
      } catch (cleanupError) {
        console.error('No se pudo reconciliar un objeto final incompleto de R2:', finalObjectKey, cleanupError)
      }
    }
    console.error('No se pudo confirmar la subida de archivo:', error)
    return NextResponse.json({ error: 'No pudimos confirmar el archivo. Actualizá la lista antes de volver a intentarlo.' }, { status: 500 })
  }
}
