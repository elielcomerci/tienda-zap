import { NextRequest } from 'next/server'
import {
  MAX_BRIEF_REFERENCE_FILE_SIZE_BYTES,
  buildBriefReferenceObjectKey,
  validateBriefReferenceUpload,
} from '@/lib/brief-files'
import { findAccessibleOrderItem } from '@/lib/order-access'
import { R2_UPLOAD_URL_TTL_SECONDS } from '@/lib/order-files'
import { buildR2PublicMediaUrl, createPresignedR2UploadUrl } from '@/lib/r2'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const { orderId, itemId } = await params
    const body = await req.json()
    const validation = validateBriefReferenceUpload({
      fileName: body.fileName || body.filename,
      contentType: body.contentType,
      sizeBytes: Number(body.sizeBytes),
    })

    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 400 })
    }

    const item = await findAccessibleOrderItem(orderId, itemId, body.accessToken, {
      select: {
        id: true,
        briefType: true,
      },
    })

    if (!item) {
      return Response.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!item.briefType || item.briefType === 'NONE') {
      return Response.json(
        { error: 'Este item no tiene brief configurado.' },
        { status: 400 }
      )
    }

    const objectKey = buildBriefReferenceObjectKey(orderId, itemId, validation.safeFileName)
    const signedUrl = await createPresignedR2UploadUrl({
      objectKey,
      contentType: validation.contentType,
    })

    return Response.json({
      signedUrl,
      publicUrl: buildR2PublicMediaUrl(objectKey),
      objectKey,
      contentType: validation.contentType,
      expiresIn: R2_UPLOAD_URL_TTL_SECONDS,
      maxSizeBytes: MAX_BRIEF_REFERENCE_FILE_SIZE_BYTES,
    })
  } catch (error) {
    console.error('Error generating brief reference upload URL:', error)
    return Response.json({ error: 'No pudimos preparar la subida de la referencia.' }, { status: 500 })
  }
}
