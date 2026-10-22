import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ accountId: string }> }

function isUniqueError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
}

export async function POST(request: NextRequest, context: Context) {
  if (!(await isFiscalFeatureEnabled('manualInvoiceRegistration'))) return NextResponse.json({ error: 'El registro manual de comprobantes está desactivado por el administrador.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
  const { accountId } = await context.params
  const account = await prisma.fiscalClientAccount.findUnique({ where: { id: accountId }, select: { id: true } })
  if (!account) return NextResponse.json({ error: 'No se encontró la cuenta fiscal.' }, { status: 404 })

  let input: Record<string, unknown>
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid')
    input = body as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'El body debe ser un objeto JSON válido.' }, { status: 400 })
  }

  const environment = input.environment === 'TEST' || input.environment === 'PROD' ? input.environment : ''
  const cuit = typeof input.cuit === 'string' ? input.cuit.trim() : ''
  const cae = typeof input.cae === 'string' ? input.cae.trim() : ''
  const caeFchVto = typeof input.caeFchVto === 'string' ? input.caeFchVto.trim() : ''
  const pointOfSale = Number(input.pointOfSale)
  const voucherType = Number(input.voucherType)
  const voucherNumber = Number(input.voucherNumber)
  const amount = Number(input.amount)
  const voucherTypes = new Set([1, 6, 11, 51])

  if (!environment || !/^\d{11}$/.test(cuit) || !/^\d{14}$/.test(cae) || !/^\d{8}$/.test(caeFchVto) ||
      !Number.isInteger(pointOfSale) || pointOfSale < 1 || !voucherTypes.has(voucherType) ||
      !Number.isInteger(voucherNumber) || voucherNumber < 1 || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'Revisá ambiente, CUIT, CAE, vencimiento, punto de venta, tipo, número e importe.' }, { status: 422 })
  }

  const expiry = new Date(`${caeFchVto.slice(0, 4)}-${caeFchVto.slice(4, 6)}-${caeFchVto.slice(6, 8)}T00:00:00.000Z`)
  if (Number.isNaN(expiry.getTime()) || expiry.toISOString().slice(0, 10).replace(/-/g, '') !== caeFchVto) {
    return NextResponse.json({ error: 'La fecha de vencimiento del CAE no es válida.' }, { status: 422 })
  }

  try {
    const invoice = await prisma.fiscalInvoiceRecord.create({
      data: {
        accountId,
        environment,
        cuit,
        pointOfSale,
        voucherType,
        voucherNumber,
        result: 'A',
        cae,
        caeExpiresAt: expiry,
        amount,
        currency: 'PES',
        payload: { source: 'MANUAL_IMPORT', verifiedBy: session.user.email || session.user.id },
      },
      select: { id: true, environment: true, cuit: true, pointOfSale: true, voucherType: true, voucherNumber: true, cae: true, caeExpiresAt: true, amount: true, createdAt: true },
    })
    await prisma.adminAuditLog.create({
      data: {
        actorId: session.user.id,
        actorEmail: session.user.email || '',
        action: 'FISCAL_INVOICE_ASSIGNED',
        entityType: 'FiscalInvoiceRecord',
        entityId: invoice.id,
        description: 'Se asignó un comprobante previamente emitido a una cuenta fiscal.',
        after: { accountId, environment, cuit, pointOfSale, voucherType, voucherNumber, cae, caeFchVto },
        metadata: { source: 'MANUAL_IMPORT' },
      },
    }).catch(error => console.error('[admin/fiscal/invoices] audit failed', error instanceof Error ? error.name : 'UnknownError'))

    return NextResponse.json({
      invoice: {
        ...invoice,
        amount: invoice.amount?.toString() ?? null,
        caeExpiresAt: invoice.caeExpiresAt?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
      },
      message: 'Comprobante registrado en la cuenta del cliente. Este registro no consulta ni revalida el CAE ante ARCA.',
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (isUniqueError(error)) return NextResponse.json({ error: 'Ese número de comprobante ya está registrado para la CUIT, ambiente y punto de venta indicados.' }, { status: 409 })
    console.error('[admin/fiscal/invoices] manual assignment failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudo registrar el comprobante.' }, { status: 500 })
  }
}
