import { auth } from '@/auth'
import { R2_UPLOAD_URL_TTL_SECONDS, sanitizeFileName } from '@/lib/order-files'
import { buildR2PublicMediaUrl, createPresignedR2UploadUrl } from '@/lib/r2'

const MAX_PRODUCT_MEDIA_FILE_SIZE_BYTES = 200 * 1024 * 1024

const ALLOWED_PRODUCT_MEDIA_TYPES: Record<string, { extension: string; mediaType: 'AUDIO' | 'VIDEO' }> = {
  'audio/mpeg': { extension: 'mp3', mediaType: 'AUDIO' },
  'audio/mp3': { extension: 'mp3', mediaType: 'AUDIO' },
  'audio/wav': { extension: 'wav', mediaType: 'AUDIO' },
  'audio/x-wav': { extension: 'wav', mediaType: 'AUDIO' },
  'video/mp4': { extension: 'mp4', mediaType: 'VIDEO' },
}

function getFileExtension(fileName: string) {
  const safeName = sanitizeFileName(fileName)
  return safeName.includes('.') ? safeName.split('.').pop()!.toLowerCase() : ''
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return Response.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const fileName = String(body.fileName || body.filename || '')
    const safeFileName = sanitizeFileName(fileName)
    const contentType = String(body.contentType || '').split(';')[0].trim().toLowerCase()
    const sizeBytes = Number(body.sizeBytes)
    const allowed = ALLOWED_PRODUCT_MEDIA_TYPES[contentType]
    const extension = getFileExtension(safeFileName)

    if (!safeFileName || !allowed) {
      return Response.json({ error: 'Formato no permitido. Usa MP3, WAV o MP4.' }, { status: 400 })
    }

    if (extension !== allowed.extension) {
      return Response.json(
        { error: 'El tipo de archivo no coincide con la extension.' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return Response.json({ error: 'El archivo es invalido.' }, { status: 400 })
    }

    if (sizeBytes > MAX_PRODUCT_MEDIA_FILE_SIZE_BYTES) {
      return Response.json(
        { error: 'El archivo supera el tamano maximo permitido.' },
        { status: 400 }
      )
    }

    const objectKey = `product-media/${new Date().getFullYear()}/${crypto.randomUUID()}-${safeFileName}`
    const signedUrl = await createPresignedR2UploadUrl({ objectKey, contentType })

    return Response.json({
      signedUrl,
      publicUrl: buildR2PublicMediaUrl(objectKey),
      objectKey,
      contentType,
      mediaType: allowed.mediaType,
      expiresIn: R2_UPLOAD_URL_TTL_SECONDS,
      maxSizeBytes: MAX_PRODUCT_MEDIA_FILE_SIZE_BYTES,
    })
  } catch (error) {
    console.error('Error generating product media upload URL:', error)
    return Response.json({ error: 'No pudimos preparar la subida del archivo.' }, { status: 500 })
  }
}
