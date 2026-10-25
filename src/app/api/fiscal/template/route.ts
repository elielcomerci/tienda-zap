import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount } from '@/lib/fiscal-account-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const defaults = {
  legalName: '',
  issuerCuit: '',
  ivaCondition: '',
  grossIncomeRegistration: '',
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
      template: accountTemplate?.template ?? defaultTemplate?.template ?? defaults,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[fiscal/template] read failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudo cargar la plantilla fiscal.' }, { status: 500 })
  }
}
