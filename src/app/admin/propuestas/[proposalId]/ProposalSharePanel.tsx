'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'

export default function ProposalSharePanel({proposalId,initialInvites,hasActiveInvite}:{proposalId:string;initialInvites:{createdAt:string;expiresAt:string|null;revoked:boolean}[];hasActiveInvite:boolean}) {
  const router=useRouter()
  const [url,setUrl]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [copied,setCopied]=useState(false)
  async function generate() {
    setBusy(true);setError('');setUrl('')
    try {
      const response=await fetch('/api/admin/proposals/'+proposalId+'/invite',{method:'POST'})
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||'No se pudo generar el enlace.')
      setUrl(data.url);router.refresh()
    } catch(cause) {setError(cause instanceof Error?cause.message:'Error inesperado.')}
    finally {setBusy(false)}
  }
  async function revoke() {
    if(!confirm('¿Revocar el enlace activo? El cliente ya no podrá abrirlo.')) return
    setBusy(true);setError('')
    try {
      const response=await fetch('/api/admin/proposals/'+proposalId+'/invite',{method:'DELETE'})
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||'No se pudo revocar el enlace.')
      setUrl('');router.refresh()
    } catch(cause) {setError(cause instanceof Error?cause.message:'Error inesperado.')}
    finally {setBusy(false)}
  }
  async function copy() {if(!url)return;await navigator.clipboard.writeText(url);setCopied(true)}
  return <section className="rounded-2xl border border-gray-200 bg-white p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-lg font-semibold text-gray-900">Enlace privado</h2><p className="mt-1 text-sm text-gray-500">Cada invitación es individual, vence en 14 días y reemplaza a la anterior.</p></div>
      <div className="flex flex-wrap gap-2">{hasActiveInvite&&<button onClick={revoke} disabled={busy} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Revocar enlace</button>}<button onClick={generate} disabled={busy} className="rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?'Procesando…':'Generar enlace'}</button></div>
    </div>
    {url&&<div className="mt-4 rounded-xl bg-gray-50 p-3"><p className="break-all text-sm text-gray-700">{url}</p><button onClick={copy} className="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold">{copied?'Copiado':'Copiar enlace'}</button></div>}
    {error&&<p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {initialInvites.length>0&&<div className="mt-5 border-t border-gray-100 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Historial de invitaciones</p><ul className="mt-2 space-y-2">{initialInvites.map((invite,index)=><li key={index} className="flex justify-between gap-3 text-sm text-gray-600"><span>{new Date(invite.createdAt).toLocaleString('es-AR')}</span><span>{invite.revoked?'Revocada':invite.expiresAt?'Vence '+new Date(invite.expiresAt).toLocaleDateString('es-AR'):'Sin vencimiento'}</span></li>)}</ul></div>}
  </section>
}
