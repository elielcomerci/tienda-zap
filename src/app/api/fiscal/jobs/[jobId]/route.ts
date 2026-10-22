import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount, fiscalApiRequest } from '@/lib/fiscal-account-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ jobId: string }> }
type JobResult = {
  jobId?: string
  status?: string
  voucher?: { voucherType?: number; voucherNumber?: number; cae?: string; caeFchVto?: string; issuedAt?: string }
}

function parseDate(value: string | undefined) {
  if (!value) return null
  const date = /^\d{8}$/.test(value)
    ? new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`)
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest, context: Context) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  const { jobId } = await context.params
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(jobId)) return NextResponse.json({ error: 'ID de trabajo inválido.' }, { status: 422 })

  const response = await fiscalApiRequest(request, `/v1/jobs/${encodeURIComponent(jobId)}`, access.apiKey)
  if (!response.ok) return response
  const result = await response.clone().json().catch(() => ({})) as JobResult
  if (result.jobId) {
    const record = await prisma.fiscalInvoiceRecord.findFirst({ where: { accountId: access.account.id, jobId } })
    if (record) {
      await prisma.fiscalInvoiceRecord.update({
        where: { id: record.id },
        data: {
          result: result.status || record.result,
          voucherType: result.voucher?.voucherType ?? record.voucherType,
          voucherNumber: result.voucher?.voucherNumber ?? record.voucherNumber,
          cae: result.voucher?.cae ?? record.cae,
          caeExpiresAt: parseDate(result.voucher?.caeFchVto) ?? record.caeExpiresAt,
        },
      }).catch(error => console.error('[fiscal/jobs] invoice sync failed', error instanceof Error ? error.name : 'UnknownError'))
    }
  }
  return response
}
