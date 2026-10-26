'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, LoaderCircle, ShieldCheck, UploadCloud } from 'lucide-react'
import type { FiscalPdfInvoice } from '@/lib/fiscal-invoice-pdf'
import { parseFiscalPdfInvoice } from '@/lib/fiscal-invoice-print-schema'

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
  id?: string
  line: number
  input: RowInput
  request?: EmissionRequest
  state: 'pending' | 'valid' | 'invalid' | 'submitted' | 'uncertain' | 'failed' | 'rejected'
  message?: string
  jobId?: string
  printInvoice?: FiscalPdfInvoice
}

type SavedBatch = { id: string; sourceName: string | null; status: string; rowCount: number; createdAt: string }

type Props = {
  api: (path: string) => string
  contributors: Contributor[]
  onComplete: () => void
  onPrintBatch: (invoices: FiscalPdfInvoice[]) => void
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getAuthorizedPrintInvoice(item: unknown): FiscalPdfInvoice | undefined {
  if (!isRecord(item)) return undefined
  const batchItem = item
  if (batchItem.status !== 'AUTHORIZED') return undefined
  const invoice = parseFiscalPdfInvoice(batchItem.invoiceRecord)
  if (!invoice || !['A', 'DONE'].includes(String(invoice.result)) || !invoice.cae || !invoice.voucherNumber) return undefined
  return invoice
}

export default function FiscalBatchImport({ api, contributors, onComplete, onPrintBatch }: Props) {
  const [rows, setRows] = useState<BatchRow[]>([])
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [stage, setStage] = useState<'empty' | 'loaded' | 'validated' | 'processing' | 'partial' | 'complete'>('empty')
  const [batchId, setBatchId] = useState('')
  const [savedBatches, setSavedBatches] = useState<SavedBatch[]>([])

  async function refreshSavedBatches() {
    try {
      const response = await fetch(api('/api/fiscal/batches'), { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (response.ok && Array.isArray(payload.batches)) setSavedBatches(payload.batches)
    } catch {
      setError('No se pudo actualizar el historial de lotes.')
    }
  }

  async function openSavedBatch(id: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(api(`/api/fiscal/batches/${encodeURIComponent(id)}`), { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.batch || !Array.isArray(payload.batch.items)) throw new Error(payload.error || 'No se pudo recuperar el lote.')
      const pendingJobs = payload.batch.items.filter((item: { status: string; jobId: string | null }) => item.status === 'PROCESSING' && item.jobId)
      for (const item of pendingJobs) {
        await fetch(api(`/api/nodo/jobs/${encodeURIComponent(item.jobId)}`), { cache: 'no-store' }).catch(() => null)
      }
      const refreshed = pendingJobs.length > 0
        ? await fetch(api(`/api/fiscal/batches/${encodeURIComponent(id)}`), { cache: 'no-store' }).then(result => result.ok ? result.json() : payload).catch(() => payload)
        : payload
      const batch = refreshed.batch || payload.batch
      const restored = batch.items.map((item: { id: string; rowNumber: number; input: RowInput; requestPayload: EmissionRequest | null; status: string; errorMessage: string | null; jobId: string | null; invoiceRecord?: unknown }) => ({
        id: item.id,
        line: item.rowNumber,
        input: item.input,
        request: item.requestPayload ?? undefined,
        jobId: item.jobId ?? undefined,
        printInvoice: getAuthorizedPrintInvoice(item),
        message: item.errorMessage ?? undefined,
        state: item.status === 'READY' ? 'valid' as const : item.status === 'PROCESSING' || item.status === 'AUTHORIZED' ? 'submitted' as const : item.status === 'UNKNOWN' ? 'uncertain' as const : item.status === 'REJECTED' ? 'rejected' as const : item.status === 'INVALID' ? 'invalid' as const : 'pending' as const,
      }))
      setRows(restored)
      setBatchId(id)
      setFileName(batch.sourceName || '')
      setStage(restored.some(row => row.state === 'valid' || row.state === 'uncertain') ? 'partial' : restored.some(row => row.state === 'submitted') ? 'complete' : 'loaded')
      setNotice(`Lote recuperado: ${restored.length} comprobante(s), en el orden original.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo recuperar el lote.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void refreshSavedBatches() }, [api])

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
    setError(''); setNotice(''); setRows([]); setStage('empty'); setBatchId('')
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
      if (original.state === 'invalid' || !row.input.externalId) {
        next.push({ ...row, state: 'invalid', message: original.message || 'Fila inválida.' })
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
        const response = await fetch(api('/api/nodo/invoices/emit?dryRun=true'), {
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
    try {
      const saved = await fetch(api('/api/fiscal/batches'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceName: fileName, items: finalRows.map(row => ({ rowNumber: row.line, input: row.input, requestPayload: row.request ?? null, errorMessage: row.message })) }),
      })
      const savedPayload = await saved.json().catch(() => ({}))
      if (!saved.ok || typeof savedPayload.batch?.id !== 'string') throw new Error(savedPayload.error || 'No se pudo guardar el lote para recuperarlo después.')
      setBatchId(savedPayload.batch.id)
      if (savedPayload.existing === true) {
        await openSavedBatch(savedPayload.batch.id)
        setBusy(false)
        return
      }
      const detail = await fetch(api(`/api/fiscal/batches/${encodeURIComponent(savedPayload.batch.id)}`), { cache: 'no-store' })
      const detailPayload = await detail.json().catch(() => ({}))
      if (detail.ok && Array.isArray(detailPayload.batch?.items)) {
        const idsByRow = new Map<number, string>(detailPayload.batch.items.map((item: { rowNumber: number; id: string }) => [item.rowNumber, item.id]))
        setRows(finalRows.map(row => ({ ...row, id: idsByRow.get(row.line) })))
      }
      await refreshSavedBatches()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el lote.')
    }
    setStage(invalid ? 'loaded' : 'validated')
    setNotice(invalid ? `Validación terminada: ${invalid} fila(s) con errores. No se puede emitir el lote hasta corregirlas.` : `Las ${finalRows.length} filas pasaron la validación de payload. No se emitió nada.`)
    setBusy(false)
  }

  async function submitBatch() {
    if (rows.some(row => row.state !== 'valid' && row.state !== 'submitted' && row.state !== 'uncertain' && row.state !== 'rejected')) return
    setBusy(true); setError(''); setNotice('')
    setStage('processing')
    let submitted = 0
    let rejected = 0
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]
      if (row.state === 'submitted') { submitted++; continue }
      if (row.state === 'rejected') { rejected++; continue }
      if (!row.request) {
        setError(`Fila ${row.line}: falta el payload validado. Volvé a validar el archivo.`)
        setStage('partial'); setBusy(false); return
      }
      try {
        if (!batchId || !row.id) throw new Error('La fila todavía no está guardada en el lote.')
        const response = await fetch(api(`/api/nodo/invoices/emit?batchItemId=${encodeURIComponent(row.id)}`), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
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
          const rejection = payload.error?.message || payload.error || 'El Worker rechazó la emisión.'
          setRows(current => current.map((item, rowIndex) => rowIndex === index ? { ...item, state: 'rejected', message: rejection } : item))
          rejected++
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
    setNotice(`Cola procesada: ${submitted} comprobante(s) con trabajo registrado${rejected ? ` y ${rejected} rechazo(s)` : ''}. La autorización final de ARCA debe consultarse en el panel de comprobantes.`)
    setBusy(false)
    await refreshSavedBatches()
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
      <ol aria-label="Pasos de facturación por lote" className="mt-5 grid gap-2 sm:grid-cols-4">{[
        { id: 'template', label: '1. Plantilla' }, { id: 'upload', label: '2. Cargar archivo' }, { id: 'review', label: '3. Revisar' }, { id: 'issue', label: '4. Confirmar emisión' },
      ].map((step, index) => <li key={step.id} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${stage === 'complete' || (index === 0 && stage !== 'empty') || (index === 1 && stage !== 'empty') || (index === 2 && ['validated', 'partial', 'complete'].includes(stage)) || (index === 3 && ['processing', 'partial', 'complete'].includes(stage)) ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-500'}`}>{step.label}</li>)}</ol>
      {savedBatches.length > 0 && <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lotes guardados</p>
        <div className="mt-2 flex flex-wrap gap-2">{savedBatches.map(batch => <button key={batch.id} type="button" onClick={() => void openSavedBatch(batch.id)} disabled={busy} className={`rounded-lg border px-3 py-2 text-left text-xs ${batch.id === batchId ? 'border-gray-900 bg-white text-gray-900' : 'border-gray-200 bg-white text-gray-600'}`}>
          <span className="block font-semibold">{batch.sourceName || 'Lote sin nombre'} · {batch.rowCount} filas</span>
          <span className="mt-0.5 block">{batch.status} · {new Date(batch.createdAt).toLocaleDateString('es-AR')}</span>
        </button>)}</div>
        {rows.some(row => row.printInvoice) && <button type="button" onClick={() => onPrintBatch(rows.flatMap(row => row.printInvoice ? [row.printInvoice] : []))} className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700">Imprimir comprobantes autorizados ({rows.filter(row => row.printInvoice).length})</button>}
      </div>}
      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="block text-sm font-medium text-gray-700">Cargá el archivo completado (TSV)
          <input type="file" accept=".tsv,.txt,text/tab-separated-values" onChange={event => void loadFile(event)} disabled={busy} className="mt-1 block w-full rounded-xl border border-gray-200 p-2 text-sm font-normal" />
        </label>
        {rows.length > 0 && <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void validateBatch()} disabled={busy || stage === 'processing'} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Validar lote</button>
          <button type="button" onClick={() => void submitBatch()} disabled={busy || !batchId || !['validated', 'partial'].includes(stage) || invalidCount > 0 || validCount === 0 || rows.some(row => row.state === 'valid' && !row.id)} className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Procesando…' : stage === 'partial' ? 'Reanudar lote' : 'Confirmar emisión del lote'}</button>
        </div>}
      </div>
      {fileName && <p className="mt-2 text-xs text-gray-500">Archivo: {fileName} · {rows.length} comprobantes · máximo 50.</p>}
      {stage !== 'empty' && <p className="rounded-xl bg-blue-50 p-3 text-sm leading-5 text-blue-900">Validar revisa los datos y no emite. Corregí los errores y volvé a validar antes de confirmar. Si reintentás una fila ya enviada, conservá su mismo externalId para evitar duplicados.</p>}
      {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{notice}</div>}
      {rows.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500"><th className="pb-2 pr-3">Fila</th><th className="pb-2 pr-3">Referencia</th><th className="pb-2 pr-3">CUIT / ambiente</th><th className="pb-2 pr-3">Tipo</th><th className="pb-2 pr-3">Importe estimado</th><th className="pb-2 pr-3">Estado</th><th className="pb-2">Detalle</th></tr></thead><tbody>{rows.map(row => {
        const net = Number(row.input.netAmount || 0)
        const rate = row.input.type === 'C' ? 0 : Number(row.input.vatRate || 0)
        const total = roundMoney(net + roundMoney(net * rate / 100))
        return <tr key={`${row.line}-${row.input.externalId}`} className="border-b border-gray-100 align-top"><td className="py-3 pr-3">{row.line}</td><td className="py-3 pr-3 font-mono text-xs">{row.input.externalId || '—'}</td><td className="py-3 pr-3"><span className="font-mono text-xs">{row.input.cuit}</span><br />{row.input.environment}</td><td className="py-3 pr-3">{row.input.type}</td><td className="py-3 pr-3">{Number.isFinite(total) ? money(total) : '—'}</td><td className="py-3 pr-3">{row.state === 'valid' ? 'Validada' : row.state === 'submitted' ? 'Trabajo creado' : row.state === 'uncertain' ? 'Respuesta incierta' : row.state === 'rejected' || row.state === 'failed' ? 'Rechazada' : row.state === 'invalid' ? 'Error' : 'Pendiente'}{row.jobId && <p className="mt-1 break-all font-mono text-[10px] text-gray-500">{row.jobId}</p>}</td><td className="py-3 text-xs leading-5 text-gray-600">{row.message || 'Pendiente de validación'}</td></tr>
      })}</tbody></table></div>}
    </section>
  )
}
