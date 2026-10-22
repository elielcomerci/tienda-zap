import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: 'Iniciá sesión para continuar.' }, { status: 401 })
  }

  const requestedAccountId = request.nextUrl.searchParams.get('accountId')
  const isAdmin = session.user.role === 'ADMIN'
  if (isAdmin && !requestedAccountId) {
    return NextResponse.json({ error: 'Seleccioná una cuenta de cliente.' }, { status: 422 })
  }

  const account = await prisma.fiscalClientAccount.findFirst({
    where: isAdmin ? { id: requestedAccountId! } : { userId: session.user.id },
    select: {
      id: true, userId: true, tenantName: true, tenantSlug: true, status: true, notes: true,
      createdAt: true, updatedAt: true,
      user: { select: { name: true, email: true, phone: true, documentId: true } },
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true, environment: true, cuit: true, pointOfSale: true, voucherType: true,
          voucherNumber: true, result: true, cae: true, caeExpiresAt: true, amount: true,
          currency: true, jobId: true, invoicePdfUrl: true, createdAt: true,
        },
      },
    },
  })

  if (!account || account.status !== 'ACTIVE') {
    return NextResponse.json({ account: null, invoices: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  return NextResponse.json({
    account: {
      id: account.id, userId: account.userId, tenantName: account.tenantName,
      tenantSlug: account.tenantSlug, status: account.status, notes: account.notes,
      createdAt: account.createdAt.toISOString(), updatedAt: account.updatedAt.toISOString(),
      customer: account.user,
    },
    invoices: account.invoices.map(invoice => ({
      ...invoice,
      amount: invoice.amount?.toString() ?? null,
      caeExpiresAt: invoice.caeExpiresAt?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
    })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
