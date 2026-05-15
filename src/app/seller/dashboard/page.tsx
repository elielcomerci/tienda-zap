import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DollarSign, Users, ShoppingCart, Target, Gift, Clock, Phone } from 'lucide-react'
import Link from 'next/link'
import ReferralCard from '@/components/seller/ReferralCard'

export default async function SellerDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const seller = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      sellerProfile: true,
      _count: {
        select: { clients: true, sellerOrders: true },
      },
    },
  })

  if (!seller || (seller.role !== 'SELLER' && seller.role !== 'ADMIN')) redirect('/')

  // PENDING APPROVAL STATE
  if (!seller.sellerProfile?.active && seller.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-6">
          <Clock size={40} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Cuenta en Revisión</h1>
        <p className="text-gray-500 max-w-md">
          Hemos recibido tu solicitud para unirte como vendedor. Nuestro equipo la está revisando y pronto nos pondremos en contacto con vos para activarla.
        </p>
      </div>
    )
  }

  // Aggregate commissions
  const commissions = await prisma.order.aggregate({
    where: { 
      sellerId: seller.id,
      status: { in: ['PAID', 'DELIVERED'] }
    },
    _sum: {
      commissionAmount: true,
    },
  })

  const totalCommission = commissions._sum.commissionAmount || 0

  // Aggregate bonuses from completed incentives
  const completedIncentives = await prisma.sellerIncentiveProgress.findMany({
    where: {
      sellerId: seller.id,
      completed: true,
    },
    include: {
      incentive: true,
    }
  })

  const totalBonuses = completedIncentives.reduce((acc, curr) => acc + (curr.incentive.rewardType === 'FIXED_BONUS' ? curr.incentive.rewardAmount : 0), 0)
  const totalEarned = totalCommission + totalBonuses

  // Aggregate payouts (withdrawals)
  const payouts = await prisma.sellerPayout.aggregate({
    where: { sellerId: seller.id },
    _sum: { amount: true }
  })
  
  const totalPaid = payouts._sum.amount || 0
  const availableBalance = totalEarned - totalPaid
  // Fetch active incentives progress
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
      }
    }
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
        {/* Available Balance */}
        <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
              <DollarSign size={20} />
            </div>
            <p className="text-sm font-semibold text-orange-900">Saldo Disponible</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black text-orange-600">${availableBalance.toLocaleString('es-AR')}</p>
            {availableBalance > 0 && (
              <a 
                href={`https://wa.me/5491100000000?text=${encodeURIComponent(`Hola ZAP, soy ${seller.name} y quiero solicitar el retiro de mis $${availableBalance.toLocaleString('es-AR')} disponibles.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold bg-white text-orange-600 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors border border-orange-200"
              >
                <Phone size={14} /> Retirar
              </a>
            )}
          </div>
        </div>

        {/* Total Paid (Withdrawn) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Dinero Retirado</p>
            <p className="text-xl font-bold text-gray-400">${totalPaid.toLocaleString('es-AR')}</p>
          </div>
        </div>

        {/* Total Earned (Historic) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Total Histórico</p>
            <p className="text-xl font-bold text-gray-900">${totalEarned.toLocaleString('es-AR')}</p>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex gap-2">
            <span>Comisiones: ${totalCommission.toLocaleString('es-AR')}</span>
            <span>|</span>
            <span>Bonos: ${totalBonuses.toLocaleString('es-AR')}</span>
          </div>
        </div>

        {/* Clients */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Clientes</p>
            <p className="text-xl font-bold text-gray-900">{seller._count.clients}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <Users size={20} />
          </div>
        </div>
      </div>

      <ReferralCard sellerId={seller.id} sellerName={seller.name!} />

      {/* Active Incentives / Challenges */}
      {activeIncentives.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="text-[#ED2C71]" /> Desafíos Activos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeIncentives.map((incentive) => {
              const progress = incentive.sellerProgress[0]?.currentValue || 0
              const percentage = Math.min(100, Math.round((progress / incentive.goalTarget) * 100))
              const isCompleted = incentive.sellerProgress[0]?.completed || percentage >= 100

              return (
                <div key={incentive.id} className={`relative overflow-hidden rounded-2xl border p-6 transition-all ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 shadow-sm'}`}>
                  {isCompleted && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                      ¡Completado!
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">{incentive.title}</h3>
                      {incentive.description && <p className="text-sm text-gray-500 mt-1">{incentive.description}</p>}
                    </div>
                    {incentive.rewardType === 'FIXED_BONUS' && (
                      <div className="flex items-center gap-1.5 bg-[#FEF1F6] text-[#ED2C71] px-3 py-1.5 rounded-xl font-bold text-sm shrink-0">
                        <Gift size={16} /> +${incentive.rewardAmount.toLocaleString('es-AR')}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mt-6">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className={isCompleted ? 'text-green-700' : 'text-gray-600'}>
                        {incentive.goalType === 'SALES_COUNT' ? `${progress} de ${incentive.goalTarget} ventas` : `$${progress.toLocaleString('es-AR')} de $${incentive.goalTarget.toLocaleString('es-AR')}`}
                      </span>
                      <span className={isCompleted ? 'text-green-700' : 'text-[#ED2C71]'}>{percentage}%</span>
                    </div>
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-green-500' : 'bg-[#ED2C71]'}`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-right">
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
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600 text-center">
          Tu porcentaje de comisión base asignado es del <strong className="text-gray-900">{seller.sellerProfile.defaultCommissionRate}%</strong>.
        </div>
      )}
    </div>
  )
}
