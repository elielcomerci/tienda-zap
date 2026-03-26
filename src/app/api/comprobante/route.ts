import { put } from '@vercel/blob'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File
    const orderId = form.get('orderId') as string

    if (!file || !orderId) {
      return Response.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const blob = await put(`comprobantes/${orderId}-${Date.now()}-${file.name}`, file, {
      access: 'public',
    })

    await prisma.order.update({
      where: { id: orderId },
      data: { receiptUrl: blob.url },
    })

    return Response.json({ url: blob.url })
  } catch (error) {
    console.error('Comprobante upload error:', error)
    return Response.json({ error: 'Error al subir el comprobante' }, { status: 500 })
  }
}
