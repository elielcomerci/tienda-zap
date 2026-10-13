'use client'

import { useState } from 'react'
import { saveDraftCostCell } from './actions'

type CostRow = { path: string[]; label: string; value: number }

export default function PricingMatrixEditor({ versionId, rows }: { versionId: string; rows: CostRow[] }) {
  const [search, setSearch] = useState('')
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [savingPath, setSavingPath] = useState<string | null>(null)
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visibleRows = rows.filter((row) => row.label.toLowerCase().includes(search.toLowerCase()))
  const keyFor = (row: CostRow) => row.path.join('.')

  async function save(row: CostRow) {
    const key = keyFor(row)
    const rawValue = edits[key] ?? String(row.value)
    const value = Number(rawValue)
    if (rawValue.trim() === '' || !Number.isFinite(value) || value < 0) {
      setError('Ingresá un importe válido, igual o mayor que cero.')
      return
    }

    setSavingPath(key)
    setError(null)
    setSavedPath(null)
    try {
      await saveDraftCostCell(versionId, row.path, value)
      setEdits((current) => ({ ...current, [key]: String(value) }))
      setSavedPath(key)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar el cambio.')
    } finally {
      setSavingPath(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-950">Matriz de costos</h2>
          <p className="mt-1 text-sm text-gray-500">{rows.length} importes disponibles en esta versión.</p>
        </div>
        <label className="block sm:w-80">
          <span className="mb-1 block text-xs font-bold text-gray-600">Buscar en la matriz</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cantidad, formato, papel, terminación…"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </label>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {savedPath && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Costo guardado en el borrador. Todavía no está publicado.</p>}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_130px_90px] gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
          <span>Referencia de la matriz</span><span>ARS</span><span />
        </div>
        <div className="divide-y divide-gray-100">
          {visibleRows.slice(0, 500).map((row) => {
            const key = keyFor(row)
            const isSaving = savingPath === key
            return (
              <div key={key} className="grid grid-cols-[minmax(0,1fr)_130px_90px] items-center gap-3 px-4 py-3">
                <p className="break-words text-xs leading-5 text-gray-700">{row.label}</p>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  aria-label={`Costo ARS: ${row.label}`}
                  value={edits[key] ?? String(row.value)}
                  onChange={(event) => setEdits((current) => ({ ...current, [key]: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-2 py-2 text-right text-sm tabular-nums outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
                <button
                  type="button"
                  disabled={isSaving || (edits[key] ?? String(row.value)) === String(row.value)}
                  onClick={() => save(row)}
                  className="rounded-lg border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSaving ? 'Guardando' : 'Guardar'}
                </button>
              </div>
            )
          })}
        </div>
        {visibleRows.length === 0 && <p className="p-8 text-center text-sm text-gray-500">No encontramos coincidencias.</p>}
        {visibleRows.length > 500 && <p className="border-t border-gray-100 p-3 text-center text-xs text-gray-500">Mostrando 500 resultados. Afiná la búsqueda para ver otras celdas.</p>}
      </div>
      <p className="text-xs leading-5 text-gray-500">Los cambios se guardan de a una celda dentro del borrador. El precio público no cambia hasta que publiques la versión.</p>
    </section>
  )
}
