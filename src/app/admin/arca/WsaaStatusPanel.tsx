'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck } from 'lucide-react'

type Ticket = {
  environment: string
  service: string
  expiresAt: string
  status: 'VALID' | 'EXPIRED' | string
}

type Block = {
  environment: string
  service: string
  blockedUntil: string | null
  expirationKnown: boolean
  reason: string
  retryCount: number
  updatedAt: string
  status: 'SUPERSEDED_BY_VALID_TICKET' | 'BLOCKED_UNTIL' | 'EXPIRY_UNKNOWN' | 'RETRY_WINDOW_ELAPSED' | 'BLOCK_STATE_INCOMPLETE' | string
}

type StatusPayload = {
  checkedAt: string
  total: number
  valid: number
  expired: number
  truncated: boolean
  tickets: Ticket[]
  blockTotal: number
  blocksTruncated: boolean
  blocks: Block[]
}

function dateTime(value: string | null) {
  if (!value) return 'Sin vencimiento conocido'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Fecha no disponible'
  return date.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
}

function ticketLabel(status: string) {
  if (status === 'VALID') return 'Vigente'
  if (status === 'EXPIRED') return 'Vencido'
  return 'Estado desconocido'
}

function blockLabel(block: Block) {
  switch (block.status) {
    case 'SUPERSEDED_BY_VALID_TICKET': return 'Bloqueo residual; existe un ticket vigente que tiene prioridad'
    case 'BLOCKED_UNTIL': return `Bloqueado hasta ${dateTime(block.blockedUntil)}`
    case 'EXPIRY_UNKNOWN': return 'Bloqueado · vencimiento desconocido'
    case 'RETRY_WINDOW_ELAPSED': return 'Ventana de espera cumplida; requiere nuevo intento controlado'
    case 'BLOCK_STATE_INCOMPLETE': return 'Estado incompleto; requiere revisión'
    default: return 'Estado de bloqueo desconocido'
  }
}

export default function WsaaStatusPanel() {
  const [data, setData] = useState<StatusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/arca/wsaa-status', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'No se pudo consultar el estado fiscal.')
      }
      setData(payload as StatusPayload)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar el estado fiscal.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Coordinación central · WSAA</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Estado fiscal</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Estado operativo de tickets de autenticación y bloqueos conocidos. Esta vista no muestra credenciales ni huellas de certificados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Estado no disponible</p>
            <p className="mt-1">{error}</p>
            <p className="mt-1 text-amber-800">No se interpreta la falta de respuesta como una falla de ARCA ni como autorización para reintentar.</p>
          </div>
        </div>
      )}

      {loading && !data && !error && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500">Consultando el estado operativo…</div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Tickets registrados</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{data.total}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 size={16} /> Vigentes</div>
              <p className="mt-2 text-3xl font-bold text-emerald-900">{data.valid}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm text-gray-500"><Clock3 size={16} /> Vencidos</div>
              <p className="mt-2 text-3xl font-bold text-gray-900">{data.expired}</p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-bold text-gray-900">Tickets WSAA</h2>
              <p className="mt-1 text-xs text-gray-500">Consulta realizada: {dateTime(data.checkedAt)}</p>
            </div>
            {data.tickets.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-500">No hay tickets persistidos para mostrar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr><th className="px-5 py-3">Entorno</th><th className="px-5 py-3">Servicio</th><th className="px-5 py-3">Vencimiento</th><th className="px-5 py-3">Estado</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.tickets.map((ticket, index) => (
                      <tr key={`${ticket.environment}-${ticket.service}-${ticket.expiresAt}-${index}`}>
                        <td className="px-5 py-3 font-medium text-gray-900">{ticket.environment}</td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-700">{ticket.service}</td>
                        <td className="px-5 py-3 text-gray-600">{dateTime(ticket.expiresAt)}</td>
                        <td className="px-5 py-3"><span className={ticket.status === 'VALID' ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800' : 'rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700'}>{ticketLabel(ticket.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.truncated && <p className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-900">La lista está limitada a 200 tickets. Hay más registros que no se muestran.</p>}
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-gray-500" /><h2 className="font-bold text-gray-900">Bloqueos y recuperación</h2></div>
              <p className="mt-1 text-xs text-gray-500">Un vencimiento desconocido no se presenta como una hora estimada.</p>
            </div>
            {data.blocks.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-500">No hay bloqueos persistidos para mostrar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr><th className="px-5 py-3">Entorno</th><th className="px-5 py-3">Servicio</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Reintentos</th><th className="px-5 py-3">Actualizado</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.blocks.map((block, index) => (
                      <tr key={`${block.environment}-${block.service}-${block.updatedAt}-${index}`}>
                        <td className="px-5 py-3 font-medium text-gray-900">{block.environment}</td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-700">{block.service}</td>
                        <td className="px-5 py-3 text-gray-700">{blockLabel(block)}</td>
                        <td className="px-5 py-3 text-gray-600">{block.retryCount}</td>
                        <td className="px-5 py-3 text-gray-600">{dateTime(block.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.blocksTruncated && <p className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-900">La lista está limitada a 200 bloqueos. Hay más registros que no se muestran.</p>}
          </section>
        </>
      )}
    </div>
  )
}
