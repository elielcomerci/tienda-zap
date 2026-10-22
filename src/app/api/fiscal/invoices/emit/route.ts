import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount, fiscalApiRequest } from '@/lib/fiscal-account-access'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type EmitBody = {
  externalId?: string
  idempotencyKey?: string
  contributor?: { cuit?: string; pointOfSale?: number; environment?: string }
  voucher?: { type?: string; concept?: number; date?: string; serviceFrom?: string; serviceTo?: string; paymentDueDate?: string }
  amounts?: { total?: number; net?: number; vat?: number; exempt?: number; nonTaxable?: number; vatBreakdown?: Array<{ rate: number; base: number; amount: number }> }
  items?: Array<{ description: string; quantity: number; unitPrice: number; discountAmount?: number; netAmount: number; vatRate?: number | null; vatAmount: number; exemptAmount?: number; nonTaxableAmount?: number; totalAmount: number }>
  customer?: { docType: number; docNumber: string; name?: string | null; vatCondition?: number }
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

  let body: EmitBody
  try {
    body = await request.json() as EmitBody
  } catch {
    return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 })
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
  if (!response.ok) return response
  const result = await response.clone().json().catch(() => ({})) as EmitResult
  if (!result.jobId) return response

  try {
    await prisma.fiscalInvoiceRecord.upsert({
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
  } catch (error) {
    console.error('[fiscal/emit] invoice record save failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({
      error: 'La respuesta del Worker llegó, pero no se pudo registrar en el panel. Consultá el estado del trabajo antes de volver a emitir.',
      code: 'FISCAL_INVOICE_RECORD_FAILED',
      jobId: result.jobId,
    }, { status: 500 })
  }
  return response
}
