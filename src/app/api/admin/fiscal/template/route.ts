import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_FISCAL_INVOICE_TEMPLATE, fiscalInvoiceTemplateSchema } from '@/lib/fiscal-invoice-template'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return null
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const accountId = new URL(request.url).searchParams.get('accountId')
    if (accountId && !await prisma.fiscalClientAccount.findUnique({ where: { id: accountId }, select: { id: true } })) {
      return NextResponse.json({ error: 'No se encontró la cuenta fiscal.' }, { status: 404 })
    }
    const settings = accountId
      ? await prisma.fiscalInvoiceTemplate.findUnique({ where: { accountId }, select: { template: true } })
      : await prisma.fiscalInvoiceTemplate.findUnique({ where: { id: 'default' }, select: { template: true } })
    const parsed = fiscalInvoiceTemplateSchema.safeParse(settings?.template ?? DEFAULT_FISCAL_INVOICE_TEMPLATE)
    return NextResponse.json({ template: parsed.success ? parsed.data : DEFAULT_FISCAL_INVOICE_TEMPLATE }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[admin/fiscal/template] read failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudo cargar el diseño del comprobante.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'El body debe ser JSON válido.' }, { status: 400 })
  }

  const parsed = fiscalInvoiceTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Revisá los campos del diseño.',
      details: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
    }, { status: 422 })
  }

  try {
    const accountId = new URL(request.url).searchParams.get('accountId')
    if (accountId && !await prisma.fiscalClientAccount.findUnique({ where: { id: accountId }, select: { id: true } })) {
      return NextResponse.json({ error: 'No se encontró la cuenta fiscal.' }, { status: 404 })
    }
    if (accountId) {
      await prisma.fiscalInvoiceTemplate.upsert({
        where: { accountId },
        create: { accountId, template: parsed.data },
        update: { template: parsed.data },
      })
    } else {
      await prisma.fiscalInvoiceTemplate.upsert({
        where: { id: 'default' },
        create: { id: 'default', template: parsed.data },
        update: { template: parsed.data },
      })
    }
    return NextResponse.json({ template: parsed.data, saved: true }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[admin/fiscal/template] save failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudo guardar el diseño del comprobante.' }, { status: 500 })
  }
}
