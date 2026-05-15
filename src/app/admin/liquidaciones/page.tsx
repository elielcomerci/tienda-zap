import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import PayoutsTable from './PayoutsTable'

export const dynamic = 'force-dynamic'

export default async function AdminLiquidacionesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

  // Fetch all sellers with their orders, incentive progress, and payouts
  const sellersDb = await prisma.user.findMany({
    where: {
      role: { in: ['SELLER', 'ADMIN'] },
      sellerProfile: { isNot: null }
    },
    include: {
      sellerOrders: {
        where: { status: { in: ['PAID', 'DELIVERED'] } },
        select: { commissionAmount: true }
      },
      incentiveProgress: {
        where: { completed: true },
        include: { incentive: { select: { rewardAmount: true } } }
      },
      sellerPayouts: {
        select: { amount: true }
      }
    },
    orderBy: { name: 'asc' }
  })

  const sellers = sellersDb.map((s) => {
    const totalCommissions = s.sellerOrders.reduce((acc, order) => acc + (order.commissionAmount || 0), 0)
    const totalBonuses = s.incentiveProgress.reduce((acc, progress) => acc + (progress.incentive?.rewardAmount || 0), 0)
    const totalEarned = totalCommissions + totalBonuses
    const totalPaid = s.sellerPayouts.reduce((acc, payout) => acc + payout.amount, 0)

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      totalEarned,
      totalPaid,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Liquidaciones a Vendedores</h1>
        <p className="mt-1 text-sm text-gray-500">
          Controlá la billetera de tus vendedores y registrá los pagos realizados para descontar de sus saldos.
        </p>
      </div>

      <PayoutsTable sellers={sellers} />
    </div>
  )
}
