import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { buildInvoiceDetails, deriveVoucherType, getFiscalWorkerConfig, type InvoiceRecipient } from '@/lib/fiscal-invoices'
import { getR2SensitiveBucketName } from '@/lib/r2'

const ELIGIBLE_STATUSES = new Set(['PAID', 'PROOF_SENT', 'IN_PRODUCTION', 'PROCESSING', 'READY', 'DELIVERED'])
const VAT_CONDITIONS = new Set([1, 4, 5, 6, 13, 15, 16])

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

function normalizeRecipient(input: any): InvoiceRecipient {
  const name = String(input?.name || '').trim()
  const docType = Number(input?.docType)
  const rawDocNumber = String(input?.docNumber || '').replace(/\D/g, '')
  const docNumber = docType === 99 ? '0' : rawDocNumber
  const vatCondition = Number(input?.vatCondition)
  if (!name || name.length > 200) throw new Error('Ingresá el nombre o razón social del receptor.')
  if (![80, 96, 99].includes(docType)) throw new Error('Seleccioná un tipo de documento válido.')
  if (docType === 80 && !/^\d{11}$/.test(docNumber)) throw new Error('El CUIT debe tener 11 dígitos.')
  if (docType === 96 && !/^\d{7,8}$/.test(docNumber)) throw new Error('El DNI debe tener entre 7 y 8 dígitos.')
  if (docType === 99 && !VAT_CONDITIONS.has(vatCondition)) throw new Error('Seleccioná una condición frente al IVA.')
  if (!VAT_CONDITIONS.has(vatCondition)) throw new Error('Seleccioná una condición frente al IVA.')
  if (docType !== 80 && vatCondition !== 5) throw new Error('Para DNI o consumidor final, la condición frente al IVA debe ser Consumidor final.')
  return {
    name, docType, docNumber, vatCondition,
    address: String(input?.address || '').trim().slice(0, 250),
    city: String(input?.city || '').trim().slice(0, 100),
    province: String(input?.province || '').trim().slice(0, 100),
  }
}

function sameRecipient(a: any, b: InvoiceRecipient) {
  return Boolean(a) &&
    a.name === b.name && Number(a.docType) === b.docType && String(a.docNumber) === b.docNumber &&
    Number(a.vatCondition) === b.vatCondition && String(a.address || '') === b.address &&
    String(a.city || '') === b.city && String(a.province || '') === b.province
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return jsonError('Iniciá sesión para generar una factura.', 401)
  const { orderId } = await params

  let input: any
  try { input = await request.json() } catch { return jsonError('La solicitud no es válida.', 400) }

  let recipient: InvoiceRecipient
  try { recipient = normalizeRecipient(input?.recipient) } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Los datos fiscales no son válidos.', 422)
  }

  let config: ReturnType<typeof getFiscalWorkerConfig>
  let voucherType: string
  try {
    getR2SensitiveBucketName()
    config = getFiscalWorkerConfig()
    voucherType = deriveVoucherType(config.issuerVatCondition, recipient.vatCondition)
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'La emisión fiscal no está configurada.', 503)
  }

  let order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: { items: { include: { product: { select: { name: true } } } } },
  })
  if (!order) return jsonError('Pedido no encontrado.', 404)
  if (!ELIGIBLE_STATUSES.has(order.status)) return jsonError('La factura solo se puede solicitar para un pedido confirmado. Si el pago está pendiente, completalo primero.', 409)
  if (order.invoiceSource === 'MANUAL' || (order.invoiceUrl && order.invoiceSource !== 'ARCA')) {
    return jsonError('Este pedido ya tiene un comprobante adjunto manualmente. Contactanos si necesitás revisar su facturación.', 409)
  }
  if (order.invoiceCae) {
    return Response.json({ status: order.invoiceStatus || 'ISSUED', pdfStatus: order.invoicePdfStatus, message: 'La factura ya fue emitida; no se volverá a emitir.' })
  }
  if (order.invoiceStatus === 'FAILED') {
    return jsonError('La solicitud fiscal anterior falló. Para evitar duplicados, la emisión necesita revisión antes de volver a intentarse.', 409)
  }

  let lineItems: any[]
  let amounts: Record<string, number>
  let savedRecipient = order.invoiceRecipientSnapshot as any
  let savedVoucherType = order.invoiceVoucherType

  if (order.invoiceStatus === 'PROCESSING') {
    if (!order.invoiceEmitterCuit || !order.invoiceEmitterIibb || !order.invoiceEmitterPointOfSale || !order.invoiceEmitterEnvironment) {
      return jsonError('La solicitud fiscal no conserva la configuración del emisor y necesita revisión.', 409)
    }
    config = { ...config, cuit: order.invoiceEmitterCuit, issuerIibb: order.invoiceEmitterIibb, pointOfSale: order.invoiceEmitterPointOfSale, environment: order.invoiceEmitterEnvironment as 'TEST' | 'PROD' }
    if (!sameRecipient(savedRecipient, recipient) || !Array.isArray(order.invoiceLineItemsSnapshot) || !order.invoiceAmountsSnapshot || !savedVoucherType) {
      return jsonError('Ya hay una solicitud de factura en curso con otros datos. No cambies esos datos ni inicies otra emisión; consultá su estado.', 409)
    }
    lineItems = order.invoiceLineItemsSnapshot as any[]
    amounts = order.invoiceAmountsSnapshot as Record<string, number>
    voucherType = savedVoucherType
  } else {
    try {
      const detail = buildInvoiceDetails(order)
      lineItems = detail.items
      amounts = detail.amounts
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : 'No se pudo validar el detalle fiscal del pedido.', 422)
    }

    const externalId = `tienda-order-${order.id}`
    const idempotencyKey = `tienda-order-${order.id}-invoice-v1`
    const claimed = await prisma.order.updateMany({
      where: { id: order.id, userId: session.user.id, invoiceStatus: null, invoiceSource: null, invoiceUrl: null },
      data: {
        invoiceSource: 'ARCA',
        invoiceStatus: 'PROCESSING',
        invoicePdfStatus: 'PENDING',
        invoiceExternalId: externalId,
        invoiceIdempotencyKey: idempotencyKey,
        invoiceRecipientSnapshot: recipient as any,
        invoiceLineItemsSnapshot: lineItems as any,
        invoiceAmountsSnapshot: amounts as any,
        invoiceVoucherType: voucherType,
        invoiceEmitterCuit: config.cuit,
        invoiceEmitterIibb: config.issuerIibb,
        invoiceEmitterPointOfSale: config.pointOfSale,
        invoiceEmitterEnvironment: config.environment,
        invoiceRequestedAt: new Date(),
        invoiceError: null,
      },
    })
    if (claimed.count !== 1) {
      order = await prisma.order.findFirst({
        where: { id: orderId, userId: session.user.id },
        include: { items: { include: { product: { select: { name: true } } } } },
      })
      if (!order || order.invoiceStatus !== 'PROCESSING' || !sameRecipient(order.invoiceRecipientSnapshot, recipient)) {
        return jsonError('El pedido cambió mientras se preparaba la factura. Actualizá la página y revisá su estado.', 409)
      }
      if (!Array.isArray(order.invoiceLineItemsSnapshot) || !order.invoiceAmountsSnapshot || !order.invoiceVoucherType) {
        return jsonError('La solicitud fiscal quedó incompleta y requiere revisión.', 409)
      }
      lineItems = order.invoiceLineItemsSnapshot as any[]
      amounts = order.invoiceAmountsSnapshot as Record<string, number>
      voucherType = order.invoiceVoucherType
      savedRecipient = order.invoiceRecipientSnapshot
    }
  }

  const externalId = order.invoiceExternalId || `tienda-order-${order.id}`
  const idempotencyKey = order.invoiceIdempotencyKey || `tienda-order-${order.id}-invoice-v1`
  const concept = order.items.every(item => item.isService) ? 2 : order.items.some(item => item.isService) ? 3 : 1
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replace(/-/g, '')

  let workerResponse: Response
  try {
    workerResponse = await fetch(`${config.baseUrl}/v1/invoices/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': config.apiKey },
      body: JSON.stringify({
        externalId,
        idempotencyKey,
        contributor: { cuit: config.cuit, pointOfSale: config.pointOfSale, environment: config.environment },
        voucher: { type: voucherType, concept, date: localDate },
        amounts,
        items: lineItems,
        customer: { docType: recipient.docType, docNumber: recipient.docNumber, name: recipient.name, vatCondition: recipient.vatCondition },
      }),
      cache: 'no-store',
    })
  } catch {
    return Response.json({ status: 'PROCESSING', jobId: order.invoiceFiscalJobId, message: 'No pudimos confirmar la respuesta fiscal. Podés reintentar de forma segura: se reutiliza la misma clave de idempotencia.' }, { status: 202 })
  }

  const result = await workerResponse.json().catch(() => ({})) as any
  if (!workerResponse.ok) {
    const message = result?.error?.message || result?.error || 'El servicio fiscal rechazó la solicitud.'
    if (workerResponse.status !== 429 && workerResponse.status < 500) {
      await prisma.order.update({ where: { id: order.id }, data: { invoiceStatus: 'FAILED', invoiceError: String(message).slice(0, 1000) } })
      return jsonError(String(message), workerResponse.status)
    }
    return Response.json({ status: 'PROCESSING', jobId: order.invoiceFiscalJobId, message: 'El servicio fiscal no respondió de forma concluyente. La solicitud queda protegida por idempotencia.' }, { status: 202 })
  }

  const workerStatus = String(result.status || 'PROCESSING')
  await prisma.order.update({
    where: { id: order.id },
    data: {
      invoiceFiscalJobId: result.jobId || order.invoiceFiscalJobId,
      invoiceStatus: workerStatus === 'FAILED' || workerStatus === 'DEAD' ? 'FAILED' : workerStatus === 'DONE' ? 'ISSUED' : 'PROCESSING',
      invoiceError: workerStatus === 'FAILED' || workerStatus === 'DEAD' ? String(result.lastError || 'La emisión fiscal falló.').slice(0, 1000) : null,
    },
  })

  return Response.json({
    status: workerStatus === 'DONE' ? 'ISSUED' : workerStatus === 'FAILED' || workerStatus === 'DEAD' ? 'FAILED' : 'PROCESSING',
    jobId: result.jobId || order.invoiceFiscalJobId,
    voucherType,
    message: workerStatus === 'DONE' ? 'ARCA confirmó la emisión. Actualizá el estado para preparar el PDF.' : 'La solicitud fue registrada. La factura no se volverá a emitir por un reintento.',
  }, { status: workerResponse.status === 202 ? 202 : 200 })
}
