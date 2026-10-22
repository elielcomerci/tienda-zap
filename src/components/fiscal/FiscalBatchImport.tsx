'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, LoaderCircle, ShieldCheck, UploadCloud } from 'lucide-react'

type Contributor = {
  id: string
  cuit: string
  environment: 'TEST' | 'PROD'
  authorizationStatus: string
  permissions: Record<string, boolean> | null
  razonSocial: string | null
}

type RowInput = {
  externalId: string
  cuit: string
  environment: 'TEST' | 'PROD'
  pointOfSale: string
  type: 'A' | 'B' | 'C' | 'M'
  concept: string
  date: string
  customerDocType: string
  customerDocNumber: string
  customerName: string
  vatCondition: string
  description: string
  netAmount: string
  vatRate: string
  serviceFrom: string
  serviceTo: string
  paymentDueDate: string
}

type EmissionRequest = {
  externalId: string
  idempotencyKey: string
  contributor: { cuit: string; pointOfSale: number; environment: 'TEST' | 'PROD' }
  voucher: { type: 'A' | 'B' | 'C' | 'M'; concept: number; date: string; serviceFrom?: string; serviceTo?: string; paymentDueDate?: string }
  amounts: { total: number; net: number; vat: number; exempt: number; nonTaxable: number; vatBreakdown?: Array<{ rate: number; base: number; amount: number }> }
  items: Array<{ description: string; quantity: number; unitPrice: number; discountAmount: number; netAmount: number; vatRate: number | null; vatAmount: number; exemptAmount: number; nonTaxableAmount: number; totalAmount: number }>
  customer: { docType: number; docNumber: string; name?: string; vatCondition?: number }
}

type BatchRow = {
  line: number
  input: RowInput
  request?: EmissionRequest
  state: 'pending' | 'valid' | 'invalid' | 'submitted' | 'uncertain' | 'failed'
  message?: string
  jobId?: string
}

type Props = {
  api: (path: string) => string
  contributors: Contributor[]
  onComplete: () => void
}

const HEADERS = [
  'externalId', 'cuit', 'environment', 'pointOfSale', 'type', 'concept', 'date',
  'customerDocType', 'customerDocNumber', 'customerName', 'vatCondition',
  'description', 'netAmount', 'vatRate', 'serviceFrom', 'serviceTo', 'paymentDueDate',
]

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const dateToArca = (value: string) => value.replace(/-/g, '')
const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)

function parseInputRow(values: string[], line: number): BatchRow {
  const input = Object.fromEntries(HEADERS.map((header, index) => [header, (values[index] || '').trim()])) as unknown as RowInput
  const validEnvironment = input.environment === 'TEST' || input.environment === 'PROD'
  const validType = ['A', 'B', 'C', 'M'].includes(input.type)
  const validConcept = ['1', '2', '3'].includes(input.concept)
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(input.date) && !Number.isNaN(new Date(`${input.date}T00:00:00.000Z`).getTime())
  const net = Number(input.netAmount)
  const rate = input.type === 'C' ? 0 : Number(input.vatRate)
  let message = ''
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(input.externalId)) message = 'externalId es obligatorio: usá de 1 a 80 letras, números, guiones o guiones bajos.'
  else if (!/^\d{11}$/.test(input.cuit)) message = 'CUIT emisora: deben ser 11 dígitos.'
  else if (!validEnvironment) message = 'environment debe ser TEST o PROD.'
  else if (!Number.isInteger(Number(input.pointOfSale)) || Number(input.pointOfSale) < 1) message = 'Punto de venta inválido.'
  else if (!validType) message = 'Tipo admitido: A, B, C o M.'
  else if (!validConcept) message = 'Concepto admitido: 1 productos, 2 servicios o 3 mixto.'
  else if (!validDate) message = 'Fecha inválida: usá AAAA-MM-DD.'
  else if (!Number.isFinite(net) || net <= 0 || !/^\d+(\.\d{1,2})?$/.test(input.netAmount)) message = 'netAmount debe ser un importe positivo con punto decimal y hasta 2 decimales.'
  else if (input.type !== 'C' && ![0, 2.5, 5, 10.5, 21, 27].includes(rate)) message = 'Alícuota IVA no admitida.'
  else if (!input.description || input.description.length > 250 || /[\t\r\n]/.test(input.description)) message = 'La descripción es obligatoria y debe ocupar una sola celda (máximo 250 caracteres).'
  else if (!['80', '86', '87', '96', '99'].includes(input.customerDocType)) message = 'Tipo de documento del receptor inválido.'
  else if (input.customerDocType === '99' && input.customerDocNumber !== '0') message = 'Para consumidor final, customerDocNumber debe ser 0.'
  else if (input.customerDocType !== '99' && !/^\d+$/.test(input.customerDocNumber)) message = 'Completá el documento del receptor con números.'
  else if ((input.type === 'A' || input.type === 'M') && input.customerDocType !== '80') message = 'Factura A y M requieren CUIT del receptor.'
  else if (!/^\d+$/.test(input.vatCondition) || Number(input.vatCondition) < 1) message = 'Completá vatCondition con un código fiscal válido.'
  else if (input.concept !== '1' && (![input.serviceFrom, input.serviceTo, input.paymentDueDate].every(value => /^\d{4}-\d{2}-\d{2}$/.test(value)))) message = 'Servicios y concepto mixto requieren serviceFrom, serviceTo y paymentDueDate.'
  else if (input.externalId.startsWith('REEMPLAZAR')) message = 'Reemplazá el externalId de ejemplo antes de validar.'
  return { line, input, state: message ? 'invalid' : 'pending', ...(message ? { message } : {}) }
}

function toRequest(row: RowInput): EmissionRequest {
  const net = Number(row.netAmount)
  const rate = row.type === 'C' ? 0 : Number(row.vatRate)
  const vat = row.type === 'C' ? 0 : roundMoney(net * rate / 100)
  const total = roundMoney(net + vat)
  const item = {
    description: row.description.trim(),
    quantity: 1,
    unitPrice: total,
    discountAmount: 0,
    netAmount: net,
    vatRate: row.type === 'C' ? null : rate,
    vatAmount: vat,
    exemptAmount: 0,
    nonTaxableAmount: 0,
    totalAmount: total,
  }
  return {
    externalId: row.externalId,
    // Stable across browser retries/re-uploads. Worker rejects reuse with changed fiscal data.
    idempotencyKey: `zap-batch-${row.externalId}`,
    contributor: { cuit: row.cuit, pointOfSale: Number(row.pointOfSale), environment: row.environment },
    voucher: {
      type: row.type,
      concept: Number(row.concept),
      date: dateToArca(row.date),
      ...(row.concept !== '1' ? {
        serviceFrom: dateToArca(row.serviceFrom),
        serviceTo: dateToArca(row.serviceTo),
        paymentDueDate: dateToArca(row.paymentDueDate),
      } : {}),
    },
    amounts: {
      total, net, vat, exempt: 0, nonTaxable: 0,
      ...(row.type !== 'C' ? { vatBreakdown: [{ rate, base: net, amount: vat }] } : {}),
    },
    items: [item],
    customer: {
      docType: Number(row.customerDocType),
      docNumber: row.customerDocType === '99' ? '0' : row.customerDocNumber,
      ...(row.customerName ? { name: row.customerName } : {}),
      vatCondition: Number(row.vatCondition),
    },
  }
}

export default function FiscalBatchImport({ api, contributors, onComplete }: Props) {
  const [rows, setRows] = useState<BatchRow[]>([])
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [stage, setStage] = useState<'empty' | 'loaded' | 'validated' | 'processing' | 'partial' | 'complete'>('empty')

  function downloadTemplate() {
    const example = [
      'REEMPLAZAR-001', '', 'TEST', '1', 'B', '1', new Date().toISOString().slice(0, 10),
      '99', '0', 'Consumidor final', '5', 'Descripción de ejemplo', '1000.00', '21', '', '', '',
    ]
    const content = [HEADERS, example].map(row => row.join('\t')).join('\r\n')
    const blob = new Blob(['\uFEFF', content], { type: 'text/tab-separated-values;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'plantilla-facturacion-zap.tsv'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(''); setNotice(''); setRows([]); setStage('empty')
    if (file.size > 1024 * 1024) {
      setError('El archivo supera 1 MB. Dividí el lote en archivos más pequeños.')
      event.target.value = ''
      return
    }
    try {
      const text = await file.text()
      const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim().length > 0)
      if (lines.length < 2) throw new Error('El archivo necesita encabezados y al menos una fila.')
      if (lines.length > 51) throw new Error('Esta primera versión admite hasta 50 comprobantes por lote.')
      const headers = lines[0].split('\t').map(value => value.trim())
      if (headers.length !== HEADERS.length || HEADERS.some((header, index) => headers[index] !== header)) {
        throw new Error('Los encabezados no coinciden con la plantilla ZAP. Descargá una plantilla nueva y no cambies los nombres ni el orden de las columnas.')
      }
      const parsed = lines.slice(1).map((line, index) => parseInputRow(line.split('\t'), index + 2))
      const ids = new Set<string>()
      const withDuplicates = parsed.map(row => {
        if (ids.has(row.input.externalId)) return { ...row, state: 'invalid' as const, message: 'externalId duplicado dentro del archivo.' }
        ids.add(row.input.externalId)
        return row
      })
      setRows(withDuplicates)
      setFileName(file.name)
      setStage('loaded')
      setNotice(`Archivo leído: ${withDuplicates.length} fila(s). Todavía no se validó ni emitió nada.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo leer el archivo.')
    } finally {
      event.target.value = ''
    }
  }

  async function validateBatch() {
    setBusy(true); setError(''); setNotice('')
    const next: BatchRow[] = []
    const ids = new Set<string>()
    for (const original of rows) {
      let row: BatchRow = { ...original, request: undefined }
      if (ids.has(row.input.externalId)) {
        next.push({ ...row, state: 'invalid', message: 'externalId duplicado dentro del lote.' })
        continue
      }
      ids.add(row.input.externalId)
      if (row.state === 'invalid' || !row.input.externalId) {
        next.push({ ...row, state: 'invalid', message: row.message || 'Fila inválida.' })
        continue
      }
      const contributor = contributors.find(item => item.cuit === row.input.cuit && item.environment === row.input.environment)
      if (!contributor) {
        next.push({ ...row, state: 'invalid', message: 'La CUIT no está vinculada en ese ambiente.' })
        continue
      }
      if (contributor.authorizationStatus !== 'ACTIVE' || contributor.permissions?.canEmit !== true) {
        next.push({ ...row, state: 'invalid', message: `La CUIT no tiene permiso activo para emitir (${contributor.authorizationStatus}).` })
        continue
      }
      const request = toRequest(row.input)
      try {
        const response = await fetch(api('/api/fiscal/invoices/emit?dryRun=true'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
        })
        const payload = await response.json()
        if (!response.ok || payload.valid !== true) {
          next.push({ ...row, state: 'invalid', message: payload.error?.message || payload.error || payload.message || 'El Worker no validó esta fila.' })
        } else {
          next.push({ ...row, request, state: 'valid', message: 'Payload validado; el punto de venta aún debe confirmarse al emitir.' })
        }
      } catch {
        next.push({ ...row, state: 'invalid', message: 'No se pudo completar la validación remota. Volvé a validar el lote.' })
      }
    }
    const duplicates = new Set<string>()
    const finalRows = next.map(row => {
      if (duplicates.has(row.input.externalId)) return { ...row, state: 'invalid' as const, message: 'externalId duplicado dentro del lote.' }
      duplicates.add(row.input.externalId)
      return row
    })
    setRows(finalRows)
    const invalid = finalRows.filter(row => row.state === 'invalid').length
    setStage(invalid ? 'loaded' : 'validated')
    setNotice(invalid ? `Validación terminada: ${invalid} fila(s) con errores. No se puede emitir el lote hasta corregirlas.` : `Las ${finalRows.length} filas pasaron la validación de payload. No se emitió nada.`)
    setBusy(false)
  }

  async function submitBatch() {
    if (rows.some(row => row.state !== 'valid' && row.state !== 'submitted' && row.state !== 'uncertain')) return
    setBusy(true); setError(''); setNotice('')
    setStage('processing')
    let submitted = 0
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]
      if (row.state === 'submitted') { submitted++; continue }
      if (!row.request) {
        setError(`Fila ${row.line}: falta el payload validado. Volvé a validar el archivo.`)
        setStage('partial'); setBusy(false); return
      }
      try {
        const response = await fetch(api('/api/fiscal/invoices/emit'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row.request),
        })
        const payload = await response.json().catch(() => ({}))
        if (payload.jobId) {
          const updated = rows.map((item, rowIndex) => rowIndex === index
            ? { ...item, state: 'submitted' as const, jobId: String(payload.jobId), message: response.ok ? `Trabajo creado: ${payload.status || 'PENDING'}.` : 'El trabajo existe, pero hubo un problema al guardar su proyección. Consultá el estado antes de repetir.' }
            : item)
          setRows(updated)
          submitted++
          if (!response.ok) {
            setError(`Fila ${row.line}: el Worker creó el trabajo ${payload.jobId}, pero Tienda ZAP informó un problema de registro. El lote se detuvo para evitar avanzar sin confirmar el registro.`)
            setStage('partial'); setBusy(false); onComplete(); return
          }
        } else if (!response.ok) {
          setRows(current => current.map((item, rowIndex) => rowIndex === index ? { ...item, state: 'failed', message: payload.error?.message || payload.error || 'El Worker rechazó la emisión.' } : item))
          setError(`Fila ${row.line}: ${payload.error?.message || payload.error || 'el Worker rechazó la emisión'}. El lote se detuvo; las filas siguientes no se enviaron.`)
          setStage('partial'); setBusy(false); onComplete(); return
        } else {
          setRows(current => current.map((item, rowIndex) => rowIndex === index ? { ...item, state: 'submitted', jobId: String(payload.jobId || ''), message: 'Solicitud recibida.' } : item))
          submitted++
        }
      } catch {
        setRows(current => current.map((item, rowIndex) => rowIndex === index ? { ...item, state: 'uncertain', message: 'Respuesta de red incierta. Reintentá con la misma referencia externa; la clave idempotente se conserva.' } : item))
        setError(`Fila ${row.line}: no se pudo confirmar la respuesta. El lote se detuvo; al reintentar se reutilizará la misma clave idempotente.`)
        setStage('partial'); setBusy(false); onComplete(); return
      }
    }
    setStage('complete')
    setNotice(`Lote enviado: ${submitted} comprobante(s) con trabajo registrado. La autorización final de ARCA debe consultarse en el panel de comprobantes.`)
    setBusy(false)
    onComplete()
  }

  const validCount = rows.filter(row => row.state === 'valid' || row.state === 'submitted' || row.state === 'uncertain').length
  const invalidCount = rows.filter(row => row.state === 'invalid' || row.state === 'failed').length

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <FileSpreadsheet size={20} className="mt-0.5 text-gray-500" />
          <div><h2 className="font-semibold text-gray-900">Facturación por lote</h2><p className="mt-1 max-w-3xl text-sm leading-5 text-gray-500">Plantilla tabulada compatible con Excel. Cada fila representa un comprobante con un único ítem. La validación no emite; la emisión se confirma en un paso separado.</p></div>
        </div>
        <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700"><Download size={15} /> Descargar plantilla</button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="block text-sm font-medium text-gray-700">Archivo TSV exportado desde Excel
          <input type="file" accept=".tsv,.txt,text/tab-separated-values" onChange={event => void loadFile(event)} disabled={busy} className="mt-1 block w-full rounded-xl border border-gray-200 p-2 text-sm font-normal" />
        </label>
        {rows.length > 0 && <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void validateBatch()} disabled={busy || stage === 'processing'} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Validar lote</button>
          <button type="button" onClick={() => void submitBatch()} disabled={busy || !['validated', 'partial'].includes(stage) || invalidCount > 0 || validCount === 0} className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Procesando…' : stage === 'partial' ? 'Reanudar lote' : 'Confirmar emisión del lote'}</button>
        </div>}
      </div>
      {fileName && <p className="mt-2 text-xs text-gray-500">Archivo: {fileName} · {rows.length} fila(s) · máximo 50 comprobantes por lote.</p>}
      {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{notice}</div>}
      {rows.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500"><th className="pb-2 pr-3">Fila</th><th className="pb-2 pr-3">Referencia</th><th className="pb-2 pr-3">CUIT / ambiente</th><th className="pb-2 pr-3">Tipo</th><th className="pb-2 pr-3">Importe estimado</th><th className="pb-2 pr-3">Estado</th><th className="pb-2">Detalle</th></tr></thead><tbody>{rows.map(row => {
        const net = Number(row.input.netAmount || 0)
        const rate = row.input.type === 'C' ? 0 : Number(row.input.vatRate || 0)
        const total = roundMoney(net + roundMoney(net * rate / 100))
        return <tr key={`${row.line}-${row.input.externalId}`} className="border-b border-gray-100 align-top"><td className="py-3 pr-3">{row.line}</td><td className="py-3 pr-3 font-mono text-xs">{row.input.externalId || '—'}</td><td className="py-3 pr-3"><span className="font-mono text-xs">{row.input.cuit}</span><br />{row.input.environment}</td><td className="py-3 pr-3">{row.input.type}</td><td className="py-3 pr-3">{Number.isFinite(total) ? money(total) : '—'}</td><td className="py-3 pr-3">{row.state === 'valid' ? 'Validada' : row.state === 'submitted' ? 'Trabajo creado' : row.state === 'uncertain' ? 'Respuesta incierta' : row.state === 'failed' ? 'Rechazada' : row.state === 'invalid' ? 'Error' : 'Pendiente'}{row.jobId && <p className="mt-1 break-all font-mono text-[10px] text-gray-500">{row.jobId}</p>}</td><td className="py-3 text-xs leading-5 text-gray-600">{row.message || 'Pendiente de validación'}</td></tr>
      })}</tbody></table></div>}
      <p className="mt-3 text-xs leading-5 text-gray-500">Las claves idempotentes se derivan de externalId para permitir reintentos seguros si se vuelve a cargar el mismo archivo. No cambies externalId al corregir o reintentar una fila ya enviada. Los puntos de venta se verifican al emitir, no en la validación previa. No cargues credenciales ni datos bancarios en esta plantilla.</p>
    </section>
  )
}
