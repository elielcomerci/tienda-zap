'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Comment = { id: string; authorName: string | null; authorRole: string; action: string | null; message: string | null; createdAt: string | Date }
type Stage = { id: string; proposalId: string; track: string; title: string; description: string | null; scope: string | null; deliverables: string | null; timeline: string | null; conditions: string | null; amount: unknown; currency: string; paymentTerms: string | null; status: string; clientWorkId: string | null; comments: Comment[] }

const statusLabels: Record<string, string> = { ACCEPTED: 'Aprobada', PENDING: 'Pendiente', QUERY: 'En conversación', CHANGES_REQUESTED: 'Cambios solicitados', REJECTED: 'No aprobada' }
const actionLabels: Record<string, string> = { ACCEPTED: 'Aprobar', CHANGES_REQUESTED: 'Pedir cambios', QUERY: 'Conversar', PENDING: 'Dejar pendiente', REJECTED: 'No avanzar' }

export default function ProposalStageDecision({ stage, proposalVersion }: { stage: Stage; proposalVersion: number }) {
  const router = useRouter()
  const [action, setAction] = useState('ACCEPTED')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/perfil/propuestas/${stage.proposalId}/stages/${stage.id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, message, expectedVersion: proposalVersion }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos guardar tu decisión.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar tu decisión.')
    } finally {
      setBusy(false)
    }
  }

  const detail = (label: string, value: string | null) => value?.trim() ? <div className="mt-4"><h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</h4><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{value}</p></div> : null
  const price = stage.amount == null ? null : new Intl.NumberFormat('es-AR', { style: 'currency', currency: stage.currency }).format(Number(stage.amount))

  return <article className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
    <header className="flex items-start justify-between gap-4">
      <h4 className="text-lg font-semibold tracking-tight text-gray-950">{stage.title}</h4>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${stage.status === 'ACCEPTED' ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-600'}`}>{statusLabels[stage.status] || stage.status}</span>
    </header>

    {detail('Descripción', stage.description)}
    {detail('Alcance', stage.scope)}
    {detail('Entregables', stage.deliverables)}
    {detail('Plazo', stage.timeline)}
    {detail('Consideraciones', stage.conditions)}

    {(price || stage.paymentTerms) && <div className="mt-5 border-t border-gray-100 pt-4">
      {price && <p className="text-2xl font-semibold tracking-tight text-gray-950">{price}</p>}
      {stage.paymentTerms && <p className="mt-2 text-sm leading-6 text-gray-600">{stage.paymentTerms}</p>}
    </div>}

    {stage.clientWorkId ? <div className="mt-5 border-t border-gray-100 pt-4">
      <p className="text-sm font-medium text-gray-800">Esta etapa ya está en marcha.</p>
      <a href="/perfil/archivos" className="mt-2 inline-flex text-sm font-semibold text-gray-950 underline underline-offset-4">Ver trabajo</a>
    </div> : <>
      {stage.comments.length > 0 && <div className="mt-5 border-t border-gray-100 pt-4">
        <h5 className="text-sm font-semibold text-gray-900">Conversación</h5>
        <div className="mt-3 space-y-3">{stage.comments.map(comment => <div key={comment.id} className="rounded-xl bg-[#FAF9F6] p-3">
          <p className="text-xs text-gray-500">{comment.authorName || comment.authorRole} · {comment.action ? actionLabels[comment.action] || comment.action : 'Comentario'} · {new Date(comment.createdAt).toLocaleDateString('es-AR')}</p>
          {comment.message && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{comment.message}</p>}
        </div>)}</div>
      </div>}
      <div className="mt-6 border-t border-gray-100 pt-5">
        <label className="block"><span className="text-sm font-semibold text-gray-900">Tu decisión</span>
          <select value={action} onChange={event => setAction(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm focus:border-gray-500 focus:outline-none">
            {Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {action !== 'ACCEPTED' && <label className="mt-3 block"><span className="mb-1 block text-sm text-gray-600">Comentario</span><textarea value={message} onChange={event => setMessage(event.target.value)} rows={3} maxLength={4000} placeholder="Contanos brevemente." className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm focus:border-gray-500 focus:outline-none" /></label>}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <button onClick={submit} disabled={busy || (action !== 'ACCEPTED' && !message.trim())} className="mt-4 w-full rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50 sm:w-auto">{busy ? 'Guardando…' : actionLabels[action]}</button>
      </div>
    </>}
  </article>
}
