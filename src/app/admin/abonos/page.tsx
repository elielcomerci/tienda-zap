import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentCommissionPeriod } from '@/lib/seller-commissions'
import { redirect } from 'next/navigation'
import AbonosClient from './AbonosClient'

export const dynamic = 'force-dynamic'

export default async function AdminAbonosPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

  const period = getCurrentCommissionPeriod()
  const [clients, sellers, subscriptions] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      take: 500,
    }),
    prisma.user.findMany({
      where: {
        role: { in: ['SELLER', 'ADMIN'] },
        sellerProfile: { isNot: null },
      },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    }),
    prisma.sellerRecurringSubscription.findMany({
      include: {
        client: { select: { id: true, name: true, email: true } },
        portfolioSeller: { select: { id: true, name: true, email: true } },
        operationalSeller: { select: { id: true, name: true, email: true } },
        commissions: {
          where: { period },
          select: { status: true, amount: true, period: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Abonos recurrentes</h1>
        <p className="mt-2 text-sm text-gray-500">
          Gestiona abonos mensuales, cartera titular y heredero operativo para comisiones recurrentes.
        </p>
      </div>

      <AbonosClient
        clients={clients}
        sellers={sellers}
        subscriptions={subscriptions}
        period={period}
      />
    </div>
  )
}
