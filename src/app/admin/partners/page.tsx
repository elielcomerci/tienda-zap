import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, CheckCircle2, XCircle, ShoppingBag, AlertTriangle, CircleDot } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Partners kiosco24 | ZAP Admin' }

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') redirect('/login')
}

async function getPartners() {
  return prisma.partnerAccount.findMany({
    include: {
      orders: {
        select: {
          id: true,
          total: true,
          status: true,
          paymentType: true,
          createdAt: true,
          zapCreditPlan: {
            select: { status: true, installments: true, totalRepayable: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

type Partner = Awaited<ReturnType<typeof getPartners>>[number]

function statusBadge(active: boolean) {
  return active
    ? <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Activo</span>
    : <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-800 px-2 py-0.5 rounded-full"><XCircle size={11} /> Inactivo</span>
}

function orderStatusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: 'bg-orange-100 text-orange-800',
    PAID: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    DELIVERED: 'bg-gray-100 text-gray-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    READY: 'bg-purple-100 text-purple-800',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

function PartnerCard({ partner }: { partner: Partner }) {
  const totalOrders = partner.orders.length
  const totalSpent = partner.orders.reduce((s, o) => s + o.total, 0)
  const creditOrders = partner.orders.filter(o => o.paymentType === 'ZAP_CREDIT')
  const hasR2Notes = partner.orders.some(o => o.status === 'PENDING')

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          {partner.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partner.logoUrl}
              alt={partner.kiosco24BranchName}
              className="w-12 h-12 rounded-xl object-cover border border-gray-100"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-black"
              style={{ background: partner.primaryColor ?? '#f97316' }}
            >
              {partner.kiosco24BranchName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-bold text-gray-900">{partner.kiosco24BranchName}</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{partner.kiosco24BranchId.slice(0, 12)}…</p>
            {partner.kiosco24OwnerEmail && (
              <p className="text-xs text-gray-500 mt-0.5">{partner.kiosco24OwnerEmail}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {statusBadge(partner.active)}
          <p className="text-xs text-gray-400">
            Alta: {new Date(partner.createdAt).toLocaleDateString('es-AR')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-5 py-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Órdenes</p>
          <p className="text-xl font-black text-gray-900">{totalOrders}</p>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Total facturado</p>
          <p className="text-xl font-black text-gray-900">
            ${totalSpent.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="text-xs text-gray-400 font-medium">En crédito</p>
          <p className="text-xl font-black text-gray-900">{creditOrders.length}</p>
        </div>
      </div>

      {/* Flags */}
      <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 flex-wrap">
        {hasR2Notes && (
          <span className="flex items-center gap-1 text-orange-600 font-semibold">
            <AlertTriangle size={12} /> Tiene órdenes pendientes
          </span>
        )}
        <span className="flex items-center gap-1">
          <CircleDot size={11} style={{ color: partner.primaryColor ?? '#f97316' }} />
          Color: {partner.primaryColor ?? 'default'}
        </span>
        <span className="font-mono text-gray-300">
          key: {partner.kiosco24AccessKey.slice(0, 8)}…
        </span>
      </div>

      {/* Últimas órdenes */}
      {partner.orders.length > 0 && (
        <div className="p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Últimas órdenes
          </p>
          <div className="space-y-2">
            {partner.orders.map(order => (
              <div key={order.id} className="flex items-center justify-between text-sm">
                <Link
                  href={`/admin/ordenes/${order.id}`}
                  className="font-mono font-bold text-orange-500 hover:underline"
                >
                  #{order.id.slice(-6).toUpperCase()}
                </Link>
                <div className="flex items-center gap-3">
                  {orderStatusBadge(order.status)}
                  <span className="text-gray-400 text-xs">
                    {new Date(order.createdAt).toLocaleDateString('es-AR')}
                  </span>
                  <span className="font-semibold text-gray-700">
                    ${order.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </span>
                  {order.zapCreditPlan && (
                    <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-1.5 py-0.5 rounded">
                      {order.zapCreditPlan.installments}c
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default async function PartnersAdminPage() {
  await requireAdmin()
  const partners = await getPartners()

  const totalActive = partners.filter(p => p.active).length
  const totalOrders = partners.reduce((s, p) => s + p.orders.length, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners kiosco24</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sucursales de kiosco24 que usan servicios de ZAP Tienda
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <p className="font-black text-gray-900 text-xl">{totalActive}</p>
            <p className="text-gray-400">activos</p>
          </div>
          <div className="text-center">
            <p className="font-black text-gray-900 text-xl">{totalOrders}</p>
            <p className="text-gray-400">órdenes</p>
          </div>
        </div>
      </div>

      {partners.length === 0 ? (
        <div className="card p-16 text-center">
          <Building2 size={40} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Ningún kiosco vinculado aún
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Cuando un kiosco use <strong>Imprimir en ZAP Premium</strong> por primera vez,
            aparecerá aquí automáticamente.
          </p>
          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-left text-xs font-mono text-gray-400 max-w-sm mx-auto">
            <p className="font-semibold text-gray-600 mb-1">Test con curl:</p>
            <p>curl -H &quot;Authorization: Bearer &lt;accessKey&gt;&quot; \</p>
            <p className="ml-2">/api/partner/products</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {partners.map(partner => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>
      )}

      {/* Endpoints de referencia */}
      <div className="mt-10 card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag size={16} className="text-gray-400" />
          <h2 className="text-sm font-bold text-gray-700">Endpoints disponibles para partners</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { method: 'GET',  path: '/api/partner/products',      desc: 'Catálogo de servicios de impresión' },
            { method: 'POST', path: '/api/partner/financing',     desc: 'Simulación de crédito ZAP' },
            { method: 'POST', path: '/api/partner/coupons/push',  desc: 'Subir PDF de cupones a R2' },
            { method: 'GET',  path: '/api/partner/cashflow',      desc: 'Estado crediticio de la sucursal' },
          ].map(ep => (
            <div key={ep.path} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm">
              <span className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded shrink-0 ${
                ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {ep.method}
              </span>
              <div>
                <p className="font-mono text-gray-700 text-xs">{ep.path}</p>
                <p className="text-gray-400 text-xs mt-0.5">{ep.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Auth: <code className="bg-gray-100 px-1 rounded">Authorization: Bearer &lt;Branch.accessKey&gt;</code>
        </p>
      </div>
    </div>
  )
}
