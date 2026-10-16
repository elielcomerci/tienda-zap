'use client'

import { useMemo, useState } from 'react'
import { importDraftCostRows, saveDraftCostCell } from './actions'

type CostRow = { path: string[]; label: string; value: number }
type ImportRow = { path: string[]; label: string; before: number; value: number }
type ImportPreview = { fileName: string; rows: ImportRow[]; unchangedCount: number }

function csvEscape(value: string | number) {
  const text = String(value)
  return /[",;\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
}

function parseCsvRecords(input: string, delimiter: ',' | ';'): string[][] {
  const records: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true
    } else if (char === delimiter) {
      row.push(field.trim())
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1
      row.push(field.trim())
      if (row.some((cell) => cell !== '')) records.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (quoted) throw new Error('El CSV tiene comillas sin cerrar.')
  row.push(field.trim())
  if (row.some((cell) => cell !== '')) records.push(row)
  return records
}

function detectDelimiter(header: string): ',' | ';' {
  const count = (delimiter: string) => header.split(delimiter).length - 1
  return count(';') > count(',') ? ';' : ','
}

function parseCost(raw: string, delimiter: ',' | ';'): number {
  let normalized = raw.trim().replace(/[\s$]/g, '')
  if (delimiter === ';' && normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  }
  const value = Number(normalized)
  if (!normalized || !Number.isFinite(value) || value < 0) {
    throw new Error(`El importe "${raw}" no es un número válido igual o mayor que cero.`)
  }
  return value
}

export default function PricingMatrixEditor({ versionId, rows }: { versionId: string; rows: CostRow[] }) {
  const [search, setSearch] = useState('')
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [savingPath, setSavingPath] = useState<string | null>(null)
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const visibleRows = rows.filter((row) => row.label.toLowerCase().includes(search.toLowerCase()))
  const keyFor = (row: CostRow) => row.path.join('.')
  const rowByPath = useMemo(() => new Map(rows.map((row) => [keyFor(row), row])), [rows])

  function downloadTemplate() {
    const lines = [['path', 'label', 'current_cost', 'new_cost'].map(csvEscape).join(',')]
    for (const row of rows) {
      lines.push([
        csvEscape(keyFor(row)),
        csvEscape(row.label),
        csvEscape(row.value),
        '',
      ].join(','))
    }
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `precios-zap-${versionId}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function readImport(file: File | undefined) {
    setError(null)
    setImportMessage(null)
    setImportPreview(null)
    if (!file) return
    if (file.size > 1024 * 1024) {
      setError('El archivo supera 1 MB. Dividilo en listas más pequeñas.')
      return
    }
    try {
      const text = await file.text()
      const delimiter = detectDelimiter(text.split(/\r?\n/, 1)[0] || '')
      const records = parseCsvRecords(text.replace(/^\uFEFF/, ''), delimiter)
      if (records.length < 2) throw new Error('El archivo no contiene filas para importar.')
      const headers = records[0].map((header) => header.trim().toLowerCase())
      const pathIndex = headers.indexOf('path')
      const valueIndex = headers.indexOf('new_cost')
      if (pathIndex < 0 || valueIndex < 0) {
        throw new Error('Usá la plantilla de Precios ZAP: debe incluir las columnas path y new_cost.')
      }
      const seen = new Set<string>()
      const preview: ImportRow[] = []
      let unchangedCount = 0
      for (let i = 1; i < records.length; i += 1) {
        const record = records[i]
        const pathValue = record[pathIndex]?.trim()
        const rawValue = record[valueIndex]?.trim()
        if (!pathValue || !rawValue) continue
        const existing = rowByPath.get(pathValue)
        if (!existing) throw new Error(`Fila ${i + 1}: la referencia "${pathValue}" no pertenece a esta matriz. No se importó nada.`)
        if (seen.has(pathValue)) throw new Error(`Fila ${i + 1}: la referencia "${pathValue}" está duplicada.`)
        seen.add(pathValue)
        const value = parseCost(rawValue, delimiter)
        if (value === existing.value) {
          unchangedCount += 1
        } else {
          preview.push({ path: existing.path, label: existing.label, before: existing.value, value })
        }
        if (preview.length + unchangedCount > 5000) throw new Error('La importación supera el límite de 5.000 filas.')
      }
      if (preview.length === 0 && unchangedCount === 0) throw new Error('No hay importes en la columna new_cost para importar.')
      setImportPreview({ fileName: file.name, rows: preview, unchangedCount })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos leer el CSV.')
    }
  }

  async function commitImport() {
    if (!importPreview || importPreview.rows.length === 0) return
    setImporting(true)
    setError(null)
    setImportMessage(null)
    try {
      const result = await importDraftCostRows(
        versionId,
        importPreview.rows.map((row) => ({ path: row.path, value: row.value })),
        importPreview.fileName,
      )
      setImportMessage(result.message)
      setImportPreview(null)
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar la importación.')
    } finally {
      setImporting(false)
    }
  }

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
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-black text-gray-950">Actualizar una lista completa</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-700">
              Descargá la plantilla, completá la columna <strong>new_cost</strong> solo para los importes que quieras actualizar y volvé a cargar el CSV. Las filas vacías se ignoran; los valores idénticos no se vuelven a guardar.
            </p>
          </div>
          <button type="button" onClick={downloadTemplate} className="btn-secondary shrink-0 !py-2 !text-xs">
            Descargar plantilla CSV
          </button>
        </div>
        <label className="mt-4 block text-sm font-semibold text-gray-700">
          Archivo CSV actualizado
          <input
            type="file"
            accept=".csv,text/csv"
            className="mt-2 block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm"
            onChange={(event) => void readImport(event.target.files?.[0])}
          />
        </label>
        <p className="mt-2 text-xs leading-5 text-gray-600">
          Para evitar asignaciones incorrectas, el archivo debe conservar las referencias <code>path</code> de la plantilla. Se aceptan separadores coma o punto y coma; con punto y coma se admiten importes argentinos como 12.500,50.
        </p>
        {importPreview && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-gray-950">Vista previa: {importPreview.fileName}</p>
                <p className="mt-1 text-sm text-gray-600">{importPreview.rows.length} cambios · {importPreview.unchangedCount} importes sin cambios</p>
              </div>
              <button type="button" disabled={importing || importPreview.rows.length === 0} onClick={() => void commitImport()} className="btn-primary !py-2 !text-xs disabled:opacity-50">
                {importing ? 'Guardando…' : 'Guardar cambios del borrador'}
              </button>
            </div>
            {importPreview.rows.length > 0 ? (
              <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-gray-100">
                <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-2 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500"><span>Referencia</span><span>Antes</span><span>Nuevo</span></div>
                {importPreview.rows.slice(0, 200).map((row) => (
                  <div key={keyFor(row)} className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-2 border-t border-gray-100 px-3 py-2 text-xs">
                    <span className="break-words text-gray-700">{row.label}</span>
                    <span className="text-right tabular-nums text-gray-500">{row.before.toLocaleString('es-AR')}</span>
                    <span className="text-right font-bold tabular-nums text-gray-950">{row.value.toLocaleString('es-AR')}</span>
                  </div>
                ))}
                {importPreview.rows.length > 200 && <p className="border-t border-gray-100 p-3 text-xs text-gray-500">Se muestran 200 de {importPreview.rows.length} cambios; todos se validaron.</p>}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-600">No hay diferencias para guardar.</p>
            )}
          </div>
        )}
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {importMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{importMessage}</p>}
      {savedPath && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Costo guardado en el borrador. Todavía no está publicado.</p>}

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
      <p className="text-xs leading-5 text-gray-500">Los costos se guardan en una versión borrador persistida y auditable. La matriz activa y los precios públicos no cambian hasta una publicación autorizada.</p>
    </section>
  )
}
