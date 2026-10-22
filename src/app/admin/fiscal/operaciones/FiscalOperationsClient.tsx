'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, LoaderCircle, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react'

type Snapshot = { ok: boolean; status: number; data: Record<string, unknown> | null; error?: string | null }
type Operations = {
  stats: Snapshot
  wsaa: Snapshot
  deadJobs: Snapshot
  deadWebhooks: Snapshot
  recoveryEnabled: boolean
  checkedAt: string
}
type Row = Record<string, unknown>

function record(value: unknown): Row | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : null
}
function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => record(item) !== null) as Row[] : []
}
function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
function label(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value : fallback
}
function formatDate(value: unknown) {
  if (typeof value !== 'string') return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const primary = 'inline-flex items-center justify-center gap-2 rounded-full bg-zap-magenta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zap-magenta-dark disabled:cursor-not-allowed disabled:opacity-40'
const secondary = 'inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-zap-magenta hover:text-zap-magenta disabled:opacity-40'

export default function FiscalOperationsClient() {
  const [data, setData] = useState<Operations | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/fiscal/operaciones', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo consultar el estado operativo del Worker.')
      setData(payload as Operations)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo consultar el estado operativo del Worker.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function retry(action: 'retry-job' | 'retry-webhook', id: string, kind: string) {
    const message = action === 'retry-job'
      ? 'Se reintentará un trabajo fiscal que llegó a DEAD. Verificá el motivo antes de continuar.'
      : 'Se intentará entregar nuevamente un webhook marcado DEAD. ¿Continuar?'
    if (!confirm(message)) return
    setBusyId(id)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/fiscal/operaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'El Worker no aceptó el reintento.')
      setNotice(`${kind} enviado al Worker. Actualizá el estado para confirmar el resultado.`)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo completar el reintento.')
    } finally {
      setBusyId('')
    }
  }

  const stats = record(data?.stats.data)
  const jobs = record(stats?.jobs)
  const jobs24h = record(jobs?.last24h)
  const certificates = record(stats?.certificates)
  const wsaa = record(data?.wsaa.data)
  const deadJobsData = record(data?.deadJobs.data)
  const deadWebhooksData = record(data?.deadWebhooks.data)
  const deadJobs = rows(deadJobsData?.jobs)
  const deadWebhooks = rows(deadWebhooksData?.webhooks)
  const wsaaTickets = rows(wsaa?.tickets)
  const wsaaBlocks = rows(wsaa?.blocks)

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zap-magenta">ZAP · Fiscal Worker</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-950">Operaciones y recuperación</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">Estado de trabajos, webhooks y coordinación WSAA. Las acciones de recuperación quedan registradas en la auditoría de administración.</p>
        </div>
        <button type="button" className={secondary} onClick={() => void load()} disabled={loading || Boolean(busyId)}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar</button>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <AlertTriangle size={19} className="mt-0.5 shrink-0" />
        <div><strong>Herramientas operativas.</strong><p className="mt-1">Un reintento no crea una operación nueva desde el panel: recupera un job o webhook que el Worker marcó como DEAD. Para resultados fiscales ambiguos, usá primero la conciliación del comprobante.</p></div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

      {loading && !data ? <div className="flex items-center gap-2 py-12 text-sm text-gray-500"><LoaderCircle size={18} className="animate-spin" /> Consultando al Worker…</div> : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">Trabajos en las últimas 24 h</p><p className="mt-2 text-3xl font-semibold text-gray-950">{number(jobs24h?.total)}</p><p className="mt-1 text-xs text-gray-500">{number(jobs24h?.success)} completados · {number(jobs24h?.failed)} DEAD</p></article>
            <article className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">Tasa de éxito informada</p><p className="mt-2 text-3xl font-semibold text-gray-950">{label(jobs24h?.successRate, '—')}</p><p className="mt-1 text-xs text-gray-500">Según el estado registrado por el Worker</p></article>
            <article className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">Certificados por vencer</p><p className="mt-2 text-3xl font-semibold text-gray-950">{number(certificates?.expiringIn30Days)}</p><p className="mt-1 text-xs text-gray-500">Próximos 30 días</p></article>
            <article className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">Bloqueos WSAA reportados</p><p className="mt-2 text-3xl font-semibold text-gray-950">{number(wsaa?.blockTotal)}</p><p className="mt-1 text-xs text-gray-500">{number(wsaa?.valid)} tickets vigentes · {number(wsaa?.expired)} vencidos</p></article>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-gray-950">Coordinación WSAA</h2><p className="mt-1 text-sm text-gray-600">Metadatos operativos sin token, firma ni huella del certificado.</p></div><span className={data?.wsaa.ok ? 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700'}>{data?.wsaa.ok ? 'Disponible' : `Error HTTP ${data?.wsaa.status ?? '—'}`}</span></div>
            {wsaaTickets.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500"><th className="py-3 pr-4">Ambiente</th><th className="py-3 pr-4">Servicio</th><th className="py-3 pr-4">Estado</th><th className="py-3">Vencimiento</th></tr></thead><tbody>{wsaaTickets.slice(0, 12).map((ticket, index) => <tr key={`${label(ticket.environment)}-${label(ticket.service)}-${index}`} className="border-b border-gray-50"><td className="py-3 pr-4">{label(ticket.environment)}</td><td className="py-3 pr-4 font-mono text-xs">{label(ticket.service)}</td><td className="py-3 pr-4"><span className={ticket.status === 'VALID' ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600'}>{label(ticket.status)}</span></td><td className="py-3">{formatDate(ticket.expiresAt)}</td></tr>)}</tbody></table> : <p className="mt-4 text-sm text-gray-500">{data?.wsaa.ok ? 'No hay tickets WSAA registrados para mostrar.' : 'No se pudo consultar el estado WSAA.'}</p>}
            {wsaaBlocks.length > 0 && <div className="mt-5 space-y-2"><h3 className="text-sm font-semibold text-gray-900">Bloqueos y ventanas de reintento</h3>{wsaaBlocks.slice(0, 8).map((block, index) => <div key={`${label(block.environment)}-${label(block.service)}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 text-sm"><div><p className="font-medium text-gray-900">{label(block.environment)} · {label(block.service)}</p><p className="mt-1 text-xs text-gray-500">{label(block.reason)} · {number(block.retryCount)} reintentos</p></div><div className="text-right"><p className="font-semibold text-gray-700">{label(block.status)}</p><p className="mt-1 text-xs text-gray-500">Hasta {formatDate(block.blockedUntil)}</p></div></div>)}</div>}
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-gray-950">Trabajos DEAD</h2><p className="mt-1 text-sm text-gray-600">Hasta 50 trabajos que el Worker dejó en estado terminal.</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{number(deadJobsData?.count)}</span></div>
              {deadJobs.length ? <div className="mt-4 space-y-3">{deadJobs.map(job => <article key={label(job.id)} className="rounded-2xl border border-gray-100 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-all font-mono text-xs text-gray-500">{label(job.id)}</p><p className="mt-1 font-semibold text-gray-900">{label(job.type)} · {number(job.attempts)} intentos</p><p className="mt-1 break-words text-sm text-gray-600">{label(job.lastError, 'Sin detalle de error')}</p><p className="mt-1 text-xs text-gray-400">Actualizado {formatDate(job.updatedAt)}</p></div><button type="button" className={secondary} disabled={!data?.recoveryEnabled || Boolean(busyId)} onClick={() => void retry('retry-job', label(job.id), 'Trabajo')}><RotateCcw size={14} /> Reintentar</button></div></article>)}</div> : <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">{data?.deadJobs.ok ? 'No hay trabajos DEAD.' : 'No se pudo consultar la cola de trabajos muertos.'}</p>}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-gray-950">Webhooks DEAD</h2><p className="mt-1 text-sm text-gray-600">Entregas que agotaron los reintentos automáticos.</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{number(deadWebhooksData?.count)}</span></div>
              {deadWebhooks.length ? <div className="mt-4 space-y-3">{deadWebhooks.map(webhook => <article key={label(webhook.id)} className="rounded-2xl border border-gray-100 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-all font-mono text-xs text-gray-500">{label(webhook.id)}</p><p className="mt-1 font-semibold text-gray-900">HTTP {label(webhook.responseCode, '—')} · {number(webhook.attempts)} intentos</p><p className="mt-1 break-all text-xs text-gray-500">Job {label(webhook.jobId)}</p><p className="mt-1 text-xs text-gray-400">Creado {formatDate(webhook.createdAt)}</p></div><button type="button" className={secondary} disabled={!data?.recoveryEnabled || Boolean(busyId)} onClick={() => void retry('retry-webhook', label(webhook.id), 'Webhook')}><RotateCcw size={14} /> Reintentar</button></div></article>)}</div> : <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">{data?.deadWebhooks.ok ? 'No hay webhooks DEAD.' : 'No se pudo consultar la cola de webhooks muertos.'}</p>}
            </div>
          </section>

          {!data?.recoveryEnabled && <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-zap-magenta" /><div><strong>Recuperación desactivada.</strong><p className="mt-1">Un administrador debe habilitar “Recuperación operativa del Worker” en Controles de operación. Las consultas de estado permanecen disponibles.</p></div></div>}
          <p className="text-xs text-gray-400">Última consulta: {formatDate(data?.checkedAt)}. Los estados corresponden al Worker en el momento de la consulta.</p>
        </>
      )}
    </main>
  )
}
