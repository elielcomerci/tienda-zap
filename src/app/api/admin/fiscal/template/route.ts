import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const templateSchema = z.object({
  legalName: z.string().trim().max(180).default(''),
  issuerCuit: z.string().trim().regex(/^(|\d{11})$/).default(''),
  ivaCondition: z.string().trim().max(100).default(''),
  startActivity: z.string().trim().max(10).default(''),
  taxAddress: z.string().trim().max(180).default(''),
  commercialName: z.string().trim().max(120).default(''),
  address: z.string().trim().max(180).default(''),
  locality: z.string().trim().max(100).default(''),
  province: z.string().trim().max(100).default(''),
  phone: z.string().trim().max(40).default(''),
  whatsapp: z.string().trim().max(40).default(''),
  website: z.string().trim().max(200).default(''),
  logoUrl: z.string().trim().max(500).refine(value => !value || value.startsWith('https://media.zap.com.ar/'), 'El logo debe estar alojado en media.zap.com.ar.').default(''),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ed164f'),
  showWebsite: z.boolean().default(true),
  showWhatsapp: z.boolean().default(true),
  footerText: z.string().trim().max(180).default('Gracias por elegirnos.'),
})

const defaults = {
  legalName: '',
  issuerCuit: '',
  ivaCondition: '',
  startActivity: '',
  taxAddress: '',
  commercialName: '',
  address: '',
  locality: '',
  province: '',
  phone: '',
  whatsapp: '',
  website: '',
  logoUrl: '',
  primaryColor: '#ed164f',
  showWebsite: true,
  showWhatsapp: true,
  footerText: 'Gracias por elegirnos.',
}

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
    const parsed = templateSchema.safeParse(settings?.template ?? defaults)
    return NextResponse.json({ template: parsed.success ? parsed.data : defaults }, {
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

  const parsed = templateSchema.safeParse(body)
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
