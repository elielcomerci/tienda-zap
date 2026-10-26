import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount } from '@/lib/fiscal-account-access'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'
import { refreshFiscalInvoiceBatchStatus } from '@/lib/fiscal-invoice-batches'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ batchId: string }> }

export async function GET(request: NextRequest, context: Context) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  if (!(await isFiscalFeatureEnabled('batchImport'))) return NextResponse.json({ error: 'La importación por lote está desactivada.' }, { status: 423 })
  const { batchId } = await context.params
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(batchId)) return NextResponse.json({ error: 'ID de lote inválido.' }, { status: 422 })

  const staleBefore = new Date(Date.now() - 2 * 60 * 1000)
  const staleRows = await prisma.fiscalInvoiceBatchItem.updateMany({
    where: { accountId: access.account.id, batchId, status: 'PROCESSING', jobId: null, submittedAt: { lt: staleBefore } },
    data: { status: 'UNKNOWN', errorCode: 'SUBMISSION_RESPONSE_MISSING', errorMessage: 'No se recibió la referencia del trabajo. Se puede reintentar con la misma clave segura.' },
  })
  if (staleRows.count > 0) await prisma.$transaction(transaction => refreshFiscalInvoiceBatchStatus(transaction, access.account.id, batchId))

  const batch = await prisma.fiscalInvoiceBatch.findFirst({
    where: { id: batchId, accountId: access.account.id },
    select: {
      id: true, sourceName: true, status: true, rowCount: true, createdAt: true, updatedAt: true, completedAt: true,
      items: {
        orderBy: { rowNumber: 'asc' },
        select: {
          id: true, rowNumber: true, input: true, requestPayload: true, status: true, errorCode: true, errorMessage: true,
          jobId: true, submittedAt: true, resolvedAt: true,
          invoiceRecord: {
            select: {
              id: true, environment: true, cuit: true, pointOfSale: true, voucherType: true, voucherNumber: true,
              result: true, cae: true, caeExpiresAt: true, amount: true, currency: true, createdAt: true, payload: true,
            },
          },
        },
      },
    },
  })
  if (!batch) return NextResponse.json({ error: 'No se encontró el lote.' }, { status: 404 })
  return NextResponse.json({ batch }, { headers: { 'Cache-Control': 'no-store' } })
}
