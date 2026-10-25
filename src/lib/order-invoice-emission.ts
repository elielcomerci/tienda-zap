import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { decryptFiscalCredential } from '@/lib/fiscal-credentials'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'
import { getFiscalWorkerBaseUrl } from '@/lib/fiscal-worker-config'

export class OrderInvoiceEmissionError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

type WorkerVoucher = {
  id?: string
  voucherType?: number
  voucherNumber?: number
  cae?: string
  caeFchVto?: string
  issuedAt?: string
}

type WorkerResult = {
  jobId: string
  status?: string
  externalId?: string
  environment?: string
  lastError?: string | null
  voucher?: WorkerVoucher
}

type InvoiceSummary = {
  id: string
  jobId: string | null
  result: string | null
  voucherNumber: number | null
  cae: string | null
  caeExpiresAt: Date | null
}

const supportedVatRates = new Set([0, 2.5, 5, 10.5, 21, 27])
const terminalWorkerStatuses = new Set(['DONE', 'FAILED', 'DEAD'])
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const voucherCodes: Record<string, number> = { A: 1, B: 6, C: 11 }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseWorkerResult(value: unknown): WorkerResult | null {
  if (!isRecord(value) || typeof value.jobId !== 'string' || !value.jobId) return null
  const rawVoucher = isRecord(value.voucher) ? value.voucher : null
  const lastError = value.lastError
  const parsedLastError: string | null | undefined = typeof lastError === 'string' ? lastError : lastError === null ? null : undefined
  const voucher: WorkerVoucher | undefined = rawVoucher ? {
    ...(typeof rawVoucher.id === 'string' ? { id: rawVoucher.id } : {}),
    ...(typeof rawVoucher.voucherType === 'number' ? { voucherType: rawVoucher.voucherType } : {}),
    ...(typeof rawVoucher.voucherNumber === 'number' ? { voucherNumber: rawVoucher.voucherNumber } : {}),
    ...(typeof rawVoucher.cae === 'string' ? { cae: rawVoucher.cae } : {}),
    ...(typeof rawVoucher.caeFchVto === 'string' ? { caeFchVto: rawVoucher.caeFchVto } : {}),
    ...(typeof rawVoucher.issuedAt === 'string' ? { issuedAt: rawVoucher.issuedAt } : {}),
  } : undefined

  return {
    jobId: value.jobId,
    ...(typeof value.status === 'string' ? { status: value.status } : {}),
    ...(typeof value.externalId === 'string' ? { externalId: value.externalId } : {}),
    ...(typeof value.environment === 'string' ? { environment: value.environment } : {}),
    ...(parsedLastError !== undefined ? { lastError: parsedLastError } : {}),
    ...(voucher ? { voucher } : {}),
  }
}

function workerErrorMessage(value: unknown) {
  if (!isRecord(value) || !isRecord(value.error) || typeof value.error.message !== 'string') return null
  return value.error.message.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 300)
}

function safeWorkerStatus(result: WorkerResult) {
  return {
    jobId: result.jobId,
    status: result.status ?? 'PENDING',
    ...(result.voucher ? { voucher: result.voucher } : {}),
  }
}

function summarizeInvoice(invoice: InvoiceSummary) {
  return {
    id: invoice.id,
    jobId: invoice.jobId,
    result: invoice.result,
    voucherNumber: invoice.voucherNumber,
    cae: invoice.cae,
    caeExpiresAt: invoice.caeExpiresAt,
  }
}

function getWorkerBaseUrl() {
  const baseUrl = getFiscalWorkerBaseUrl()
  try {
    const parsed = new URL(baseUrl)
    if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      throw new Error('HTTPS is required in production')
    }
    return parsed
  } catch {
    throw new OrderInvoiceEmissionError('La URL base del Fiscal Worker no es válida.', 503)
  }
}

async function callWorker(baseUrl: URL, apiKey: string, path: string, body?: unknown) {
  const url = new URL(path, baseUrl)
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'X-Api-Key': apiKey,
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })
  const data: unknown = await response.json().catch(() => null)
  return { response, data }
}

async function verifyCustomerInPadronA13(orderId: string, cuit: string, environment: string, confirmedAt: Date): Promise<void> {
  const secret = process.env.PUBLIC_PADRON_BACKEND_SECRET?.trim()
  if (!secret) throw new OrderInvoiceEmissionError('La consulta del Padrón A13 no está configurada.', 503)
  const baseUrl = getWorkerBaseUrl()
  const url = new URL('/internal/public/padron/consultas', baseUrl)
  const clientKey = createHash('sha256').update(`${orderId}:${cuit}:${confirmedAt.toISOString()}`).digest('hex').slice(0, 48)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Public-Padron-Secret': secret,
      'X-Nodo-Client-IP': `order-${clientKey}`,
      'Idempotency-Key': `order-a13-${clientKey}`,
    },
    body: JSON.stringify({ cuit, environment }),
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || !isRecord(payload) || payload.success !== true || !isRecord(payload.data) || payload.data.cuit !== cuit) {
    throw new OrderInvoiceEmissionError(workerErrorMessage(payload) ?? 'No se pudo verificar al receptor con el Padrón A13; la factura quedó pendiente.', response.status === 429 ? 429 : 409)
  }
  const status = payload.data.estadoRegistral
  if (typeof status !== 'string' || status.toUpperCase() !== 'ACTIVO') {
    throw new OrderInvoiceEmissionError('El Padrón A13 no confirmó un estado ACTIVO para el receptor. Revisá los datos antes de emitir.', 409)
  }
}

async function getAccountApiKey(accountId: string | null) {
  if (!accountId) {
    const apiKey = process.env.API_KEY?.trim()
    if (!apiKey) throw new OrderInvoiceEmissionError('Falta la API_KEY del tenant fiscal de ZAP.', 503)
    return apiKey
  }
  const account = await prisma.fiscalClientAccount.findUnique({
    where: { id: accountId },
    select: { id: true, encryptedApiKey: true, status: true },
  })
  if (!account || account.status !== 'ACTIVE') throw new OrderInvoiceEmissionError('La cuenta fiscal emisora no está activa.', 503)
  try {
    return decryptFiscalCredential(account.encryptedApiKey)
  } catch (error) {
    console.error('[checkout.billing.emit] credential decrypt failed', error instanceof Error ? error.name : 'UnknownError')
    throw new OrderInvoiceEmissionError('No se pudo abrir la credencial fiscal protegida.', 503)
  }
}

function parseDate(value?: string) {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

async function saveWorkerResult(input: {
  orderId: string
  accountId: string | null
  environment: string
  contributorCuit: string
  pointOfSale: number
  voucherType: string
  amount: number
  body: Record<string, unknown>
  result: WorkerResult
}): Promise<InvoiceSummary> {
  const status = input.result.status ?? 'PENDING'
  const caeExpiresAt = parseDate(input.result.voucher?.caeFchVto)
  const voucherType = input.result.voucher?.voucherType ?? voucherCodes[input.voucherType] ?? voucherCodes.B
  const saved = await prisma.fiscalInvoiceRecord.upsert({
    where: { jobId: input.result.jobId },
    create: {
      accountId: input.accountId,
      environment: input.environment,
      cuit: input.contributorCuit,
      pointOfSale: input.pointOfSale,
      voucherType,
      voucherNumber: input.result.voucher?.voucherNumber ?? null,
      result: status,
      cae: input.result.voucher?.cae ?? null,
      caeExpiresAt: caeExpiresAt ?? null,
      workerVoucherId: input.result.voucher?.id ?? null,
      amount: new Prisma.Decimal(input.amount),
      jobId: input.result.jobId,
      requestReference: input.orderId,
      payload: { ...input.body, workerStatus: status },
    },
    update: {
      result: status,
      voucherNumber: input.result.voucher?.voucherNumber ?? undefined,
      cae: input.result.voucher?.cae ?? undefined,
      caeExpiresAt,
      workerVoucherId: input.result.voucher?.id ?? undefined,
      payload: { ...input.body, workerStatus: status },
    },
    select: { id: true, jobId: true, result: true, voucherNumber: true, cae: true, caeExpiresAt: true },
  })
  return saved
}

async function refreshWorkerJob(invoice: InvoiceSummary, orderId: string): Promise<WorkerResult> {
  if (!invoice.jobId) throw new OrderInvoiceEmissionError('La factura no tiene un job del Worker para consultar.', 502)
  const account = await prisma.fiscalInvoiceRecord.findUnique({
    where: { jobId: invoice.jobId },
    select: { accountId: true, environment: true },
  })
  if (!account) throw new OrderInvoiceEmissionError('No encontramos el registro fiscal asociado al job.', 404)
  const baseUrl = getWorkerBaseUrl()
  const apiKey = await getAccountApiKey(account.accountId)
  const { response, data } = await callWorker(baseUrl, apiKey, `/v1/jobs/${encodeURIComponent(invoice.jobId)}`)
  const result = parseWorkerResult(data)
  if (!response.ok || !result) {
    throw new OrderInvoiceEmissionError(workerErrorMessage(data) ?? 'No pudimos consultar el estado de la factura en el Worker.', 502)
  }
  if (result.externalId !== orderId || result.environment !== account.environment) {
    throw new OrderInvoiceEmissionError('El job del Worker no coincide con el pedido y ambiente guardados.', 502)
  }
  return result
}

export async function requestOrderInvoice(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order) throw new OrderInvoiceEmissionError('No encontramos el pedido.', 404)
  if (order.status !== 'DELIVERED') throw new OrderInvoiceEmissionError('La factura se solicita cuando el pedido está entregado.', 409)
  const approvalEvent = await prisma.orderEvent.findFirst({
    where: { orderId, status: { in: ['PAID', 'PROCESSING', 'IN_PRODUCTION', 'PROOF_SENT', 'READY'] } },
    select: { id: true },
  })
  if (!order.paymentId && !approvalEvent) throw new OrderInvoiceEmissionError('El pedido debe tener el pago aprobado antes de facturarlo.', 409)

  const prior = await prisma.fiscalInvoiceRecord.findFirst({
    where: { requestReference: order.id },
    select: { id: true, accountId: true, environment: true, result: true, jobId: true, voucherNumber: true, cae: true, caeExpiresAt: true },
  })
  if (prior) {
    const summary = summarizeInvoice(prior)
    if (!prior.jobId || terminalWorkerStatuses.has(prior.result ?? '')) {
      return { invoice: summary, alreadyRequested: true as const }
    }
    const result = await refreshWorkerJob(summary, order.id)
    const saved = await prisma.fiscalInvoiceRecord.update({
      where: { id: prior.id },
      data: {
        result: result.status ?? prior.result,
        voucherNumber: result.voucher?.voucherNumber ?? undefined,
        cae: result.voucher?.cae ?? undefined,
        caeExpiresAt: parseDate(result.voucher?.caeFchVto),
        workerVoucherId: result.voucher?.id ?? undefined,
      },
      select: { id: true, jobId: true, result: true, voucherNumber: true, cae: true, caeExpiresAt: true },
    })
    return { invoice: saved, result: safeWorkerStatus(result), alreadyRequested: true as const }
  }

  if (!order.documentId || !order.billingName || !order.billingAddress || !order.billingCity || !order.billingProvince || !order.billingVoucherType || !order.billingVatCondition || !order.billingVatConfirmedAt) {
    return { needsBillingDetails: true as const }
  }
  const accountId = process.env.FISCAL_ORDER_ACCOUNT_ID?.trim() || null
  const contributorCuit = (process.env.FISCAL_ORDER_CONTRIBUTOR_CUIT?.trim() || '20321601058').replace(/\D/g, '')
  const environment = process.env.FISCAL_ORDER_ENVIRONMENT?.trim() || 'TEST'
  const pointOfSale = Number(process.env.FISCAL_ORDER_POINT_OF_SALE || (environment === 'PROD' ? '3' : '1'))
  if (!contributorCuit || !/^\d{11}$/.test(contributorCuit) || !['TEST', 'PROD'].includes(environment) || !Number.isInteger(pointOfSale) || pointOfSale < 1) {
    throw new OrderInvoiceEmissionError('La cuenta, CUIT, punto de venta y ambiente del Fiscal Worker deben configurarse explícitamente.', 503)
  }
  if (!(await isFiscalFeatureEnabled(environment === 'PROD' ? 'invoiceEmissionProd' : 'invoiceEmissionTest')))
    throw new OrderInvoiceEmissionError('La emisión de comprobantes está desactivada por administración.', 423)

  const baseUrl = getWorkerBaseUrl()
  const apiKey = await getAccountApiKey(accountId)
  if (accountId) {
    const contributor = await prisma.fiscalContributor.findUnique({
      where: { accountId_cuit_environment: { accountId, cuit: contributorCuit, environment } },
      select: { authorizationStatus: true, permissions: true },
    })
    const permissions = contributor?.permissions
  if (contributor?.authorizationStatus !== 'ACTIVE' || !permissions || typeof permissions !== 'object' || !('canEmit' in permissions) || permissions.canEmit !== true)
    throw new OrderInvoiceEmissionError('La CUIT emisora no está autorizada para emitir.', 423)

  } else {
    const contributorCheck = await callWorker(baseUrl, apiKey, `/v1/contributors/${encodeURIComponent(contributorCuit)}?environment=${environment}`)
    const data = contributorCheck.data
    const environments = isRecord(data) && Array.isArray(data.environments) ? data.environments : []
    const contributor = environments.find((entry): entry is Record<string, unknown> => isRecord(entry) && entry.environment === environment)
    const permissions = contributor && isRecord(contributor.permissions) ? contributor.permissions : null
    if (!contributorCheck.response.ok || contributor?.authorizationStatus !== 'ACTIVE' || permissions?.canEmit !== true)
      throw new OrderInvoiceEmissionError('La CUIT emisora no esta autorizada para emitir en este ambiente del Worker.', 423)
  }

  await verifyCustomerInPadronA13(order.id, order.documentId.replace(/\D/g, ''), environment, order.billingVatConfirmedAt)

  const lines = order.items.map(item => {
    const snapshot = item.configurationSnapshot as { tax?: { ratePercent?: unknown; treatment?: unknown } } | null
    const rate = snapshot?.tax?.ratePercent
    if (snapshot?.tax?.treatment !== 'INCLUDED' || typeof rate !== 'number' || !supportedVatRates.has(rate)) return null
    return { item, rate, gross: round(item.unitPrice * item.quantity) }
  })
  if (lines.some(line => line === null)) throw new OrderInvoiceEmissionError('Al menos un ítem no tiene una alícuota de IVA compatible con el Fiscal Worker.', 422)
  const validLines = lines.filter((line): line is NonNullable<typeof line> => line !== null)
  const grossSubtotal = round(validLines.reduce((sum, line) => sum + line.gross, 0))
  if (!grossSubtotal || Math.abs(grossSubtotal - order.discountTotal - order.total) > 0.02) throw new OrderInvoiceEmissionError('Los importes guardados no coinciden con el total del pedido.', 422)

  let allocatedDiscount = 0
  const discounts = validLines.map((line, index) => {
    if (index === validLines.length - 1) return round(order.discountTotal - allocatedDiscount)
    const discount = round(line.gross * (order.discountTotal / grossSubtotal))
    allocatedDiscount = round(allocatedDiscount + discount)
    return discount
  })
  const items = validLines.map((line, index) => {
    const allocatedGross = round(line.gross - discounts[index])
    const netAmount = order.billingVoucherType === 'C'
      ? allocatedGross
      : round(allocatedGross / (1 + line.rate / 100))
    const vatAmount = order.billingVoucherType === 'C' ? 0 : round(netAmount * line.rate / 100)
    const totalAmount = round(netAmount + vatAmount)
    const unitPrice = round(line.item.unitPrice)
    const discountAmount = round(unitPrice * line.item.quantity - totalAmount)
    if (discountAmount < 0 || discountAmount > unitPrice * line.item.quantity) {
      throw new OrderInvoiceEmissionError('El detalle del pedido no se puede representar con los importes que acepta el Fiscal Worker.', 422)
    }
    return {
      description: line.item.productName.slice(0, 250),
      quantity: line.item.quantity,
      unitPrice,
      discountAmount,
      netAmount,
      vatRate: order.billingVoucherType === 'C' ? null : line.rate,
      vatAmount,
      totalAmount,
    }
  })
  const net = round(items.reduce((sum, line) => sum + line.netAmount, 0))
  const vat = round(items.reduce((sum, line) => sum + line.vatAmount, 0))
  const invoiceTotal = round(items.reduce((sum, line) => sum + line.totalAmount, 0))
  if (invoiceTotal !== round(order.total)) {
    throw new OrderInvoiceEmissionError('El redondeo del detalle fiscal no coincide con el total cobrado; requiere revisión manual.', 422)
  }

  const vatGroups = new Map<number, { base: number; amount: number }>()
  if (order.billingVoucherType !== 'C') {
    for (const line of items) {
      if (line.vatRate === null) continue
      const group = vatGroups.get(line.vatRate) ?? { base: 0, amount: 0 }
      group.base = round(group.base + line.netAmount)
      group.amount = round(group.amount + line.vatAmount)
      vatGroups.set(line.vatRate, group)
    }
  }

  const hasService = order.items.some(item => item.isService)
  if (hasService && (!order.billingServiceFrom || !order.billingServiceTo || !order.billingPaymentDueDate)) throw new OrderInvoiceEmissionError('Falta el período o vencimiento requerido para facturar servicios.', 422)
  const toArcaDate = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, '')
  const todayArcaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replace(/-/g, '')
  const isConsumerFinal = order.billingVatCondition === 5
  if (isConsumerFinal && invoiceTotal >= 10_000_000) {
    throw new OrderInvoiceEmissionError('Para una operación desde $10.000.000 falta registrar DNI, CUIL o CDI del consumidor final; completá ese dato antes de emitir.', 422)
  }
  const saleConditionByPaymentType: Record<typeof order.paymentType, string> = {
    CRYPTO: 'Contado',
    MERCADOPAGO: 'Mercado Pago',
    TRANSFER: 'Transferencia',
    CASH: 'Contado',
    ZAP_CREDIT: 'Cuenta corriente',
  }
  const billingAddress = [order.billingAddress, order.billingCity, order.billingProvince].filter(Boolean).join(', ')
  const customer = isConsumerFinal
    ? { docType: 99, docNumber: '0', name: 'Consumidor Final', address: billingAddress, vatCondition: order.billingVatCondition }
    : { docType: 80, docNumber: order.documentId.replace(/\D/g, ''), name: order.billingName, address: billingAddress, vatCondition: order.billingVatCondition }
  const body = {
    externalId: order.id,
    idempotencyKey: `zap-order-invoice-${order.id}`,
    contributor: { cuit: contributorCuit, pointOfSale, environment },
    voucher: {
      type: order.billingVoucherType,
      concept: hasService ? (order.items.every(item => item.isService) ? 2 : 3) : 1,
      date: todayArcaDate,
      saleCondition: saleConditionByPaymentType[order.paymentType],
      ...(hasService && order.billingServiceFrom && order.billingServiceTo && order.billingPaymentDueDate ? {
        serviceFrom: toArcaDate(order.billingServiceFrom), serviceTo: toArcaDate(order.billingServiceTo), paymentDueDate: toArcaDate(order.billingPaymentDueDate),
      } : {}),
    },
    amounts: { total: invoiceTotal, net, vat, exempt: 0, nonTaxable: 0, ...(['B', 'C'].includes(order.billingVoucherType) && isConsumerFinal ? { otherNationalIndirectTaxes: 0 } : {}), ...(order.billingVoucherType !== 'C' ? { vatBreakdown: [...vatGroups.entries()].map(([rate, amount]) => ({ rate, base: amount.base, amount: amount.amount })) } : {}) },
    items,
    customer,
  }

  try {
    const dryRun = await callWorker(baseUrl, apiKey, '/v1/invoices/emit?dryRun=true', body)
    if (!dryRun.response.ok) {
      throw new OrderInvoiceEmissionError(workerErrorMessage(dryRun.data) ?? 'El Fiscal Worker rechazó la validación previa.', dryRun.response.status)
    }
    if (!isRecord(dryRun.data) || dryRun.data.valid !== true) {
      throw new OrderInvoiceEmissionError('El Fiscal Worker detectó datos fiscales que deben corregirse antes de emitir.', 422)
    }

    const emission = await callWorker(baseUrl, apiKey, '/v1/invoices/emit?sync=true', body)
    const result = parseWorkerResult(emission.data)
    if (!result) {
      throw new OrderInvoiceEmissionError(workerErrorMessage(emission.data) ?? 'El Fiscal Worker devolvió una respuesta no reconocida.', emission.response.ok ? 502 : emission.response.status)
    }
    if (!emission.response.ok && !result.jobId) {
      throw new OrderInvoiceEmissionError(workerErrorMessage(emission.data) ?? 'El Fiscal Worker rechazó la solicitud de factura.', emission.response.status)
    }

    const invoice = await saveWorkerResult({
      orderId: order.id,
      accountId,
      environment,
      contributorCuit,
      pointOfSale,
      voucherType: order.billingVoucherType,
      amount: invoiceTotal,
      body,
      result,
    })
    return { result: safeWorkerStatus(result), invoice }
  } catch (error) {
    if (error instanceof OrderInvoiceEmissionError) throw error
    console.error('[checkout.billing.emit] Worker request failed', error instanceof Error ? error.name : 'UnknownError')
    throw new OrderInvoiceEmissionError('No pudimos confirmar el resultado de la emisión. Consultá el estado antes de volver a emitir.', 502)
  }
}
