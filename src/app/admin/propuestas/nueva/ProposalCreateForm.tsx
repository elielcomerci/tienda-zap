'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type UserOption = { id: string; name: string | null; email: string }
type AccountOption = { id: string; name: string; userId: string | null }

export default function ProposalCreateForm({ users, accounts }: { users: UserOption[]; accounts: AccountOption[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [form, setForm] = useState({ title: '', targetEmail: '', summary: '', diagnosis: '', solution: '', scope: '', deliverables: '', timeline: '', amount: '', paymentTerms: '', conditions: '', youtubeUrl: '' })
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const response = await fetch('/api/admin/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, customerId: customerId || null, businessAccountId: accountId || null }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos guardar la propuesta.')
      router.push(`/admin/propuestas/${data.proposal.id}`); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Ocurrió un error.') ; setSaving(false) }
  }
  const field = (key: keyof typeof form, label: string, placeholder: string, multiline = false) => <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>{multiline ? <textarea value={form[key]} onChange={e=>update(key,e.target.value)} placeholder={placeholder} rows={3} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"/> : <input value={form[key]} onChange={e=>update(key,e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"/>}</label>
  return <form onSubmit={submit} className="space-y-6">
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7"><h2 className="text-lg font-semibold text-gray-900">Cliente y contexto</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{field('title','Título de la propuesta','Ej. Plan de crecimiento y comunicación')}<label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Cliente existente</span><select value={customerId} onChange={e=>{setCustomerId(e.target.value); const u=users.find(x=>x.id===e.target.value); if(u) update('targetEmail',u.email)}} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm"><option value="">Sin usuario asociado</option>{users.map(u=><option key={u.id} value={u.id}>{u.name || u.email} · {u.email}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Cuenta CRM</span><select value={accountId} onChange={e=>setAccountId(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm"><option value="">Sin cuenta asociada</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>{field('targetEmail','Email de contacto','cliente@empresa.com')}</div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7"><h2 className="text-lg font-semibold text-gray-900">La propuesta</h2><p className="mt-1 text-sm text-gray-500">No hace falta completar todo ahora. Podés desarrollar cada punto con el nivel de detalle que el caso necesite.</p><div className="mt-5 space-y-4">{field('summary','Resumen','Una síntesis breve de lo que vamos a resolver.',true)}{field('diagnosis','Lo que entendimos','Situación actual, necesidades y oportunidades.',true)}{field('solution','Lo que proponemos','Enfoque y por qué tiene sentido.',true)}{field('scope','Alcance','Qué trabajo contempla.',true)}{field('deliverables','Entregables','Qué va a recibir el cliente.',true)}{field('timeline','Etapas y plazos','Cómo se organiza el trabajo.',true)}</div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7"><h2 className="text-lg font-semibold text-gray-900">Inversión y condiciones</h2><p className="mt-1 text-sm text-gray-500">El importe puede quedar pendiente de definición.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{field('amount','Importe (opcional)','Ej. 250000')}{field('paymentTerms','Modalidad de pago','Anticipo, cuotas, hitos...',true)}<div className="sm:col-span-2">{field('conditions','Consideraciones y vigencia','Exclusiones, dependencias, validez de la propuesta.',true)}</div></div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7"><h2 className="text-lg font-semibold text-gray-900">Material de referencia</h2><p className="mt-1 text-sm text-gray-500">Podés sumar un video de YouTube como muestra. La carga privada de imágenes, audios y PDFs se conecta en el siguiente bloque.</p><div className="mt-4">{field("youtubeUrl","Video de YouTube (opcional)","https://youtu.be/…")}</div></section>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row"><button type="button" onClick={()=>router.push('/admin/propuestas')} className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700">Cancelar</button><button disabled={saving} className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?'Guardando…':'Guardar propuesta'}</button></div>
  </form>
}
