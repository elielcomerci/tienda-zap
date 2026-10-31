'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'

export default function ProposalStageReply({proposalId,stageId}:{proposalId:string;stageId:string}) {
  const router=useRouter()
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  async function send() {
    const value=message.trim()
    if(!value||busy) return
    setBusy(true)
    setError('')
    try {
      const response=await fetch(`/api/admin/proposals/${proposalId}/stages/${stageId}/comments`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:value})
      })
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||'No pudimos enviar el mensaje.')
      setMessage('')
      router.refresh()
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Ocurrió un error.')
    } finally {
      setBusy(false)
    }
  }
  return <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
    <label htmlFor={`reply-${stageId}`} className="block text-xs font-semibold text-gray-600">Responder al cliente</label>
    <textarea id={`reply-${stageId}`} value={message} onChange={event=>setMessage(event.target.value)} rows={3} maxLength={4000} placeholder="Escribí una respuesta o pedí la información que falta…" className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-zap-magenta-light focus:ring-2 focus:ring-zap-magenta-subtle"/>
    {error&&<p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    <div className="mt-2 flex justify-end">
      <button type="button" onClick={send} disabled={busy||!message.trim()} className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?'Enviando…':'Enviar respuesta'}</button>
    </div>
  </div>
}
