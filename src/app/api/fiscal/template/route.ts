import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount } from '@/lib/fiscal-account-access'
import { DEFAULT_FISCAL_INVOICE_TEMPLATE, fiscalInvoiceTemplateSchema } from '@/lib/fiscal-invoice-template'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response

  try {
    const [accountTemplate, defaultTemplate] = await Promise.all([
      prisma.fiscalInvoiceTemplate.findUnique({
        where: { accountId: access.account.id },
        select: { template: true },
      }),
      prisma.fiscalInvoiceTemplate.findUnique({
        where: { id: 'default' },
        select: { template: true },
      }),
    ])

    return NextResponse.json({
      template: accountTemplate?.template ?? defaultTemplate?.template ?? DEFAULT_FISCAL_INVOICE_TEMPLATE,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[fiscal/template] read failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudo cargar la plantilla fiscal.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response

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
    await prisma.fiscalInvoiceTemplate.upsert({
      where: { accountId: access.account.id },
      create: { accountId: access.account.id, template: parsed.data },
      update: { template: parsed.data },
    })
    return NextResponse.json({ template: parsed.data, saved: true }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[fiscal/template] save failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudo guardar el diseño del comprobante.' }, { status: 500 })
  }
}
