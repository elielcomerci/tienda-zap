import { NextRequest, NextResponse } from 'next/server'
import { findAccessibleOrderItem } from '@/lib/order-access'
import { createPresignedR2DownloadUrl } from '@/lib/r2'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const { orderId, itemId } = await params
    const accessToken = req.nextUrl.searchParams.get('token') || undefined

    const item = await findAccessibleOrderItem(orderId, itemId, accessToken, {
      select: {
        id: true,
        fileObjectKey: true,
        fileOriginalName: true,
        fileUrl: true,
      },
    })

    if (!item) {
      return Response.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (item.fileObjectKey) {
      const signedUrl = await createPresignedR2DownloadUrl({
        objectKey: item.fileObjectKey,
        fileName: item.fileOriginalName,
      })
      return NextResponse.redirect(signedUrl)
    }

    if (item.fileUrl) {
      return NextResponse.redirect(item.fileUrl)
    }

    return Response.json({ error: 'Archivo no encontrado' }, { status: 404 })
  } catch (error) {
    console.error('Error generating download URL:', error)
    return Response.json({ error: 'No pudimos descargar el archivo.' }, { status: 500 })
  }
}
