import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { createPricingDraft } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Precios ZAP | Administración' }

const FAMILIES = [
  { slug: 'tarjetas-vouchers', name: 'Tarjetas & Vouchers' },
  { slug: 'flyers-desplegables', name: 'Flyers & Desplegables' },
  { slug: 'tags-etiquetas', name: 'Tags & Etiquetas' },
  { slug: 'adhesivos-stickers', name: 'Adhesivos & Stickers' },
  { slug: 'carpetas-folders', name: 'Carpetas & Folders' },
] as const

function hasCostMatrix(pricing: unknown) {
  if (!pricing || typeof pricing !== 'object' || Array.isArray(pricing)) return false
  const matrix = (pricing as Record<string, unknown>).providerFinishedCostMatrix
  return Boolean(matrix && typeof matrix === 'object' && !Array.isArray(matrix))
}

export default async function PricingAdminPage() {
  const products = await prisma.product.findMany({
    where: { slug: { in: FAMILIES.map((family) => family.slug) } },
    select: {
      id: true,
      name: true,
      slug: true,
      configuratorVersions: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, schemaVersion: true, status: true, pricing: true, createdAt: true },
      },
    },
  })
  const bySlug = new Map<string, (typeof products)[number]>(products.map((product) => [product.slug, product] as const))

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Administración · Costos</p>
        <h1 className="text-3xl font-black text-gray-950">Precios ZAP</h1>
        <p className="max-w-3xl text-sm leading-6 text-gray-600">
          Prepará cambios sobre una copia de la matriz activa. Los costos no se publican hasta revisar y confirmar una versión completa.
        </p>
      </header>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Esta primera versión administra matrices de costos de proveedor. No modifica precios históricos, órdenes ni cotizaciones ya emitidas. El cálculo de margen e impuestos sigue separado.
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_180px] gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
          <span>Familia</span><span>Activa</span><span>Borrador</span><span className="text-right">Acción</span>
        </div>
        {FAMILIES.map((family) => {
          const product = bySlug.get(family.slug)
          const versions = product?.configuratorVersions ?? []
          const active = versions.find((version) => version.status === 'ACTIVE')
          const draft = versions.find((version) => version.status === 'DRAFT')
          const matrixReady = Boolean(active && hasCostMatrix(active.pricing))
          return (
            <div key={family.slug} className="grid grid-cols-1 gap-3 border-b border-gray-100 px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_120px_120px_180px] sm:items-center">
              <div>
                <p className="font-bold text-gray-950">{family.name}</p>
                <p className="mt-1 text-xs text-gray-500">{product?.name ?? 'Producto no encontrado'}</p>
              </div>
              <div className="text-sm text-gray-700">
                {active ? <span className="font-semibold">{active.schemaVersion}</span> : <span className="text-amber-700">Sin versión</span>}
              </div>
              <div className="text-sm text-gray-700">
                {draft ? <span className="font-semibold text-orange-700">{draft.schemaVersion}</span> : <span className="text-gray-400">—</span>}
              </div>
              <div className="flex justify-start gap-2 sm:justify-end">
                {product && active && matrixReady ? (
                  <>
                    <Link href={`/admin/precios-zap/${product.id}`} className="btn-secondary !py-2 !text-xs">
                      {draft ? 'Continuar borrador' : 'Ver matriz'}
                    </Link>
                    {!draft && (
                      <form action={createPricingDraft.bind(null, product.id)}>
                        <button className="btn-primary !py-2 !text-xs">Nuevo borrador</button>
                      </form>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-amber-700">Requiere revisión</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs leading-5 text-gray-500">
        Las familias sin una matriz de costos compatible permanecen fuera de edición hasta corregir su fuente. No se completan costos faltantes por estimación.
      </p>
    </div>
  )
}
