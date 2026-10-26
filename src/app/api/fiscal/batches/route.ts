import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount } from '@/lib/fiscal-account-access'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'
import { fiscalBatchRequestPayloadSchema } from '@/lib/fiscal-invoice-batch-schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const rowInputSchema = z.record(z.string(), z.string().max(1000)).refine(value => Object.keys(value).length <= 32)
const itemSchema = z.object({
  rowNumber: z.number().int().min(2).max(51),
  input: rowInputSchema,
  requestPayload: fiscalBatchRequestPayloadSchema.nullable(),
  errorMessage: z.string().max(500).optional(),
}).superRefine((item, context) => {
  if (!item.requestPayload) return
  const { requestPayload } = item
  if (requestPayload.externalId !== item.input.externalId || requestPayload.contributor.cuit !== item.input.cuit || requestPayload.contributor.environment !== item.input.environment) {
    context.addIssue({ code: 'custom', message: 'Los datos de fila no coinciden con la solicitud fiscal.' })
  }
  if (requestPayload.idempotencyKey !== `zap-batch-${requestPayload.externalId}`) {
    context.addIssue({ code: 'custom', message: 'La clave idempotente no corresponde a la referencia externa.' })
  }
})

const createBatchSchema = z.object({
  sourceName: z.string().trim().max(180).optional(),
  items: z.array(itemSchema).min(1).max(50),
}).superRefine(({ items }, context) => {
  const rowNumbers = new Set<number>()
  const externalIds = new Set<string>()
  items.forEach((item, index) => {
    if (rowNumbers.has(item.rowNumber)) context.addIssue({ code: 'custom', path: ['items', index, 'rowNumber'], message: 'Número de fila duplicado.' })
    rowNumbers.add(item.rowNumber)
    const externalId = item.requestPayload?.externalId
    if (externalId && externalIds.has(externalId)) context.addIssue({ code: 'custom', path: ['items', index, 'requestPayload', 'externalId'], message: 'externalId duplicado dentro del lote.' })
    if (externalId) externalIds.add(externalId)
  })
})

export async function GET(request: NextRequest) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  if (!(await isFiscalFeatureEnabled('batchImport'))) return NextResponse.json({ error: 'La importación por lote está desactivada.' }, { status: 423 })

  const batches = await prisma.fiscalInvoiceBatch.findMany({
    where: { accountId: access.account.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, sourceName: true, status: true, rowCount: true, createdAt: true, updatedAt: true, completedAt: true },
  })
  return NextResponse.json({ batches }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  if (!(await isFiscalFeatureEnabled('batchImport'))) return NextResponse.json({ error: 'La importación por lote está desactivada.' }, { status: 423 })

  const body = await request.json().catch(() => null)
  const parsed = createBatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'El lote no tiene un formato válido.', details: parsed.error.flatten() }, { status: 422 })

  const items = [...parsed.data.items].sort((left, right) => left.rowNumber - right.rowNumber)
  const fingerprint = createHash('sha256').update(JSON.stringify(items.map(item => ({ rowNumber: item.rowNumber, input: item.input })))).digest('hex')
  const existing = await prisma.fiscalInvoiceBatch.findUnique({
    where: { accountId_fingerprint: { accountId: access.account.id, fingerprint } },
    select: { id: true, status: true, rowCount: true },
  })
  if (existing) {
    const previousItems = await prisma.fiscalInvoiceBatchItem.findMany({ where: { batchId: existing.id, accountId: access.account.id }, select: { id: true, rowNumber: true, jobId: true, status: true } })
    if (previousItems.every(item => !item.jobId && item.status !== 'PROCESSING')) {
      await prisma.$transaction(async transaction => {
        for (const item of items) {
          const previous = previousItems.find(candidate => candidate.rowNumber === item.rowNumber)
          if (!previous) continue
          await transaction.fiscalInvoiceBatchItem.update({
            where: { id: previous.id },
            data: {
              environment: item.requestPayload?.contributor.environment ?? item.input.environment ?? null,
              cuit: item.requestPayload?.contributor.cuit ?? item.input.cuit ?? null,
              externalId: item.requestPayload?.externalId ?? item.input.externalId ?? null,
              idempotencyKey: item.requestPayload?.idempotencyKey ?? null,
              input: item.input,
              requestPayload: item.requestPayload ?? Prisma.DbNull,
              status: item.requestPayload ? 'READY' : 'INVALID',
              errorMessage: item.errorMessage ?? null,
            },
          })
        }
        await transaction.fiscalInvoiceBatch.update({
          where: { id: existing.id },
          data: { status: items.some(item => !item.requestPayload) ? 'NEEDS_CORRECTION' : 'READY', completedAt: null },
        })
      })
    }
    return NextResponse.json({ batch: existing, existing: true }, { headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const batch = await prisma.fiscalInvoiceBatch.create({
      data: {
        accountId: access.account.id,
        sourceName: parsed.data.sourceName || null,
        fingerprint,
        rowCount: items.length,
        status: items.some(item => !item.requestPayload) ? 'NEEDS_CORRECTION' : 'READY',
        items: {
          create: items.map(item => ({
            accountId: access.account.id,
            rowNumber: item.rowNumber,
            environment: item.requestPayload?.contributor.environment ?? item.input.environment ?? null,
            cuit: item.requestPayload?.contributor.cuit ?? item.input.cuit ?? null,
            externalId: item.requestPayload?.externalId ?? item.input.externalId ?? null,
            idempotencyKey: item.requestPayload?.idempotencyKey ?? null,
            input: item.input,
            requestPayload: item.requestPayload ?? undefined,
            status: item.requestPayload ? 'READY' : 'INVALID',
            errorMessage: item.errorMessage ?? null,
          })),
        },
      },
      select: { id: true, status: true, rowCount: true },
    })
    return NextResponse.json({ batch, existing: false }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const duplicate = await prisma.fiscalInvoiceBatch.findUnique({ where: { accountId_fingerprint: { accountId: access.account.id, fingerprint } }, select: { id: true, status: true, rowCount: true } })
    if (duplicate) return NextResponse.json({ batch: duplicate, existing: true }, { headers: { 'Cache-Control': 'no-store' } })
    const conflictingKey = await prisma.fiscalInvoiceBatchItem.findFirst({
      where: { accountId: access.account.id, idempotencyKey: { in: items.flatMap(item => item.requestPayload ? [item.requestPayload.idempotencyKey] : []) } },
      select: { batchId: true },
    })
    if (conflictingKey) return NextResponse.json({ error: 'Una o más referencias externas ya pertenecen a otro lote. Conservá el mismo contenido o usá una referencia nueva para una factura distinta.' }, { status: 409 })
    console.error('[fiscal/batches] create failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudo guardar el lote.' }, { status: 500 })
  }
}
