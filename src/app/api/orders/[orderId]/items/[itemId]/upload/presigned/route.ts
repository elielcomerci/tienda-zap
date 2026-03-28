import { NextRequest } from 'next/server'
import { findAccessibleOrderItem } from '@/lib/order-access'
import {
  buildArtworkObjectKey,
  MAX_ARTWORK_FILE_SIZE_BYTES,
  R2_UPLOAD_URL_TTL_SECONDS,
  isArtworkUploadAllowedStatus,
  validateArtworkUpload,
} from '@/lib/order-files'
import { createPresignedR2UploadUrl } from '@/lib/r2'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const { orderId, itemId } = await params
    const body = await req.json()
    const validation = validateArtworkUpload({
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
        isService: true,
        designRequested: true,
        order: {
          select: {
            status: true,
          },
        },
      },
    })

    if (!item) {
      return Response.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (item.designRequested) {
      return Response.json(
        { error: 'Este item esta marcado como diseno solicitado.' },
        { status: 400 }
      )
    }

    if (item.isService) {
      return Response.json(
        { error: 'Este item corresponde a un servicio y no requiere archivo.' },
        { status: 400 }
      )
    }

    if (!isArtworkUploadAllowedStatus(item.order.status)) {
      return Response.json(
        { error: 'La orden ya no permite cargar archivos.' },
        { status: 400 }
      )
    }

    const objectKey = buildArtworkObjectKey(orderId, itemId, validation.safeFileName)
    const signedUrl = await createPresignedR2UploadUrl({
      objectKey,
      contentType: validation.contentType,
    })

    return Response.json({
      signedUrl,
      objectKey,
      contentType: validation.contentType,
      expiresIn: R2_UPLOAD_URL_TTL_SECONDS,
      maxSizeBytes: MAX_ARTWORK_FILE_SIZE_BYTES,
    })
  } catch (error) {
    console.error('Error generating order upload URL:', error)
    return Response.json({ error: 'No pudimos preparar la subida del archivo.' }, { status: 500 })
  }
}
