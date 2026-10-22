import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const templateSchema = z.object({
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

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'site-settings' },
      select: { fiscalInvoiceTemplate: true },
    })
    const parsed = templateSchema.safeParse(settings?.fiscalInvoiceTemplate ?? defaults)
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
    await prisma.siteSettings.upsert({
      where: { id: 'site-settings' },
      create: { id: 'site-settings', fiscalInvoiceTemplate: parsed.data },
      update: { fiscalInvoiceTemplate: parsed.data },
    })
    return NextResponse.json({ template: parsed.data, saved: true }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[admin/fiscal/template] save failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudo guardar el diseño del comprobante.' }, { status: 500 })
  }
}
