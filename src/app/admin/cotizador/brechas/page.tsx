import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CircleOff,
  ClipboardList,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { getAllProductsAdmin } from '@/lib/products'
import { getProductOperationalStatus } from '@/lib/product-operational-status'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Brechas de Costing | ZAP Admin' }

const GROUPS = [
  {
    key: 'BLOCKED',
    title: 'Bloqueados',
    description: 'Activos que no deberian llegar a tienda sin correccion.',
    icon: CircleOff,
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  {
    key: 'ATTENTION',
    title: 'Atencion',
    description: 'Vendibles parcialmente, con variantes o datos incompletos.',
    icon: AlertTriangle,
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    key: 'REVIEW',
    title: 'Revisar costos',
    description: 'Vendibles, pero sin estructura de costos auditable.',
    icon: Search,
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    key: 'READY',
    title: 'Operativos',
    description: 'Con precio, variantes o cotizador listos para venta.',
    icon: ShieldCheck,
    className: 'border-green-200 bg-green-50 text-green-700',
  },
] as const

function actionLabel(pricingMode: string) {
  if (pricingMode === 'Cotizador') return 'Abrir cotizador'
  if (pricingMode === 'Variantes') return 'Editar matriz'
  if (pricingMode === 'Precio fijo') return 'Revisar precio'
  return 'Editar producto'
}

export default async function CostingGapsPage() {
  const products = await getAllProductsAdmin()
  const entries = products.map((product) => ({
    product,
    operationalStatus: getProductOperationalStatus(product),
  }))
  const actionableEntries = entries.filter(({ operationalStatus }) => operationalStatus.severity !== 'INACTIVE')
  const grouped = new Map(
    GROUPS.map((group) => [
      group.key,
      actionableEntries.filter(({ operationalStatus }) => operationalStatus.severity === group.key),
    ])
  )
  const unresolvedCount = actionableEntries.filter(({ operationalStatus }) =>
    ['BLOCKED', 'ATTENTION', 'REVIEW'].includes(operationalStatus.severity)
  ).length

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gray-950 p-6 text-white shadow-xl shadow-gray-950/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/70">
              <ClipboardList size={14} />
              Costing
            </div>
            <h1 className="text-2xl font-black">Brechas de costos</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              Vista operativa para detectar productos bloqueados, matrices incompletas y precios vendibles sin BOM.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-center">
              <p className="text-2xl font-black">{products.length}</p>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">catalogo</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-center">
              <p className="text-2xl font-black">{unresolvedCount}</p>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">brechas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GROUPS.map((group) => {
          const Icon = group.icon
          const items = grouped.get(group.key) || []
          return (
            <a
              key={group.key}
              href={`#${group.key.toLowerCase()}`}
              className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${group.className}`}
            >
              <Icon size={19} />
              <p className="mt-3 text-2xl font-black">{items.length}</p>
              <p className="text-xs font-black uppercase tracking-[0.14em] opacity-75">{group.title}</p>
            </a>
          )
        })}
      </div>

      {GROUPS.map((group) => {
        const items = grouped.get(group.key) || []
        const Icon = group.icon
        return (
          <section key={group.key} id={group.key.toLowerCase()} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${group.className}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-950">{group.title}</h2>
                  <p className="mt-1 text-sm text-gray-500">{group.description}</p>
                </div>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600">
                {items.length} productos
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-sm font-semibold text-gray-400">
                No hay productos en este grupo.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map(({ product, operationalStatus }) => (
                  <div key={product.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.4fr)_180px_minmax(0,1fr)_160px] lg:items-center">
                    <div className="min-w-0">
                      <p className="font-black text-gray-950">{product.name}</p>
                      <p className="mt-1 truncate text-xs font-semibold text-gray-500">
                        /{product.slug} - {product.category.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">Modo</p>
                      <p className="mt-1 text-sm font-bold text-gray-800">{operationalStatus.pricingMode}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{operationalStatus.summary}</p>
                      <p className="mt-1 truncate text-xs text-gray-500" title={operationalStatus.issues.join(' ')}>
                        {operationalStatus.issues[0] || 'Sin brechas detectadas.'}
                      </p>
                    </div>
                    <Link
                      href={`/admin/productos/${product.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-black text-gray-700 transition hover:border-orange-300 hover:text-orange-700"
                    >
                      {actionLabel(operationalStatus.pricingMode)}
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
