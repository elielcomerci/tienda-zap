import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createFiscalInvoicePdf, getFiscalWorkerConfig, type InvoiceRecipient } from '@/lib/fiscal-invoices'

const VOUCHER_LETTER: Record<number, string> = { 1: 'A', 6: 'B', 11: 'C' }

function responseError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return responseError('Iniciá sesión para consultar la factura.', 401)
  const { orderId } = await params
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: session.user.id } })
  if (!order) return responseError('Pedido no encontrado.', 404)
  if (order.invoiceSource !== 'ARCA') return responseError('Este pedido no tiene una solicitud de emisión ARCA.', 409)
  if (!order.invoiceFiscalJobId) {
    return Response.json({
      status: order.invoiceStatus || 'PROCESSING',
      message: 'Todavía no tenemos el identificador del trabajo fiscal. Reenviar la misma solicitud es seguro y no duplica una emisión.',
      canResubmit: true,
    }, { status: 202 })
  }

  let config: ReturnType<typeof getFiscalWorkerConfig>
  try { config = getFiscalWorkerConfig() } catch (error) {
    return responseError(error instanceof Error ? error.message : 'La conexión fiscal no está configurada.', 503)
  }

  let workerResponse: Response
  try {
    workerResponse = await fetch(`${config.baseUrl}/v1/invoices/jobs/${encodeURIComponent(order.invoiceFiscalJobId)}`, {
      headers: { 'X-Api-Key': config.apiKey },
      cache: 'no-store',
    })
  } catch {
    return Response.json({ status: order.invoiceStatus || 'PROCESSING', message: 'No pudimos consultar el estado fiscal. Probá de nuevo en unos instantes.' }, { status: 202 })
  }

  const result = await workerResponse.json().catch(() => ({})) as any
  if (!workerResponse.ok) {
    return responseError(result?.error?.message || result?.error || 'No se pudo consultar el trabajo fiscal.', workerResponse.status)
  }

  const workerStatus = String(result.status || 'PROCESSING')
  if (workerStatus === 'FAILED' || workerStatus === 'DEAD') {
    await prisma.order.update({
      where: { id: order.id },
      data: { invoiceStatus: 'FAILED', invoiceError: String(result.lastError || 'La emisión fiscal falló.').slice(0, 1000) },
    })
    return Response.json({ status: 'FAILED', message: 'ARCA no autorizó la factura. No se emitirá otra automáticamente; la solicitud necesita revisión.' })
  }

  if (workerStatus !== 'DONE' || !result.voucher?.cae) {
    await prisma.order.update({ where: { id: order.id }, data: { invoiceStatus: 'PROCESSING' } })
    return Response.json({ status: 'PROCESSING', message: 'La emisión sigue en proceso. Podés volver a consultar el estado.' }, { status: 202 })
  }

  const voucher = result.voucher
  const issuedAt = new Date(voucher.issuedAt)
  const caeExpiresAt = new Date(voucher.caeFchVto)
  if (!Number.isFinite(issuedAt.getTime()) || !Number.isFinite(caeExpiresAt.getTime()) ||
      !Number.isInteger(Number(voucher.voucherType)) || !Number.isInteger(Number(voucher.voucherNumber)) ||
      !Number.isInteger(Number(voucher.pointOfSale))) {
    return responseError('ARCA informó datos incompletos del comprobante. No se volverá a emitir; requiere revisión.', 502)
  }

  const voucherType = Number(voucher.voucherType)
  await prisma.order.update({
    where: { id: order.id },
    data: {
      invoiceStatus: 'ISSUED',
      invoiceVoucherType: VOUCHER_LETTER[voucherType] || String(voucherType),
      invoicePointOfSale: Number(voucher.pointOfSale),
      invoiceVoucherNumber: Number(voucher.voucherNumber),
      invoiceCae: String(voucher.cae),
      invoiceCaeExpiresAt: caeExpiresAt,
      invoiceIssuedAt: issuedAt,
      invoicePdfStatus: order.invoiceObjectKey ? 'READY' : 'PENDING',
      invoiceError: null,
    },
  })

  if (order.invoiceObjectKey) {
    return Response.json({ status: 'ISSUED', pdfStatus: 'READY', cae: order.invoiceCae, message: 'La factura ya está disponible.' })
  }

  try {
    const recipient = order.invoiceRecipientSnapshot as unknown as InvoiceRecipient
    const items = order.invoiceLineItemsSnapshot as unknown as Array<Record<string, any>>
    const amounts = order.invoiceAmountsSnapshot as unknown as Record<string, number>
    if (!recipient || !Array.isArray(items) || !amounts || !result.voucher.emitter) {
      throw new Error('Falta un snapshot fiscal necesario para reconstruir el PDF.')
    }

    const pdf = await createFiscalInvoicePdf({
      orderId: order.id,
      recipient,
      items,
      amounts,
      voucher: {
        voucherType,
        voucherNumber: Number(voucher.voucherNumber),
        pointOfSale: Number(voucher.pointOfSale),
        cae: String(voucher.cae),
        caeFchVto: voucher.caeFchVto,
        issuedAt: voucher.issuedAt,
      },
      issuer: { ...result.voucher.emitter, ingresosBrutos: order.invoiceEmitterIibb },
    })

    await prisma.order.update({
      where: { id: order.id },
      data: {
        invoiceObjectKey: pdf.objectKey,
        invoiceFileName: pdf.fileName,
        invoicePdfGeneratedAt: new Date(),
        invoicePdfStatus: 'READY',
        invoiceError: null,
      },
    })
    return Response.json({ status: 'ISSUED', pdfStatus: 'READY', cae: String(voucher.cae), message: 'Factura emitida y PDF disponible.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar el PDF.'
    await prisma.order.update({
      where: { id: order.id },
      data: { invoiceStatus: 'ISSUED', invoicePdfStatus: 'FAILED', invoiceError: `CAE ${voucher.cae} confirmado; PDF pendiente: ${message}`.slice(0, 1000) },
    })
    return Response.json({ status: 'ISSUED', pdfStatus: 'FAILED', cae: String(voucher.cae), message: 'La factura fue emitida por ARCA, pero el PDF no quedó disponible. Podés reintentar preparar el PDF sin volver a emitir la factura.' }, { status: 200 })
  }
}
