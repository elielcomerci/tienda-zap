import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount, fiscalApiRequest } from '@/lib/fiscal-account-access'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'
import { DEFAULT_FISCAL_INVOICE_TEMPLATE, fiscalInvoiceTemplateSchema } from '@/lib/fiscal-invoice-template'
import { refreshFiscalInvoiceBatchStatus, getFiscalInvoiceBatchItemStatusFromJob } from '@/lib/fiscal-invoice-batches'
import { fiscalBatchRequestPayloadSchema } from '@/lib/fiscal-invoice-batch-schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type EmitBody = {
  externalId?: string
  idempotencyKey?: string
  contributor?: { cuit?: string; pointOfSale?: number; environment?: string }
  voucher?: { type?: string; concept?: number; date?: string; serviceFrom?: string; serviceTo?: string; paymentDueDate?: string; saleCondition?: string }
  amounts?: { total?: number; net?: number; vat?: number; exempt?: number; nonTaxable?: number; otherNationalIndirectTaxes?: number; vatBreakdown?: Array<{ rate: number; base: number; amount: number }> }
  items?: Array<{ description: string; quantity: number; unitPrice: number; discountAmount?: number; netAmount: number; vatRate?: number | null; vatAmount: number; exemptAmount?: number; nonTaxableAmount?: number; totalAmount: number }>
  customer?: { docType: number; docNumber: string; name?: string | null; address?: string | null; vatCondition?: number }
}
type EmitResult = {
  jobId?: string
  status?: string
  externalId?: string
  voucher?: { id?: string; voucherType?: number; voucherNumber?: number; cae?: string; caeFchVto?: string; issuedAt?: string; documentSnapshot?: unknown }
}

function voucherCode(type: string | undefined) {
  const codes: Record<string, number> = { A: 1, B: 6, C: 11, M: 51 }
  return type ? codes[type] ?? null : null
}

function parseDate(value: string | undefined) {
  if (!value) return null
  const date = /^\d{8}$/.test(value)
    ? new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`)
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function POST(request: NextRequest) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response

  const batchItemId = request.nextUrl.searchParams.get('batchItemId')
  let batchItem: { id: string; batchId: string; status: string; requestPayload: unknown; jobId: string | null } | null = null
  let body: EmitBody
  if (batchItemId) {
    if (!(await isFiscalFeatureEnabled('batchImport'))) return NextResponse.json({ error: 'La importación por lote está desactivada.' }, { status: 423 })
    batchItem = await prisma.fiscalInvoiceBatchItem.findFirst({ where: { id: batchItemId, accountId: access.account.id }, select: { id: true, batchId: true, status: true, requestPayload: true, jobId: true } })
    if (!batchItem) return NextResponse.json({ error: 'No se encontró la fila del lote.' }, { status: 404 })
    if (batchItem.jobId || ['PROCESSING', 'AUTHORIZED', 'REJECTED'].includes(batchItem.status)) return NextResponse.json({ error: 'Esta fila ya tiene un trabajo o un resultado registrado. Consultá su estado antes de continuar.', jobId: batchItem.jobId }, { status: 409 })
    const payload = fiscalBatchRequestPayloadSchema.safeParse(batchItem.requestPayload)
    if (!payload.success || (batchItem.status !== 'READY' && batchItem.status !== 'UNKNOWN')) return NextResponse.json({ error: 'La fila no tiene una solicitud válida lista para emitir.' }, { status: 409 })
    body = payload.data
    const claimed = await prisma.fiscalInvoiceBatchItem.updateMany({
      where: { id: batchItem.id, accountId: access.account.id, status: batchItem.status, jobId: null },
      data: { status: 'PROCESSING', errorCode: null, errorMessage: null, submittedAt: new Date() },
    })
    if (claimed.count !== 1) return NextResponse.json({ error: 'Otra solicitud ya está procesando esta fila. Actualizá el lote para ver su estado.' }, { status: 409 })
    const claimedBatchId = batchItem.batchId
    await prisma.$transaction(transaction => refreshFiscalInvoiceBatchStatus(transaction, access.account.id, claimedBatchId))
  } else {
    try {
      body = await request.json() as EmitBody
    } catch {
      return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 })
    }
  }
  const cuit = body.contributor?.cuit || ''
  const pointOfSale = body.contributor?.pointOfSale
  const environment = body.contributor?.environment
  const voucherType = voucherCode(body.voucher?.type)
  if (!/^\d{11}$/.test(cuit) || !Number.isInteger(pointOfSale) || (pointOfSale || 0) < 1 ||
      !['TEST', 'PROD'].includes(String(environment)) || !voucherType) {
    return NextResponse.json({ error: 'La emisión requiere CUIT, punto de venta, ambiente y tipo de factura válido.' }, { status: 422 })
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true'
  const [currentTemplate, defaultTemplate] = await Promise.all([
    prisma.fiscalInvoiceTemplate.findUnique({ where: { accountId: access.account.id }, select: { template: true } }),
    prisma.fiscalInvoiceTemplate.findUnique({ where: { id: 'default' }, select: { template: true } }),
  ])
  const parsedTemplate = fiscalInvoiceTemplateSchema.safeParse(currentTemplate?.template ?? defaultTemplate?.template ?? DEFAULT_FISCAL_INVOICE_TEMPLATE)
  const pdfTemplateSnapshot = parsedTemplate.success ? parsedTemplate.data : DEFAULT_FISCAL_INVOICE_TEMPLATE
  const featureEnabled = await isFiscalFeatureEnabled(environment === 'PROD' ? 'invoiceEmissionProd' : 'invoiceEmissionTest')
  if (!featureEnabled) {
    return NextResponse.json({ error: environment === 'PROD' ? 'La emisión en producción está desactivada por el administrador.' : 'La emisión en homologación está desactivada por el administrador.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })
  }
  if (body.idempotencyKey?.startsWith('zap-batch-') && !(await isFiscalFeatureEnabled('batchImport'))) {
    return NextResponse.json({ error: 'La importación por lote está desactivada por el administrador.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })
  }
  if (typeof body.externalId !== 'string' || !body.externalId.trim() || typeof body.idempotencyKey !== 'string' || !body.idempotencyKey.trim()) {
    return NextResponse.json({ error: 'La solicitud requiere externalId e idempotencyKey.' }, { status: 422 })
  }
  const workerPath = dryRun ? '/v1/invoices/emit?dryRun=true' : '/v1/invoices/emit'
  const response = await fiscalApiRequest(request, workerPath, access.apiKey, JSON.stringify(body))
  if (!response.ok) {
    if (batchItem) {
      const uncertain = response.status >= 500 || response.status === 408 || response.status === 429
      await prisma.$transaction(async transaction => {
        await transaction.fiscalInvoiceBatchItem.update({ where: { id: batchItem.id }, data: { status: uncertain ? 'UNKNOWN' : 'REJECTED', errorCode: `HTTP_${response.status}`, errorMessage: uncertain ? 'No se pudo confirmar si el Worker recibió la solicitud.' : 'El Worker rechazó la emisión.', resolvedAt: uncertain ? null : new Date() } })
        await refreshFiscalInvoiceBatchStatus(transaction, access.account.id, batchItem.batchId)
      })
    }
    return response
  }
  const result = await response.clone().json().catch(() => ({})) as EmitResult
  if (!result.jobId) {
    if (batchItem) await prisma.$transaction(async transaction => {
      await transaction.fiscalInvoiceBatchItem.update({ where: { id: batchItem.id }, data: { status: 'UNKNOWN', errorCode: 'WORKER_JOB_ID_MISSING', errorMessage: 'La respuesta no incluyó la referencia del trabajo.' } })
      await refreshFiscalInvoiceBatchStatus(transaction, access.account.id, batchItem.batchId)
    })
    return response
  }

  try {
    const invoice = await prisma.fiscalInvoiceRecord.upsert({
      where: { jobId: result.jobId },
      create: {
        accountId: access.account.id,
        environment: String(environment),
        cuit,
        pointOfSale: pointOfSale!,
        voucherType: result.voucher?.voucherType ?? voucherType,
        voucherNumber: result.voucher?.voucherNumber ?? null,
        result: result.status || 'PENDING',
        cae: result.voucher?.cae ?? null,
        caeExpiresAt: parseDate(result.voucher?.caeFchVto),
        workerVoucherId: result.voucher?.id ?? null,
        amount: typeof body.amounts?.total === 'number' ? body.amounts.total : null,
        jobId: result.jobId,
        requestReference: body.externalId || result.externalId || null,
        // Store only the fiscal document data needed for the local PDF renderer.
        // Never persist webhook secrets or API credentials from the request.
        payload: {
          voucher: body.voucher ?? null,
          amounts: body.amounts ?? null,
          items: body.items ?? [],
          customer: body.customer ?? null,
          documentSnapshot: result.voucher?.documentSnapshot == null
            ? null
            : JSON.parse(JSON.stringify(result.voucher.documentSnapshot)),
          pdfTemplateSnapshot,
          status: result.status || 'PENDING',
        },
      },
      update: {
        result: result.status || undefined,
        voucherNumber: result.voucher?.voucherNumber ?? undefined,
        voucherType: result.voucher?.voucherType ?? undefined,
        cae: result.voucher?.cae ?? undefined,
        caeExpiresAt: parseDate(result.voucher?.caeFchVto) ?? undefined,
        workerVoucherId: result.voucher?.id ?? undefined,
      },
    })
    if (batchItem) await prisma.$transaction(async transaction => {
      await transaction.fiscalInvoiceBatchItem.update({
        where: { id: batchItem.id },
        data: {
          jobId: result.jobId,
          invoiceRecordId: invoice.id,
          status: getFiscalInvoiceBatchItemStatusFromJob(result.status, result.voucher?.cae),
          errorCode: null,
          errorMessage: null,
          resolvedAt: ['DONE', 'FAILED', 'DEAD'].includes(result.status ?? '') ? new Date() : null,
        },
      })
      await refreshFiscalInvoiceBatchStatus(transaction, access.account.id, batchItem.batchId)
    })
  } catch (error) {
    console.error('[fiscal/emit] invoice record save failed', error instanceof Error ? error.name : 'UnknownError')
    if (batchItem) {
      await prisma.fiscalInvoiceBatchItem.update({ where: { id: batchItem.id }, data: { jobId: result.jobId, status: 'PROCESSING', errorCode: 'INVOICE_RECORD_SYNC_PENDING', errorMessage: 'El trabajo existe; la sincronización del comprobante está pendiente.' } }).catch(syncError => console.error('[fiscal/emit] batch job sync failed', syncError instanceof Error ? syncError.name : 'UnknownError'))
    }
    return NextResponse.json({
      error: 'La respuesta del Worker llegó, pero no se pudo registrar en el panel. Consultá el estado del trabajo antes de volver a emitir.',
      code: 'FISCAL_INVOICE_RECORD_FAILED',
      jobId: result.jobId,
    }, { status: 500 })
  }
  return response
}
