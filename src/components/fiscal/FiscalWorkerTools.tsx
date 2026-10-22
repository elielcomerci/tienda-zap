'use client'

import { useMemo, useState } from 'react'
import { Activity, FileSearch, RefreshCw, ShieldCheck } from 'lucide-react'

type Contributor = {
  cuit: string
  environment: 'TEST' | 'PROD'
  razonSocial: string | null
  authorizationStatus: string
  permissions: Record<string, boolean> | null
}
type Invoice = { id: string; cuit: string; environment: string; jobId: string | null; voucherNumber: number | null; voucherType: number }
type Props = {
  api: (path: string) => string
  contributors: Contributor[]
  invoices: Invoice[]
  flags: Record<string, boolean>
}
type WorkerResult = { title: string; body: unknown; status: number }

const inputClass = 'mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-zap-magenta focus:ring-2 focus:ring-zap-magenta-subtle'
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-full bg-zap-magenta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zap-magenta-dark disabled:cursor-not-allowed disabled:opacity-40'
const secondaryClass = 'inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-zap-magenta hover:text-zap-magenta disabled:opacity-40'

export default function FiscalWorkerTools({ api, contributors, invoices, flags }: Props) {
  const [cuit, setCuit] = useState('')
  const [environment, setEnvironment] = useState<'TEST' | 'PROD'>('TEST')
  const [pointOfSale, setPointOfSale] = useState('1')
  const [voucherType, setVoucherType] = useState('6')
  const [voucherNumber, setVoucherNumber] = useState('')
  const [queryCuit, setQueryCuit] = useState('')
  const [jobId, setJobId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<WorkerResult | null>(null)

  const scopedContributors = useMemo(
    () => contributors.filter(item => item.environment === environment),
    [contributors, environment],
  )
  const selected = scopedContributors.find(item => item.cuit === cuit)
  const reconcilableJobs = invoices.filter(item => item.jobId && item.environment === environment && (!cuit || item.cuit === cuit))
  const enabled = (key: string) => flags[key] === true

  async function run(title: string, path: string, init?: RequestInit) {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch(api(path), { cache: 'no-store', ...init })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = body?.error?.message || body?.error || body?.message || 'El Worker no pudo completar la consulta.'
        throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
      }
      setResult({ title, body, status: response.status })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo completar la operación fiscal.')
    } finally {
      setBusy(false)
    }
  }

  function chooseContributor(nextCuit: string) {
    setCuit(nextCuit)
    setQueryCuit('')
    setResult(null)
  }

  return (
    <section className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zap-magenta">Herramientas conectadas</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-950">Consultas a ARCA</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">Consultá datos del Worker antes de operar. Cada acción respeta los permisos de la CUIT y del ambiente; una consulta exitosa no autoriza por sí sola una emisión.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zap-magenta-subtle px-3 py-1.5 text-xs font-semibold text-zap-magenta-dark"><ShieldCheck size={14} /> Acceso controlado</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-gray-700">Ambiente
          <select className={inputClass} value={environment} onChange={event => { setEnvironment(event.target.value as 'TEST' | 'PROD'); setCuit(''); setResult(null) }}>
            <option value="TEST">Homologación (TEST)</option><option value="PROD">Producción (PROD)</option>
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">CUIT emisora
          <select className={inputClass} value={cuit} onChange={event => chooseContributor(event.target.value)}>
            <option value="">Seleccionar CUIT…</option>
            {scopedContributors.map(item => <option key={item.cuit} value={item.cuit}>{item.cuit}{item.razonSocial ? ` · ${item.razonSocial}` : ''}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">Punto de venta
          <input className={inputClass} inputMode="numeric" type="number" min="1" max="99999" value={pointOfSale} onChange={event => setPointOfSale(event.target.value)} />
        </label>
        <label className="text-sm font-medium text-gray-700">Tipo de comprobante
          <select className={inputClass} value={voucherType} onChange={event => setVoucherType(event.target.value)}>
            <option value="1">Factura A</option><option value="6">Factura B</option><option value="11">Factura C</option><option value="51">Factura M</option>
          </select>
        </label>
      </div>

      {selected && selected.permissions?.canViewHistory !== true && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">La cuenta no informa permiso activo de historial para esta CUIT. El Worker puede rechazar las consultas WSFE hasta que se autorice.</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button type="button" className={secondaryClass} disabled={busy || !cuit || !enabled('wsfeRead')} onClick={() => void run('Puntos de venta', `/api/fiscal/contributors/${encodeURIComponent(cuit)}/wsfe/points-of-sale?environment=${environment}`)}><Activity size={16} /> Consultar puntos de venta</button>
        <button type="button" className={secondaryClass} disabled={busy || !cuit || !pointOfSale || !enabled('wsfeRead')} onClick={() => void run('Último comprobante autorizado', `/api/fiscal/contributors/${encodeURIComponent(cuit)}/wsfe/vouchers/latest?environment=${environment}&pointOfSale=${encodeURIComponent(pointOfSale)}&voucherType=${voucherType}`)}><FileSearch size={16} /> Consultar última numeración</button>
        <div className="flex gap-2">
          <input aria-label="Número de comprobante" className={inputClass + ' mt-0 min-w-0'} type="number" min="1" placeholder="N.º comprobante" value={voucherNumber} onChange={event => setVoucherNumber(event.target.value)} />
          <button type="button" className={secondaryClass} disabled={busy || !cuit || !pointOfSale || !voucherNumber || !enabled('wsfeRead')} onClick={() => void run('Consulta de comprobante', `/api/fiscal/contributors/${encodeURIComponent(cuit)}/wsfe/vouchers/${encodeURIComponent(voucherNumber)}?environment=${environment}&pointOfSale=${encodeURIComponent(pointOfSale)}&voucherType=${voucherType}`)}>Consultar</button>
        </div>
      </div>

      {enabled('padronQuery') && <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Consulta de padrón</h3>
        <p className="mt-1 text-sm text-gray-600">La CUIT consultada puede diferir de la CUIT representada. La autorización debe estar activa en el Worker.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className={inputClass + ' mt-0 min-w-[220px] flex-1'} inputMode="numeric" maxLength={11} placeholder="CUIT a consultar" value={queryCuit} onChange={event => setQueryCuit(event.target.value.replace(/\D/g, '').slice(0, 11))} />
          <button type="button" className={buttonClass} disabled={busy || !cuit || queryCuit.length !== 11} onClick={() => void run('Consulta de padrón', '/api/fiscal/padron/consultas', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `padron-${cuit}-${environment}-${queryCuit}-${Date.now()}` }, body: JSON.stringify({ cuit: queryCuit, representedCuit: cuit, environment }) })}>Consultar padrón</button>
        </div>
      </div>}

      {environment === 'PROD' && enabled('usageVisibility') && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4">
        <div><h3 className="text-sm font-semibold text-gray-900">Consumo fiscal</h3><p className="mt-1 text-sm text-gray-600">Consulta el consumo informado por el Worker para la CUIT seleccionada en producción.</p></div>
        <button type="button" className={secondaryClass} disabled={busy || !cuit} onClick={() => void run('Consumo fiscal', `/api/fiscal/usage?cuit=${encodeURIComponent(cuit)}`)}><RefreshCw size={15} /> Consultar consumo</button>
      </div>}

      {enabled('jobReconciliation') && <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 p-4">
        <div className="min-w-[220px] flex-1"><label className="text-sm font-medium text-gray-700">Trabajo para conciliar
          <select className={inputClass} value={jobId} onChange={event => setJobId(event.target.value)}>
            <option value="">Seleccionar trabajo…</option>
            {reconcilableJobs.map(item => <option key={item.jobId} value={item.jobId!}>{item.cuit} · {item.jobId} · comprobante {item.voucherNumber ?? 'pendiente'}</option>)}
          </select>
        </label></div>
        <button type="button" className={buttonClass} disabled={busy || !jobId} onClick={() => {
          if (!confirm('Se consultará a ARCA para conciliar el trabajo. No se emitirá una nueva factura. ¿Continuar?')) return
          void run('Conciliación de trabajo', `/api/fiscal/jobs/${encodeURIComponent(jobId)}/reconcile`, { method: 'POST' })
        }}>Conciliar resultado</button>
      </div>}

      {!enabled('wsfeRead') && !enabled('padronQuery') && !enabled('usageVisibility') && !enabled('jobReconciliation') && <p className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Estas consultas están desactivadas por ZAP. El administrador puede habilitarlas desde Controles de operación.</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {result && <div role="status" className="overflow-hidden rounded-2xl border border-zap-magenta/20 bg-zap-magenta-subtle/40">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zap-magenta/10 px-4 py-3"><h3 className="font-semibold text-gray-900">{result.title}</h3><span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">HTTP {result.status}</span></div>
        <pre className="max-h-80 overflow-auto p-4 text-xs leading-5 text-gray-800">{JSON.stringify(result.body, null, 2)}</pre>
      </div>}
      <p className="text-xs leading-5 text-gray-500">Las respuestas se muestran como información operativa del Worker. Los estados, permisos y autorizaciones de ARCA siguen siendo la fuente de verdad.</p>
    </section>
  )
}
