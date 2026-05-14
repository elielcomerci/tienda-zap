import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DollarSign, Users, ShoppingCart } from 'lucide-react'

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Hola, {seller.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Resumen de tu actividad y métricas de ventas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Comisiones ganadas</p>
              <p className="text-2xl font-bold text-gray-900">${totalCommission.toLocaleString('es-AR')}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Cartera de clientes</p>
              <p className="text-2xl font-bold text-gray-900">{seller._count.clients}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEF1F6] text-[#ED2C71]">
              <ShoppingCart size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Órdenes generadas</p>
              <p className="text-2xl font-bold text-gray-900">{seller._count.sellerOrders}</p>
            </div>
          </div>
        </div>
      </div>
      
      {seller.sellerProfile && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          Tu porcentaje de comisión base asignado es del <strong className="text-gray-900">{seller.sellerProfile.defaultCommissionRate}%</strong>.
        </div>
      )}
    </div>
  )
}
