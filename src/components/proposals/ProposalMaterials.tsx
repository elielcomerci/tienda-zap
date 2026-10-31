'use client'

import {useRef,useState} from 'react'
import {useRouter} from 'next/navigation'

type Material={id:string;kind:string;label:string|null;url:string|null;fileName:string|null;contentType:string|null;sizeBytes:number|null;note:string|null;uploadedByName:string|null;uploadedByRole:string|null;createdAt:string|Date}

export default function ProposalMaterials({proposalId,materials}:{proposalId:string;materials:Material[]}) {
  const router=useRouter()
  const input=useRef<HTMLInputElement>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
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
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'No pudimos subir el archivo.')
    } finally {
      setBusy(false)
      if(input.current) input.current.value=''
    }
  }
  const files=materials.filter(item=>item.kind==='FILE'&&item.fileName)
  const links=materials.filter(item=>item.kind==='YOUTUBE'&&item.url)
  return <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-semibold">Materiales</h2><p className="mt-1 text-sm text-gray-500">Referencias y archivos de trabajo.</p></div>
      <div><input ref={input} type="file" className="hidden" onChange={event=>{const file=event.target.files?.[0];if(file) void upload(file)}}/><button type="button" onClick={()=>input.current?.click()} disabled={busy} className="rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?'Subiendo…':'Adjuntar archivo'}</button></div>
    </div>
    {error&&<p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {files.length===0&&links.length===0?<p className="mt-5 text-sm text-gray-500">Todavía no hay materiales adjuntos.</p>:<ul className="mt-4 divide-y divide-gray-100">
      {files.map(item=><li key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.label||item.fileName}</p><p className="mt-1 text-xs text-gray-500">{item.uploadedByName||item.uploadedByRole||'Material'} · {new Date(item.createdAt).toLocaleString('es-AR')}{item.sizeBytes?' · '+(item.sizeBytes/1024/1024).toFixed(1)+' MB':''}</p>{item.note&&<p className="mt-1 text-xs text-gray-500">{item.note}</p>}</div><a href={'/api/proposals/'+proposalId+'/materials/'+item.id+'/download'} className="shrink-0 text-sm font-semibold underline">Descargar</a></li>)}
      {links.map(item=><li key={item.id} className="py-3"><a href={item.url!} target="_blank" rel="noreferrer" className="text-sm font-semibold underline">{item.label||'Abrir referencia'}</a></li>)}
    </ul>}
    <p className="mt-3 text-xs text-gray-400">Hasta 150 MB por archivo.</p>
  </section>
}
