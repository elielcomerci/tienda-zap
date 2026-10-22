import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount, fiscalApiRequest } from '@/lib/fiscal-account-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type EmitBody = {
  externalId?: string
  contributor?: { cuit?: string; pointOfSale?: number; environment?: string }
  voucher?: { type?: string }
  amounts?: { total?: number }
}
type EmitResult = {
  jobId?: string
  status?: string
  externalId?: string
  voucher?: { voucherType?: number; voucherNumber?: number; cae?: string; caeFchVto?: string; issuedAt?: string }
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

  const response = await fiscalApiRequest(request, '/v1/invoices/emit', access.apiKey, JSON.stringify(body))
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
        amount: typeof body.amounts?.total === 'number' ? body.amounts.total : null,
        jobId: result.jobId,
        requestReference: body.externalId || result.externalId || null,
        payload: {
          voucherType: body.voucher?.type || null,
          concept: null,
          status: result.status || 'PENDING',
        },
      },
      update: {
        result: result.status || undefined,
        voucherNumber: result.voucher?.voucherNumber ?? undefined,
        voucherType: result.voucher?.voucherType ?? undefined,
        cae: result.voucher?.cae ?? undefined,
        caeExpiresAt: parseDate(result.voucher?.caeFchVto) ?? undefined,
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
