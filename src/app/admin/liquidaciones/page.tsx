import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import PayoutsTable from './PayoutsTable'

export const dynamic = 'force-dynamic'

export default async function AdminLiquidacionesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

  const sellersDb = await prisma.user.findMany({
    where: {
      role: { in: ['SELLER', 'ADMIN'] },
      sellerProfile: { isNot: null },
    },
    include: {
      sellerCommissionLedgers: {
        where: { status: { in: ['AVAILABLE', 'PAID_OUT'] } },
        select: { amount: true, status: true, type: true },
      },
      sellerPayouts: {
        select: { amount: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const sellers = sellersDb.map((seller) => {
    const availableCommissions = seller.sellerCommissionLedgers
      .filter((ledger) => ledger.status === 'AVAILABLE')
      .reduce((acc, ledger) => acc + ledger.amount, 0)
    const totalPaid = seller.sellerPayouts.reduce((acc, payout) => acc + payout.amount, 0)
    const paidCommissions = seller.sellerCommissionLedgers
      .filter((ledger) => ledger.status === 'PAID_OUT')
      .reduce((acc, ledger) => acc + ledger.amount, 0)

    return {
      id: seller.id,
      name: seller.name,
      email: seller.email,
      totalEarned: availableCommissions + paidCommissions,
      totalPaid: Math.max(totalPaid, paidCommissions),
      breakdown: {
        store: seller.sellerCommissionLedgers
          .filter((ledger) => ledger.status === 'AVAILABLE' && ledger.type === 'STORE')
          .reduce((acc, ledger) => acc + ledger.amount, 0),
        manual: seller.sellerCommissionLedgers
          .filter((ledger) => ledger.status === 'AVAILABLE' && ledger.type === 'MANUAL')
          .reduce((acc, ledger) => acc + ledger.amount, 0),
        recurring: seller.sellerCommissionLedgers
          .filter((ledger) => ledger.status === 'AVAILABLE' && ledger.type === 'RECURRING')
          .reduce((acc, ledger) => acc + ledger.amount, 0),
        royalty: seller.sellerCommissionLedgers
          .filter((ledger) => ledger.status === 'AVAILABLE' && ledger.type === 'ROYALTY')
          .reduce((acc, ledger) => acc + ledger.amount, 0),
      },
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Liquidaciones a Asesores</h1>
        <p className="mt-1 text-sm text-gray-500">
          Controla la billetera de tus asesores y registra los pagos realizados para descontar de sus saldos.
        </p>
      </div>

      <PayoutsTable sellers={sellers} />
    </div>
  )
}
