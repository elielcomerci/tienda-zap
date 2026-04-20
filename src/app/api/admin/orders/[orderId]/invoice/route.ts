import { put } from '@vercel/blob'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { sanitizeFileName } from '@/lib/order-files'
import { prisma } from '@/lib/prisma'

const MAX_INVOICE_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_INVOICE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return Response.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { orderId } = await params
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return Response.json({ error: 'Selecciona una factura.' }, { status: 400 })
    }

    if (file.size <= 0 || file.size > MAX_INVOICE_FILE_SIZE_BYTES) {
      return Response.json(
        { error: 'La factura supera el maximo de 10MB.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_INVOICE_TYPES.has(file.type)) {
      return Response.json(
        { error: 'Solo aceptamos PDF, JPG, PNG o WEBP.' },
        { status: 400 }
      )
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    })

    if (!order) {
      return Response.json({ error: 'Orden no encontrada.' }, { status: 404 })
    }

    const safeFileName = sanitizeFileName(file.name)
    const blob = await put(`facturas/${orderId}-${Date.now()}-${safeFileName}`, file, {
      access: 'public',
    })

    await prisma.order.update({
      where: { id: orderId },
      data: {
        invoiceUrl: blob.url,
        invoiceFileName: safeFileName,
        invoiceUploadedAt: new Date(),
      },
    })

    return Response.json({ url: blob.url, fileName: safeFileName })
  } catch (error) {
    console.error('Invoice upload error:', error)
    return Response.json({ error: 'Error al guardar la factura.' }, { status: 500 })
  }
}
