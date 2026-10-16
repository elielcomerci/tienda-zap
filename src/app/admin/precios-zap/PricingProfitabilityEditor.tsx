'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveDraftPricingPolicy } from './actions'
import {
  calculateCommercialPrice,
  calculatePriceAtNetAmount,
  markupFromMargin,
  marginFromMarkup,
  type CommercialPricingPolicy,
} from '@/lib/pricing/commercial-pricing-policy'
import type { ProviderCostRow } from '@/lib/pricing/pricing-matrix-admin'

function ars(value: number) {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
}

export default function PricingProfitabilityEditor({
  versionId,
  rows,
  initialPolicy,
}: {
  versionId: string
  rows: ProviderCostRow[]
  initialPolicy: CommercialPricingPolicy
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'MARGIN' | 'MARKUP'>(initialPolicy.mode)
  const [percentage, setPercentage] = useState(String(initialPolicy.percentage))
  const [vatRatePercent, setVatRatePercent] = useState(String(initialPolicy.vatRatePercent))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [manualPrices, setManualPrices] = useState<Record<string, string>>({})

  const parsedPercentage = Number(percentage)
  const parsedVat = Number(vatRatePercent)
  const valid = percentage.trim() !== ''
    && vatRatePercent.trim() !== ''
    && Number.isFinite(parsedPercentage)
    && Number.isFinite(parsedVat)
    && parsedPercentage >= 0
    && parsedPercentage <= 1000
    && (mode !== 'MARGIN' || parsedPercentage < 100)
    && parsedVat >= 0
    && parsedVat <= 100

  const policy = useMemo<CommercialPricingPolicy | null>(() => valid
    ? { version: 1, mode, percentage: parsedPercentage, vatRatePercent: parsedVat }
    : null,
  [valid, mode, parsedPercentage, parsedVat])

  const previews = useMemo(() => {
    if (!policy) return []
    return rows
      .filter((row) => row.label.toLowerCase().includes(search.toLowerCase()))
      .map((row) => {
        const key = row.path.join('.')
        const suggested = calculateCommercialPrice(row.value, policy)
        const rawManual = manualPrices[key]
        const hasInput = rawManual !== undefined && rawManual.trim() !== ''
        const parsedManual = Number(rawManual)
        const manualValid = hasInput && Number.isFinite(parsedManual) && parsedManual >= 0
        return {
          row,
          suggested,
          manualValue: rawManual ?? '',
          manualInvalid: hasInput && !manualValid,
          calculation: manualValid
            ? calculatePriceAtNetAmount(row.value, parsedManual, policy.vatRatePercent)
            : suggested,
        }
      })
  }, [rows, policy, search, manualPrices])

  async function save() {
    if (!policy) {
      setError('Revisá el porcentaje y la tasa de IVA antes de guardar.')
      return
    }
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await saveDraftPricingPolicy(versionId, policy)
      setSaved(true)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar la regla de precios.')
    } finally {
      setSaving(false)
    }
  }

  function changeMode(nextMode: 'MARGIN' | 'MARKUP') {
    if (nextMode === mode) return
    const current = Number(percentage)
    if (Number.isFinite(current) && current >= 0) {
      try {
        const converted = mode === 'MARGIN' ? markupFromMargin(current) : marginFromMarkup(current)
        setPercentage(String(Number(converted.toFixed(4))))
      } catch {
        setPercentage(nextMode === 'MARGIN' ? '35' : '53.8462')
      }
    }
    setMode(nextMode)
    setSaved(false)
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">Reglas del borrador</p>
        <h2 className="mt-1 text-xl font-black text-gray-950">Precio y rentabilidad</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
          Simulación sobre cada costo de proveedor. Los cambios se guardan únicamente en este borrador; el precio público no cambia hasta publicar una versión aprobada.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-sm font-semibold text-gray-700">
          Criterio de cálculo
          <select
            value={mode}
            onChange={(event) => changeMode(event.target.value as 'MARGIN' | 'MARKUP')}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5"
          >
            <option value="MARGIN">Margen sobre venta neta</option>
            <option value="MARKUP">Recargo sobre costo</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          {mode === 'MARGIN' ? 'Margen objetivo (%)' : 'Recargo sobre costo (%)'}
          <input
            type="number"
            min="0"
            max={mode === 'MARGIN' ? '99.99' : '1000'}
            step="0.01"
            value={percentage}
            onChange={(event) => { setPercentage(event.target.value); setSaved(false) }}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 tabular-nums"
          />
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          IVA estimado (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={vatRatePercent}
            onChange={(event) => { setVatRatePercent(event.target.value); setSaved(false) }}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 tabular-nums"
          />
        </label>
      </div>

      <p className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600">
        El costo de proveedor está tratado como neto según la fuente cargada. El IVA se simula por separado y no se interpreta como ganancia. La tasa inicial es 0% hasta que se configure la tasa aplicable a esta familia y se apruebe su tratamiento fiscal.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block sm:w-80">
          <span className="mb-1 block text-xs font-bold text-gray-600">Filtrar referencias</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar formato, cantidad, terminación…"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={!valid || saving}
          onClick={() => void save()}
          className="btn-primary !py-2.5 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar regla en el borrador'}
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {saved && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Regla guardada en el borrador. El cotizador público sigue usando la versión activa.</p>}
      {!valid && <p role="alert" className="text-sm text-red-700">El margen debe ser menor que 100%; el recargo no puede superar 1.000% y el IVA debe estar entre 0 y 100%.</p>}

      <div className="overflow-auto rounded-xl border border-gray-200">
        <table className="min-w-[980px] w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-3 font-bold">Referencia</th>
              <th className="px-3 py-3 text-right font-bold">Costo proveedor</th>
              <th className="px-3 py-3 text-right font-bold">Precio neto manual / sugerido</th>
              <th className="px-3 py-3 text-right font-bold">IVA estimado</th>
              <th className="px-3 py-3 text-right font-bold">Precio final</th>
              <th className="px-3 py-3 text-right font-bold">Resultado bruto</th>
              <th className="px-3 py-3 text-right font-bold">Margen real</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {previews.slice(0, 500).map(({ row, calculation, suggested, manualValue, manualInvalid }) => (
              <tr key={row.path.join('.')}>
                <td className="max-w-[340px] px-3 py-2.5 text-gray-700">{row.label}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{ars(calculation.cost)}</td>
                <td className="min-w-[170px] px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    aria-label={`Precio neto manual para ${row.label}`}
                    value={manualValue}
                    placeholder={suggested.netPrice.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 2 })}
                    onChange={(event) => setManualPrices((current) => ({ ...current, [row.path.join('.')]: event.target.value }))}
                    className={`w-36 rounded-lg border px-2 py-1.5 text-right tabular-nums ${manualInvalid ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {manualInvalid && <p className="mt-1 text-right text-[10px] text-red-700">Importe inválido</p>}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{ars(calculation.vatAmount)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums text-gray-950">{ars(calculation.finalPrice)}</td>
                <td className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums ${calculation.grossProfit < 0 ? 'text-red-700' : 'text-gray-800'}`}>{ars(calculation.grossProfit)}</td>
                <td className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums ${calculation.grossMarginPercent < 0 ? 'text-red-700' : 'text-gray-800'}`}>{calculation.grossMarginPercent.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {previews.length === 0 && <p className="p-4 text-sm text-gray-500">No hay referencias para mostrar con este filtro.</p>}
        {previews.length > 500 && <p className="border-t border-gray-100 p-3 text-xs text-gray-500">Mostrando 500 de {previews.length} referencias. El cálculo usa la política actual del borrador.</p>}
      </div>
      <p className="text-xs leading-5 text-gray-500">
        El precio sugerido responde a la regla guardada. Si escribís un precio neto manual, el resultado y el IVA se recalculan para esa simulación; ese importe manual no se guarda ni cambia el cotizador. El resultado bruto no descuenta comisiones, logística, retenciones, Ingresos Brutos ni gastos operativos.
      </p>
    </section>
  )
}
