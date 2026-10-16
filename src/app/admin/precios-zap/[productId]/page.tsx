import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PricingMatrixEditor from '../PricingMatrixEditor'
import PricingProfitabilityEditor from '../PricingProfitabilityEditor'
import { marginFromMarkup, validateCommercialPricingPolicy } from '@/lib/pricing/commercial-pricing-policy'
import { publishPricingDraft, restorePricingVersion } from '../actions'
import { flattenProviderCostMatrix, type ProviderCostRow } from '@/lib/pricing/pricing-matrix-admin'

export const dynamic = 'force-dynamic'

const FAMILIES: Record<string, string> = {
  'tarjetas-vouchers': 'Tarjetas & Vouchers',
  'flyers-desplegables': 'Flyers & Desplegables',
  'tags-etiquetas': 'Tags & Etiquetas',
  'adhesivos-stickers': 'Adhesivos & Stickers',
  'carpetas-folders': 'Carpetas & Folders',
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
    include: {
      configuratorVersions: { orderBy: { createdAt: 'desc' } },
      quoterConfig: { select: { profitMargin: true } },
    },
  })
  if (!product || !FAMILIES[product.slug]) notFound()

  const versions = product.configuratorVersions
  const active = versions.find((version) => version.status === 'ACTIVE')
  const draft = versions.find((version) => version.status === 'DRAFT')
  const archived = versions.filter((version) => version.status === 'ARCHIVED')
  const pricingActivationEnabled = process.env.PRICING_ZAP_PUBLISH_ENABLED === 'true'
    && process.env.PRICING_ZAP_COMMERCIAL_AUDIT_APPROVED === 'true'
  if (!active || !hasCostMatrix(active.pricing)) notFound()

  const displayVersion = draft ?? active
  const storedPolicy = (displayVersion.pricing as any)?.commercialPricingPolicy
  const legacyMarkupPercent = Number(product.quoterConfig?.profitMargin ?? 150)
  const initialPolicy = storedPolicy
    ? validateCommercialPricingPolicy(storedPolicy)
    : {
        version: 1 as const,
        mode: 'MARGIN' as const,
        percentage: marginFromMarkup(legacyMarkupPercent),
        vatRatePercent: 0,
      }
  const matrix = (displayVersion.pricing as any)?.providerFinishedCostMatrix
  const rows: ProviderCostRow[] = flattenProviderCostMatrix(matrix)
  const activeMatrix = (active.pricing as any)?.providerFinishedCostMatrix
  const activeRows = flattenProviderCostMatrix(activeMatrix)
  const activeByPath = new Map<string, ProviderCostRow>(activeRows.map((row) => [row.path.join('.'), row] as const))
  const changes = draft ? rows.flatMap((row) => {
    const previous = activeByPath.get(row.path.join('.'))
    return previous && previous.value !== row.value
      ? [{ label: row.label, before: previous.value, after: row.value }]
      : []
  }) : []

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
          <Link href="#publish-checklist" className="btn-primary !px-5 !py-3">Revisar para publicar</Link>
        ) : (
          <span className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">Vista de solo lectura</span>
        )}
      </header>

      {draft ? (
        <>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-950">
            Estás editando un borrador. Los cambios guardados acá no afectan el cotizador público. Al publicar, la versión activa anterior se conserva como histórica para poder revertir.
          </div>
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-black text-gray-950">Cambios respecto de la versión activa</h2>
                <p className="mt-1 text-sm text-gray-500">Comparación de costos antes de publicar.</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{changes.length} cambios</span>
            </div>
            {changes.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">Todavía no hay diferencias guardadas frente a la versión activa.</p>
            ) : (
              <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-gray-100">
                <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-3 bg-gray-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500"><span>Celda</span><span>Antes</span><span>Después</span></div>
                {changes.slice(0, 100).map((change) => (
                  <div key={change.label} className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-3 border-t border-gray-100 px-3 py-2 text-xs">
                    <span className="break-words text-gray-700">{change.label}</span>
                    <span className="tabular-nums text-gray-500">{change.before.toLocaleString('es-AR')}</span>
                    <span className="font-bold tabular-nums text-gray-950">{change.after.toLocaleString('es-AR')}</span>
                  </div>
                ))}
                {changes.length > 100 && <p className="border-t border-gray-100 p-3 text-xs text-gray-500">Mostrando 100 de {changes.length} cambios. La matriz completa sigue guardada en el borrador.</p>}
              </div>
            )}
          </section>
          <PricingProfitabilityEditor versionId={draft.id} rows={rows} initialPolicy={initialPolicy} />
          <PricingMatrixEditor versionId={draft.id} rows={rows} />
          <div id="publish-checklist" className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-black text-gray-950">Antes de publicar</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              La publicación y restauración cambian la matriz que consume el cotizador público. La cobertura comercial, la fuente de costos y el tratamiento de IVA/margen todavía requieren aprobación.
            </p>
            {!pricingActivationEnabled ? (
              <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                Publicación bloqueada por seguridad. Requiere dos habilitaciones explícitas del servidor después de aprobar la auditoría comercial.
              </p>
            ) : (
              <form action={publishPricingDraft.bind(null, draft.id)} className="mt-4 space-y-4">
                <label className="flex items-start gap-3 text-sm leading-6 text-gray-700">
                  <input type="checkbox" name="confirmReview" value="yes" required className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                  <span>Confirmo que revisé los costos de proveedor, la cobertura de las combinaciones y el tratamiento de IVA/margen de esta matriz.</span>
                </label>
                <button className="btn-primary">Publicar versión completa</button>
              </form>
            )}
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
                {pricingActivationEnabled ? (
                  <form action={restorePricingVersion.bind(null, version.id)} className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input type="checkbox" name="confirmRestore" value="yes" required className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                      Confirmo reversión
                    </label>
                    <button className="btn-secondary !py-2 !text-xs">Restaurar versión</button>
                  </form>
                ) : (
                  <span className="text-xs text-amber-700">Restauración bloqueada hasta aprobar la auditoría comercial y habilitar el servidor.</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
