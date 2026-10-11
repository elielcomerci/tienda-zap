import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createPresignedR2DownloadUrl, getR2SensitiveBucketName } from '@/lib/r2'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { orderId } = await params
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: { invoiceObjectKey: true, invoiceFileName: true, invoiceUrl: true, invoiceCae: true },
  })
  if (!order) return Response.json({ error: 'Pedido no encontrado' }, { status: 404 })

  if (order.invoiceObjectKey && order.invoiceCae) {
    try {
      const url = await createPresignedR2DownloadUrl({
        objectKey: order.invoiceObjectKey,
        fileName: order.invoiceFileName || 'factura.pdf',
        bucketName: getR2SensitiveBucketName(),
      })
      return Response.redirect(url, 302)
    } catch (error) {
      console.error('Fiscal invoice download signing failed:', error)
      return Response.json({ error: 'No se pudo preparar la descarga de la factura.' }, { status: 503 })
    }
  }

  // Compatibilidad con comprobantes manuales ya adjuntos en versiones anteriores.
  if (order.invoiceUrl) return Response.redirect(order.invoiceUrl, 302)
  return Response.json({ error: 'La factura todavía no está disponible.' }, { status: 404 })
}
