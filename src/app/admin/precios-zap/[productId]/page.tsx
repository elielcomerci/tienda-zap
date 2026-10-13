import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PricingMatrixEditor from '../PricingMatrixEditor'
import { publishPricingDraft, restorePricingVersion } from '../actions'

export const dynamic = 'force-dynamic'

const FAMILIES: Record<string, string> = {
  'tarjetas-vouchers': 'Tarjetas & Vouchers',
  'flyers-desplegables': 'Flyers & Desplegables',
  'tags-etiquetas': 'Tags & Etiquetas',
  'adhesivos-stickers': 'Adhesivos & Stickers',
  'carpetas-folders': 'Carpetas & Folders',
}

type CostRow = { path: string[]; label: string; value: number }

function flattenCostMatrix(value: unknown, path: string[] = [], rows: CostRow[] = []): CostRow[] {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (path.length && !path.includes('paperSurcharges') && !path.includes('surchargePercent')) {
      rows.push({
        path,
        label: path.map((part) => part.replace(/_/g, ' ')).join(' · '),
        value,
      })
    }
    return rows
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenCostMatrix(item, [...path, String(index)], rows))
    return rows
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'paperSurcharges' || key === 'surchargePercent') continue
      flattenCostMatrix(child, [...path, key], rows)
    }
  }
  return rows
}

function hasCostMatrix(pricing: unknown) {
  if (!pricing || typeof pricing !== 'object' || Array.isArray(pricing)) return false
  const matrix = (pricing as Record<string, unknown>).providerFinishedCostMatrix
  return Boolean(matrix && typeof matrix === 'object' && !Array.isArray(matrix))
}

export default async function PricingProductPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { configuratorVersions: { orderBy: { createdAt: 'desc' } } },
  })
  if (!product || !FAMILIES[product.slug]) notFound()

  const versions = product.configuratorVersions
  const active = versions.find((version) => version.status === 'ACTIVE')
  const draft = versions.find((version) => version.status === 'DRAFT')
  const archived = versions.filter((version) => version.status === 'ARCHIVED')
  if (!active || !hasCostMatrix(active.pricing)) notFound()

  const displayVersion = draft ?? active
  const matrix = (displayVersion.pricing as any)?.providerFinishedCostMatrix
  const rows = flattenCostMatrix(matrix, ['providerFinishedCostMatrix'])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/admin/precios-zap" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900">
        ← Volver a Precios ZAP
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Precios ZAP · Matrices</p>
          <h1 className="mt-2 text-3xl font-black text-gray-950">{FAMILIES[product.slug]}</h1>
          <p className="mt-1 text-sm text-gray-500">Versión activa: {active.schemaVersion}{draft ? ` · Borrador: ${draft.schemaVersion}` : ''}</p>
        </div>
        {draft ? (
          <form action={publishPricingDraft.bind(null, draft.id)}>
            <button className="btn-primary !px-5 !py-3">Publicar versión completa</button>
          </form>
        ) : (
          <span className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">Vista de solo lectura</span>
        )}
      </header>

      {draft ? (
        <>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-950">
            Estás editando un borrador. Los cambios guardados acá no afectan el cotizador público. Al publicar, la versión activa anterior se conserva como histórica para poder revertir.
          </div>
          <PricingMatrixEditor versionId={draft.id} rows={rows} />
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-black text-gray-950">Antes de publicar</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              La publicación valida que la matriz tenga estructura y valores numéricos no negativos. La cobertura comercial de cada combinación y el tratamiento de IVA/margen siguen siendo puntos de auditoría; no publiques esta versión hasta confirmar que sus costos son correctos.
            </p>
            <form action={publishPricingDraft.bind(null, draft.id)} className="mt-4">
              <button className="btn-primary" >Publicar versión completa</button>
            </form>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-black text-gray-950">Matriz activa</h2>
          <p className="mt-1 text-sm text-gray-500">Para cambiar costos, volvé al listado y creá un borrador. La versión activa no se edita directamente.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {rows.slice(0, 20).map((row) => (
              <div key={row.path.join('.')} className="flex justify-between gap-4 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                <span className="break-words text-gray-600">{row.label}</span>
                <span className="shrink-0 font-bold tabular-nums text-gray-900">{row.value.toLocaleString('es-AR')}</span>
              </div>
            ))}
          </div>
          {rows.length > 20 && <p className="mt-3 text-xs text-gray-500">Vista previa de 20 de {rows.length} importes.</p>}
        </div>
      )}

      {archived.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-5">
            <h2 className="font-black text-gray-950">Versiones anteriores</h2>
            <p className="mt-1 text-sm text-gray-500">Restaurar una versión vuelve a activarla y archiva la actual.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {archived.map((version) => (
              <div key={version.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Versión {version.schemaVersion}</p>
                  <p className="text-xs text-gray-500">Creada {version.createdAt.toLocaleDateString('es-AR')}</p>
                </div>
                <form action={restorePricingVersion.bind(null, version.id)}>
                  <button className="btn-secondary !py-2 !text-xs">Restaurar versión</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
