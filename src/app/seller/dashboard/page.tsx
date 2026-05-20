import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Clock, DollarSign, Gift, Phone, Target, Users } from 'lucide-react'
import ReferralCard from '@/components/seller/ReferralCard'
import { buildWhatsappUrl } from '@/lib/whatsapp'
import {
  getEffectiveCommissionRate,
  getNextSellerRank,
  getSellerRankConfig,
} from '@/lib/seller-commissions'

export default async function SellerDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const seller = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      sellerProfile: true,
      _count: {
        select: { clients: true, sellerOrders: true, sellerLeads: true },
      },
    },
  })

  if (!seller || (seller.role !== 'SELLER' && seller.role !== 'ADMIN')) redirect('/')

  if (!seller.sellerProfile?.active && seller.role !== 'ADMIN') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-orange-500">
          <Clock size={40} />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Cuenta en revisión</h1>
        <p className="max-w-md text-gray-500">
          Hemos recibido tu solicitud para unirte como vendedor. Nuestro equipo la está revisando y pronto nos pondremos en contacto con vos para activarla.
        </p>
      </div>
    )
  }

  const commissionLedgers = await prisma.sellerCommissionLedger.groupBy({
    by: ['status', 'type'],
    where: {
      sellerId: seller.id,
      status: { not: 'CANCELLED' },
    },
    _sum: { amount: true },
  })
  const commissionByStatus = new Map<string, number>()
  const commissionByType = new Map<string, number>()
  for (const ledger of commissionLedgers) {
    const amount = ledger._sum.amount || 0
    commissionByStatus.set(ledger.status, (commissionByStatus.get(ledger.status) || 0) + amount)
    commissionByType.set(ledger.type, (commissionByType.get(ledger.type) || 0) + amount)
  }
  const pendingCommission = commissionByStatus.get('PENDING') || 0
  const availableCommission = commissionByStatus.get('AVAILABLE') || 0
  const totalCommission =
    pendingCommission +
    availableCommission +
    (commissionByStatus.get('PAID_OUT') || 0)

  const completedIncentives = await prisma.sellerIncentiveProgress.findMany({
    where: {
      sellerId: seller.id,
      completed: true,
    },
    include: { incentive: true },
  })
  const totalBonuses = completedIncentives.reduce(
    (acc, curr) =>
      acc + (curr.incentive.rewardType === 'FIXED_BONUS' ? curr.incentive.rewardAmount : 0),
    0
  )
  const totalEarned = totalCommission + totalBonuses

  const payouts = await prisma.sellerPayout.aggregate({
    where: { sellerId: seller.id },
    _sum: { amount: true },
  })
  const totalPaid = payouts._sum.amount || 0
  const availableBalance = availableCommission + totalBonuses - totalPaid

  const rank = seller.sellerProfile
    ? getSellerRankConfig(seller.sellerProfile.rank)
    : getSellerRankConfig('BRONZE')
  const nextRank = getNextSellerRank(seller.sellerProfile?.rank)
  const effectiveCommissionRate = seller.sellerProfile
    ? getEffectiveCommissionRate(seller.sellerProfile)
    : rank.commissionRate
  const recurringBase = await prisma.sellerRecurringSubscription.aggregate({
    where: {
      portfolioSellerId: seller.id,
      status: 'ACTIVE',
    },
    _sum: { monthlyAmount: true },
  })
  const guaranteedFloor = ((recurringBase._sum.monthlyAmount || 0) * effectiveCommissionRate) / 100
  const nextRankProgress =
    nextRank && seller.sellerProfile
      ? Math.min(100, Math.round((seller.sellerProfile.lifetimeNetRevenue / nextRank.threshold) * 100))
      : 100
  const commissionTypeRows = [
    { key: 'STORE', label: 'Tienda online' },
    { key: 'MANUAL', label: 'Ventas manuales' },
    { key: 'RECURRING', label: 'Abonos recurrentes' },
    { key: 'ROYALTY', label: 'Regalias' },
  ].map((row) => ({
    ...row,
    amount: commissionByType.get(row.key) || 0,
  }))

  const withdrawUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    `Hola ZAP, soy ${seller.name} y quiero solicitar el retiro de mis $${availableBalance.toLocaleString('es-AR')} disponibles.`
  )

  const now = new Date()
  const activeIncentives = await prisma.sellerIncentive.findMany({
    where: {
      active: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      sellerProgress: {
        where: { sellerId: seller.id },
      },
    },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Hola, {seller.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Resumen de tu actividad, métricas y ganancias.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col justify-between rounded-2xl border-2 border-orange-200 bg-orange-50 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
              <DollarSign size={20} />
            </div>
            <p className="text-sm font-semibold text-orange-900">Saldo disponible</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-3xl font-black text-orange-600">${availableBalance.toLocaleString('es-AR')}</p>
            {availableBalance > 0 && withdrawUrl && (
              <a
                href={withdrawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-100"
              >
                <Phone size={14} /> Retirar
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Piso asegurado próximo mes
            </p>
            <p className="text-3xl font-black text-emerald-700">${guaranteedFloor.toLocaleString('es-AR')}</p>
          </div>
          <p className="mt-2 text-xs text-emerald-800">
            Solo cuenta abonos activos confirmados.
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Total histórico</p>
            <p className="text-xl font-bold text-gray-900">${totalEarned.toLocaleString('es-AR')}</p>
          </div>
          <div className="mt-2 flex gap-2 text-xs text-gray-500">
            <span>Comisiones: ${totalCommission.toLocaleString('es-AR')}</span>
            <span>|</span>
            <span>Bonos: ${totalBonuses.toLocaleString('es-AR')}</span>
          </div>
          {pendingCommission > 0 && (
            <p className="mt-2 text-xs font-semibold text-blue-600">
              Pendiente de entrega: ${pendingCommission.toLocaleString('es-AR')}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Clientes</p>
            <p className="text-xl font-bold text-gray-900">{seller._count.clients}</p>
            <p className="mt-1 text-xs text-gray-500">{seller._count.sellerLeads} prospectos</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <Users size={20} />
          </div>
        </div>
      </div>

      <ReferralCard sellerId={seller.id} sellerName={seller.name!} />

      {activeIncentives.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Target className="text-[#ED2C71]" /> Desafíos activos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeIncentives.map((incentive) => {
              const progress = incentive.sellerProgress[0]?.currentValue || 0
              const percentage = Math.min(100, Math.round((progress / incentive.goalTarget) * 100))
              const isCompleted = incentive.sellerProgress[0]?.completed || percentage >= 100

              return (
                <div
                  key={incentive.id}
                  className={`relative overflow-hidden rounded-2xl border p-6 transition-all ${
                    isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white shadow-sm'
                  }`}
                >
                  {isCompleted && (
                    <div className="absolute right-0 top-0 rounded-bl-xl bg-green-500 px-3 py-1 text-xs font-bold text-white">
                      Completado
                    </div>
                  )}

                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold leading-tight text-gray-900">{incentive.title}</h3>
                      {incentive.description && <p className="mt-1 text-sm text-gray-500">{incentive.description}</p>}
                    </div>
                    {incentive.rewardType === 'FIXED_BONUS' && (
                      <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#FEF1F6] px-3 py-1.5 text-sm font-bold text-[#ED2C71]">
                        <Gift size={16} /> +${incentive.rewardAmount.toLocaleString('es-AR')}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className={isCompleted ? 'text-green-700' : 'text-gray-600'}>
                        {incentive.goalType === 'SALES_COUNT'
                          ? `${progress} de ${incentive.goalTarget} ventas`
                          : `$${progress.toLocaleString('es-AR')} de $${incentive.goalTarget.toLocaleString('es-AR')}`}
                      </span>
                      <span className={isCompleted ? 'text-green-700' : 'text-[#ED2C71]'}>{percentage}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isCompleted ? 'bg-green-500' : 'bg-[#ED2C71]'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-right text-xs text-gray-400">
                      Válido hasta el {new Date(incentive.endDate).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {seller.sellerProfile && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-gray-900">Rango {rank.label}</p>
              <p className="mt-1">
                Comisión vigente: <strong className="text-gray-900">{effectiveCommissionRate}%</strong>.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Facturación histórica neta
              </p>
              <p className="font-bold text-gray-900">
                ${seller.sellerProfile.lifetimeNetRevenue.toLocaleString('es-AR')}
              </p>
            </div>
          </div>
          {nextRank && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs font-semibold text-gray-500">
                <span>Progreso a {nextRank.label}</span>
                <span>{nextRankProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-[#ED2C71]" style={{ width: `${nextRankProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Detalle de ingresos</h2>
          <p className="mt-1 text-sm text-gray-500">Separacion por origen de comision y regalias.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {commissionTypeRows.map((row) => (
            <div key={row.key} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{row.label}</p>
              <p className="mt-2 text-lg font-bold text-gray-900">${row.amount.toLocaleString('es-AR')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
