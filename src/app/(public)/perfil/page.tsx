import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { updateProfile } from '@/lib/actions/auth'
import { signOut } from '@/auth'
import Link from 'next/link'
import { User, Package, LogOut, ChevronRight, Wallet, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mi perfil — ZAP Tienda' }

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  PROCESSING: 'En producción',
  READY: 'Listo para retirar',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}
const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  READY: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [user, orders, creditsCount, overdueCreditsCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: { select: { name: true } } } } },
    }),
    prisma.zapCreditPlan.count({
      where: {
        order: { userId: session.user.id },
      },
    }),
    prisma.zapCreditInstallment.count({
      where: {
        dueDate: { lt: new Date() },
        status: { in: ['PENDING', 'REJECTED'] },
        plan: {
          status: { in: ['APPROVED', 'ACTIVE'] },
          order: { userId: session.user.id },
        },
      },
    }),
  ])

  if (!user) redirect('/login')
  const { saved, error } = await searchParams

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi cuenta</h1>
        <form action={async () => {
          'use server'
          await signOut({ redirectTo: '/' })
        }}>
          <button type="submit" className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </form>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Edit form */}
        <div className="md:col-span-2">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                <User size={24} className="text-orange-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{user.name || 'Sin nombre'}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            {saved && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-xl">
                ✓ Perfil actualizado correctamente
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">
                {decodeURIComponent(error)}
              </div>
            )}

            <form action={updateProfile} className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input name="name" defaultValue={user.name || ''} required className="input" />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input name="phone" defaultValue={user.phone || ''} className="input" placeholder="1134567890" />
              </div>
              <hr className="border-gray-100" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cambiar contraseña</p>
              <div>
                <label className="label">Contraseña actual</label>
                <input name="currentPassword" type="password" className="input" placeholder="••••••••" />
              </div>
              <div>
                <label className="label">Nueva contraseña</label>
                <input name="newPassword" type="password" className="input" placeholder="Mínimo 6 caracteres" />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">
                Guardar cambios
              </button>
            </form>
          </div>
        </div>

        {/* Orders */}
        <div className="md:col-span-3">
          <Link
            href="/perfil/creditos"
            className="card mb-4 flex items-center gap-4 p-4 transition-all hover:border-orange-200 hover:shadow-sm group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
              <Wallet size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-gray-900">Mis creditos</h2>
                {overdueCreditsCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                    <AlertTriangle size={12} /> {overdueCreditsCount} vencida/s
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {creditsCount} credito/s registrados. Entra para ver cuotas, pagos y comprobantes.
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-gray-300 transition-colors group-hover:text-orange-400" />
          </Link>

          <div className="flex items-center gap-2 mb-4">
            <Package size={20} className="text-orange-500" />
            <h2 className="font-bold text-gray-900">Mis pedidos</h2>
            <span className="ml-auto text-sm text-gray-400">{orders.length} pedidos</span>
          </div>

          {orders.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <Package size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="font-medium">Todavía no tenés pedidos</p>
              <Link href="/productos" className="mt-3 inline-block text-sm text-orange-500 hover:underline">
                Ver productos
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/perfil/ordenes/${order.id}`}
                  className="card p-4 flex items-center gap-4 hover:border-orange-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[order.status]}`}>
                        {statusLabel[order.status]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {order.items.map((i) => i.product.name).join(', ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900">${order.total.toLocaleString('es-AR')}</p>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-400 transition-colors ml-auto mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
