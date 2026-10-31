'use client'

import {useRef,useState} from 'react'
import {useRouter} from 'next/navigation'

type Material={id:string;kind:string;label:string|null;url:string|null;fileName:string|null;contentType:string|null;sizeBytes:number|null;note:string|null;uploadedByName:string|null;uploadedByRole:string|null;createdAt:string|Date}
export default function ProposalMaterials({proposalId,materials,canManage=false}:{proposalId:string;materials:Material[];canManage?:boolean}) {
  const router=useRouter()
  const input=useRef<HTMLInputElement>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [linkLabel,setLinkLabel]=useState('')
  const [linkUrl,setLinkUrl]=useState('')
  async function upload(file:File) {
    setBusy(true);setError('')
    try {
      const payload={fileName:file.name,contentType:file.type||'application/octet-stream',sizeBytes:file.size}
      const prepared=await fetch('/api/proposals/'+proposalId+'/materials/presign',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      const ticket=await prepared.json()
      if(!prepared.ok) throw new Error(ticket.error||'No pudimos preparar el archivo.')
      const sent=await fetch(ticket.signedUrl,{method:'PUT',headers:{'Content-Type':ticket.contentType},body:file})
      if(!sent.ok) throw new Error('No se pudo subir el archivo al almacenamiento privado.')
      const completed=await fetch('/api/proposals/'+proposalId+'/materials/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,objectKey:ticket.objectKey,label:file.name})})
      const result=await completed.json()
      if(!completed.ok) throw new Error(result.error||'No pudimos guardar el archivo.')
      router.refresh()
    } catch(cause) {setError(cause instanceof Error?cause.message:'No pudimos subir el archivo.')}
    finally {setBusy(false);if(input.current) input.current.value=''}
  }
  async function addLink(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError('')
    try {
      const response=await fetch('/api/proposals/'+proposalId+'/materials/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:linkLabel,url:linkUrl})})
      const data=await response.json();if(!response.ok)throw new Error(data.error||'No pudimos guardar el enlace.')
      setLinkLabel('');setLinkUrl('');router.refresh()
    } catch(cause) {setError(cause instanceof Error?cause.message:'No pudimos guardar el enlace.')}
    finally {setBusy(false)}
  }
  async function remove(item:Material) {
    if(!confirm('¿Eliminar este material de la propuesta?'))return
    setBusy(true);setError('')
    try {const response=await fetch('/api/proposals/'+proposalId+'/materials/'+item.id,{method:'DELETE'});const data=await response.json();if(!response.ok)throw new Error(data.error||'No pudimos eliminar el material.');router.refresh()}
    catch(cause){setError(cause instanceof Error?cause.message:'No pudimos eliminar el material.')}
    finally{setBusy(false)}
  }
  const files=materials.filter(item=>item.kind==='FILE'&&item.fileName)
  const links=materials.filter(item=>(item.kind==='YOUTUBE'||item.kind==='LINK')&&item.url)
  return <section className="card proposal-print-section p-5 sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Materiales de referencia</h2><p className="mt-1 text-sm text-gray-500">Archivos y enlaces relacionados con la propuesta.</p></div><div className="no-print"><input ref={input} type="file" className="hidden" onChange={event=>{const file=event.target.files?.[0];if(file) void upload(file)}}/><button type="button" onClick={()=>input.current?.click()} disabled={busy} className="btn-primary disabled:opacity-50">{busy?'Subiendo…':'Adjuntar archivo'}</button></div></div>
    {canManage&&<form onSubmit={addLink} className="no-print mt-4 grid gap-2 sm:grid-cols-[1fr_2fr_auto]"><input className="input" value={linkLabel} onChange={event=>setLinkLabel(event.target.value)} placeholder="Nombre del enlace"/><input className="input" type="url" required value={linkUrl} onChange={event=>setLinkUrl(event.target.value)} placeholder="https://…"/><button disabled={busy} className="btn-secondary">Agregar enlace</button></form>}
    {error&&<p role="alert" className="no-print mt-3 text-sm text-red-600">{error}</p>}
    {files.length===0&&links.length===0?<p className="mt-5 text-sm text-gray-500">Todavía no hay materiales adjuntos.</p>:<ul className="mt-4 divide-y divide-gray-100">
      {files.map(item=><li key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.label||item.fileName}</p><p className="mt-1 text-xs text-gray-500">{item.sizeBytes?(item.sizeBytes/1024/1024).toFixed(1)+' MB':''}{item.note?' · '+item.note:''}</p></div><div className="flex shrink-0 items-center gap-3"><a href={'/api/proposals/'+proposalId+'/materials/'+item.id+'/download'} className="text-sm font-semibold text-zap-magenta underline underline-offset-4">Descargar</a>{canManage&&<button type="button" className="no-print text-xs text-gray-500 underline" disabled={busy} onClick={()=>void remove(item)}>Eliminar</button>}</div></li>)}
      {links.map(item=><li key={item.id} className="flex items-center justify-between gap-3 py-3"><a href={item.url!} target="_blank" rel="noreferrer" className="min-w-0 text-sm font-semibold text-zap-magenta underline underline-offset-4">{item.label||'Abrir referencia'} <span className="break-all text-xs font-normal text-gray-500">{item.url}</span></a>{canManage&&<button type="button" className="no-print shrink-0 text-xs text-gray-500 underline" disabled={busy} onClick={()=>void remove(item)}>Eliminar</button>}</li>)}
    </ul>}
    <p className="no-print mt-3 text-xs text-gray-400">Hasta 150 MB por archivo. Los archivos se guardan en almacenamiento privado.</p>
  </section>
}
