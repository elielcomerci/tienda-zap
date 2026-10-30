'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Upload, Download, Trash2, RefreshCw, FolderOpen, Image as ImageIcon, MessageSquare, Send } from 'lucide-react'

type PortalUser = { id: string; name: string | null; email: string }
type PortalFile = {
  id: string; fileName: string; contentType: string; sizeBytes: number; note: string | null; updatedAt: string;
  createdAt: string; uploadedById: string; cleanupError?: string | null; uploadedBy?: { name: string | null; role: string }
  approvals?: Array<{ id: string; status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'SUPERSEDED'; response: string | null; fileUpdatedAt: string; requestedAt: string; respondedAt: string | null; requestedBy: { name: string | null }; respondedBy: { name: string | null } | null }>
}
type PortalWork = {
  id: string; title: string; description: string | null; createdAt: string; updatedAt: string;
  user?: PortalUser; files: PortalFile[]
}
type PortalMessage = { id: string; body: string; createdAt: string; senderId: string; sender: { name: string | null; role: string } }
const MAX_FILE_BYTES = 150 * 1024 * 1024

function formatSize(size: number) {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(0) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}
function previewKind(file: PortalFile) {
  const ext = file.fileName.split('.').pop()?.toLowerCase()
  if (file.contentType === 'application/pdf' && ext === 'pdf') return 'pdf'
  if (['png','jpg','jpeg','gif','webp'].includes(ext || '') && file.contentType.startsWith('image/')) return 'image'
  if (['mp4','mov','webm'].includes(ext || '') && file.contentType.startsWith('video/')) return 'video'
  if (['mp3','wav','m4a'].includes(ext || '') && file.contentType.startsWith('audio/')) return 'audio'
  return 'download'
}

export default function ClientWorkPortal({ admin = false, users = [], filesEnabled = true }: { admin?: boolean; users?: PortalUser[]; filesEnabled?: boolean }) {
  const [works, setWorks] = useState<PortalWork[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [userId, setUserId] = useState(users[0]?.id || '')
  const [userSearch, setUserSearch] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [openMessages, setOpenMessages] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, PortalMessage[]>>({})
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({})
  const [approvalResponses, setApprovalResponses] = useState<Record<string, string>>({})
  const replaceInput = useRef<HTMLInputElement>(null)
  const replaceTarget = useRef<{ workId: string; fileId: string } | null>(null)

  async function loadWorks() {
    setLoading(true)
    try {
      const response = await fetch('/api/client-works?scope=' + (admin ? 'admin' : 'client'), { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos cargar los trabajos.')
      setWorks(data.works || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar los trabajos.')
    } finally { setLoading(false) }
  }
  useEffect(() => { void loadWorks() }, [])

  async function toggleMessages(workId: string) {
    if (openMessages === workId) { setOpenMessages(null); return }
    setOpenMessages(workId)
    if (messages[workId]) return
    setBusy('messages:' + workId); setError('')
    try {
      const response = await fetch(`/api/client-works/${workId}/messages?scope=${admin ? 'admin' : 'client'}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos cargar los mensajes.')
      setMessages(current => ({ ...current, [workId]: data.messages || [] }))
      window.dispatchEvent(new Event('client-work-unread-refresh'))
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos cargar los mensajes.') }
    finally { setBusy(null) }
  }

  async function sendMessage(e: React.FormEvent, workId: string) {
    e.preventDefault()
    const body = (messageDrafts[workId] || '').trim()
    if (!body) return
    setBusy('send:' + workId); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/client-works/${workId}/messages?scope=${admin ? 'admin' : 'client'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos enviar el mensaje.')
      setMessages(current => ({ ...current, [workId]: [...(current[workId] || []), data.message] }))
      setMessageDrafts(current => ({ ...current, [workId]: '' }))
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos enviar el mensaje.') }
    finally { setBusy(null) }
  }

  async function submitApproval(workId: string, file: PortalFile, action: 'request' | 'approve' | 'changes') {
    setBusy('approval:' + file.id); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/client-works/${workId}/files/${file.id}/approvals?scope=${admin ? 'admin' : 'client'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'request' ? {} : { status: action === 'approve' ? 'APPROVED' : 'CHANGES_REQUESTED', response: approvalResponses[file.id] || '' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos actualizar la aprobación.')
      setApprovalResponses(current => ({ ...current, [file.id]: '' }))
      setMessage(action === 'request' ? 'Solicitud de aprobación enviada.' : action === 'approve' ? 'Entrega aprobada.' : 'Solicitud de cambios enviada al equipo.')
      await loadWorks()
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos actualizar la aprobación.') }
    finally { setBusy(null) }
  }

  async function createWork(e: React.FormEvent) {
    e.preventDefault()
    setBusy('create'); setError(''); setMessage('')
    try {
      const response = await fetch('/api/client-works', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title, description }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos crear el trabajo.')
      setTitle(''); setDescription('')
      setMessage('Trabajo creado. Ya podés cargar archivos.')
      await loadWorks()
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos crear el trabajo.') }
    finally { setBusy(null) }
  }

  async function uploadToInbox(files: FileList | File[]) {
    const selected = Array.from(files)
    if (!selected.length) return
    setBusy('inbox'); setError(''); setMessage('')
    try {
      const response = await fetch('/api/client-works/inbox?scope=client', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos preparar el espacio para tus archivos.')
      for (const file of selected) {
        await uploadFile(data.work.id, file)
      }
      setNote('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos preparar la carga de archivos.')
    } finally {
      setBusy(null)
    }
  }

  async function uploadFile(workId: string, file: File, replaceFileId?: string) {
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      setError('El archivo debe pesar entre 1 byte y 150 MB.'); return
    }
    setBusy(workId + (replaceFileId || '')); setError(''); setMessage('')
    try {
      const scope = admin ? 'admin' : 'client'
      const prep = await fetch('/api/client-works/' + workId + '/files/presign?scope=' + scope, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream', sizeBytes: file.size, replaceFileId }),
      })
      const upload = await prep.json()
      if (!prep.ok) throw new Error(upload.error || 'No pudimos preparar el archivo.')
      const put = await fetch(upload.signedUrl, {
        method: 'PUT', headers: { 'Content-Type': upload.contentType }, body: file,
      })
      if (!put.ok) throw new Error('La transferencia al almacenamiento falló. El archivo anterior se conserva.')
      const complete = await fetch('/api/client-works/' + workId + '/files/complete?scope=' + scope, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectKey: upload.objectKey, fileName: upload.fileName,
          contentType: upload.contentType, sizeBytes: file.size,
          note, replaceFileId,
        }),
      })
      const saved = await complete.json()
      if (!complete.ok) throw new Error(saved.error || 'No pudimos registrar el archivo.')
      setMessage(saved.cleanupWarning || `${file.name}: ${replaceFileId ? 'archivo reemplazado correctamente.' : 'archivo subido y asociado a este trabajo.'}`)
      await loadWorks()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos subir el archivo.')
    } finally { setBusy(null) }
  }

  async function retryCleanup(file: PortalFile) {
    setBusy(file.id); setError(''); setMessage('')
    try {
      const response = await fetch('/api/client-works/files/' + file.id + '/cleanup?scope=admin', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos limpiar el archivo anterior.')
      setMessage('Limpieza de almacenamiento completada.')
      await loadWorks()
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos limpiar el archivo anterior.') }
    finally { setBusy(null) }
  }

  async function deleteFile(file: PortalFile) {
    if (!confirm('¿Borrar definitivamente ' + file.fileName + '?')) return
    setBusy(file.id); setError(''); setMessage('')
    try {
      const response = await fetch('/api/client-works/files/' + file.id + '?scope=' + (admin ? 'admin' : 'client'), { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos borrar el archivo.')
      setMessage('Archivo eliminado del almacenamiento.')
      await loadWorks()
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos borrar el archivo.') }
    finally { setBusy(null) }
  }

  return <section className="space-y-5">
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FEF1F5] text-[#ED164F]"><FolderOpen size={22} /></div>
      <div><h2 className="text-lg font-bold text-gray-900">{admin ? 'Trabajos y archivos' : 'Tus espacios de trabajo'}</h2>
        <p className="mt-1 text-sm text-gray-500">{admin ? 'Creá un espacio de trabajo y compartí materiales con cada cliente.' : 'Subí material para ZAP o descargá archivos compartidos. Si ya hay trabajos, cargá cada archivo en el espacio correspondiente.'}</p>
      </div>
    </div>

    {admin && filesEnabled && <form onSubmit={createWork} className="card space-y-3 p-4">
      <h3 className="font-semibold text-gray-900">Crear trabajo</h3>
      <label className="block text-sm font-medium text-gray-700">Buscar cliente
        <input value={userSearch} onChange={e => { const value = e.target.value; setUserSearch(value); const first = users.find(user => ((user.name || '') + ' ' + user.email).toLowerCase().includes(value.toLowerCase())); setUserId(first?.id || '') }} className="input mt-1 w-full" placeholder="Nombre o email" />
      </label>
      <label className="block text-sm font-medium text-gray-700">Cliente
        <select value={userId} onChange={e => setUserId(e.target.value)} required className="input mt-1 w-full">
          {users.filter(user => ((user.name || '') + ' ' + user.email).toLowerCase().includes(userSearch.toLowerCase())).map(user => <option key={user.id} value={user.id}>{user.name || user.email} — {user.email}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-gray-700">Nombre del trabajo
        <input value={title} onChange={e => setTitle(e.target.value)} required maxLength={160} className="input mt-1 w-full" placeholder="Ej. Identidad visual, campaña de octubre…" />
      </label>
      <label className="block text-sm font-medium text-gray-700">Nota (opcional)
        <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} rows={2} className="input mt-1 w-full" placeholder="Contexto breve para el cliente" />
      </label>
      <button disabled={busy === 'create' || !userId} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"><FolderOpen size={16} /> {busy === 'create' ? 'Creando…' : 'Crear trabajo'}</button>
    </form>}

    {filesEnabled && <label className="block text-sm font-medium text-gray-700">Nota para el archivo (opcional)
      <input value={note} onChange={e => setNote(e.target.value)} maxLength={1000} className="input mt-1 w-full" placeholder={admin ? 'Ej. Primera propuesta / archivos fuente' : 'Ej. Logo actualizado, medidas, referencias…'} />
    </label>}

    {message && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p className="py-6 text-sm text-gray-500">Cargando trabajos…</p> :
      works.length === 0 ? <div className="card p-6 text-center">
        <FolderOpen size={30} className="mx-auto mb-3 text-gray-300" />
        <p className="font-medium text-gray-700">{admin ? 'Todavía no hay trabajos.' : 'Todavía no hay trabajos compartidos con tu cuenta.'}</p>
        {!admin && filesEnabled && <div className="mt-4">
          <p className="mb-3 text-sm text-gray-500">Podés enviarnos material aunque todavía no haya un trabajo creado. Lo guardaremos en un espacio general y lo organizaremos cuando corresponda.</p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#ED164F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d81245]">
            <Upload size={16} /> {busy === 'inbox' ? 'Preparando…' : 'Subir archivos para ZAP'}
            <input type="file" multiple className="sr-only" disabled={busy !== null} onChange={e => {
              const selected = e.target.files
              e.target.value = ''
              if (selected?.length) void uploadToInbox(selected)
            }} />
          </label>
          <p className="mt-3 text-xs leading-5 text-gray-400">PDF, PNG/JPG/JPEG/GIF/WEBP/SVG/TIF/TIFF, MP3/WAV/M4A/MP4/MOV/WEBM, DOC/DOCX/XLS/XLSX/PPT/PPTX/TXT/CSV, ZIP, AI/PSD/EPS/CDR. Hasta 150 MB por archivo.</p>
        </div>}
        {admin && filesEnabled && <p className="mt-2 text-sm text-gray-500">Creá un trabajo arriba para compartir archivos con un cliente.</p>}
        {!filesEnabled && <p className="mt-2 text-sm text-gray-500">Cuando ZAP apruebe una etapa de tu propuesta, el trabajo aparecerá acá. La carga de archivos se habilitará después de validar el almacenamiento.</p>}
      </div> :
      <div className="space-y-4">{works.map(work => <article key={work.id} className="card overflow-hidden">
        <div className="border-b border-gray-100 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div>
            <h3 className="font-bold text-gray-900">{work.title}</h3>
            {admin && work.user && <p className="mt-1 text-xs text-gray-500">{work.user.name || work.user.email} · {work.user.email}</p>}
            {work.description && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{work.description}</p>}
          </div><span className="text-xs text-gray-400">{new Date(work.updatedAt).toLocaleDateString('es-AR')}</span></div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {filesEnabled && <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#ED164F] px-3 py-2 text-sm font-semibold text-white hover:bg-[#d81245]">
              <Upload size={16} /> {busy === work.id ? 'Subiendo…' : 'Subir archivos'}
              <input type="file" multiple className="sr-only" disabled={busy !== null} onChange={async e => {
                const selected = Array.from(e.target.files || [])
                e.target.value = ''
                for (const file of selected) await uploadFile(work.id, file)
                setNote('')
              }} />
            </label>}
            {!filesEnabled && <span className="text-xs text-gray-400">Adjuntos: habilitación pendiente de validación</span>}
            <span className="text-xs text-gray-400">PDF, PNG/JPG/JPEG/GIF/WEBP/SVG/TIF/TIFF, MP3/WAV/M4A/MP4/MOV/WEBM, DOC/DOCX/XLS/XLSX/PPT/PPTX/TXT/CSV, ZIP, AI/PSD/EPS/CDR · hasta 150 MB</span>
            {!admin && <a href={`https://wa.me/541125832323?text=${encodeURIComponent(`Hola, necesito ayuda con el trabajo ${work.id.slice(-8)}.`)}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#c2103f] hover:underline">Consultar sobre este trabajo</a>}
          </div>
        </div>
        <section className="border-b border-gray-100 p-4">
          <button type="button" onClick={() => void toggleMessages(work.id)} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-[#c2103f]"><MessageSquare size={16} /> {openMessages === work.id ? 'Cerrar conversación' : 'Mensajes del trabajo'}</button>
          {openMessages === work.id && <div className="mt-3">
            {busy === 'messages:' + work.id ? <p className="py-3 text-sm text-gray-500">Cargando mensajes…</p> : (messages[work.id] || []).length === 0 ? <p className="py-3 text-sm text-gray-500">Todavía no hay mensajes. Usá este espacio para coordinar este trabajo.</p> : <div className="max-h-80 space-y-3 overflow-y-auto py-2">{messages[work.id].map(item => <div key={item.id} className={`max-w-[90%] rounded-xl p-3 text-sm ${item.sender.role === 'ADMIN' ? 'bg-gray-50 text-gray-700' : 'ml-auto bg-[#FEF1F5] text-gray-800'}`}><div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-gray-400"><span>{item.sender.role === 'ADMIN' ? (item.sender.name || 'Equipo ZAP') : 'Vos'}</span><time>{new Date(item.createdAt).toLocaleString('es-AR')}</time></div><p className="whitespace-pre-wrap break-words">{item.body}</p></div>)}</div>}
            <form onSubmit={e => void sendMessage(e, work.id)} className="mt-3 flex items-end gap-2"><label className="sr-only" htmlFor={'client-work-message-' + work.id}>Escribir un mensaje</label><textarea id={'client-work-message-' + work.id} value={messageDrafts[work.id] || ''} onChange={e => setMessageDrafts(current => ({ ...current, [work.id]: e.target.value }))} maxLength={4000} rows={2} className="input min-h-11 flex-1 resize-y" placeholder="Escribí un mensaje para este trabajo…"/><button disabled={busy === 'send:' + work.id || !(messageDrafts[work.id] || '').trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#ED164F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d81245] disabled:opacity-50"><Send size={15}/><span className="hidden sm:inline">Enviar</span></button></form>
          </div>}
        </section>
        <div className="divide-y divide-gray-100">
          {work.files.length === 0 ? <p className="p-4 text-sm text-gray-400">Todavía no hay archivos. Podés subir el primero.</p> :
            work.files.map(file => {
              const kind = previewKind(file)
              const currentApproval = file.approvals?.find(approval => approval.fileUpdatedAt === file.updatedAt)
              const previewUrl = '/api/client-works/files/' + file.id + '/download?inline=1&scope=' + (admin ? 'admin' : 'client')
              return <div key={file.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-gray-400">{kind === 'image' ? <ImageIcon size={20} /> : <FileText size={20} />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-gray-900">{file.fileName}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatSize(file.sizeBytes)} · {new Date(file.createdAt).toLocaleDateString('es-AR')} · {file.uploadedBy?.name || (file.uploadedById ? 'Compartido' : '')}</p>
                    {file.note && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{file.note}</p>}
                    {file.approvals?.map(approval => <div key={approval.id} className="mt-2 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600">
                      <p className="font-semibold">{approval.status === 'SUPERSEDED' || approval.fileUpdatedAt !== file.updatedAt ? 'Solicitud reemplazada por una nueva versión' : approval.status === 'PENDING' ? 'Aprobación pendiente' : approval.status === 'APPROVED' ? 'Entrega aprobada' : 'Cambios solicitados'} · {new Date(approval.requestedAt).toLocaleDateString('es-AR')}</p>
                      {approval.response && <p className="mt-1 whitespace-pre-wrap">{approval.response}</p>}
                    </div>)}
                    {admin && file.uploadedBy?.role === 'ADMIN' && currentApproval?.status !== 'PENDING' && <button type="button" disabled={busy !== null} onClick={() => void submitApproval(work.id, file, 'request')} className="mt-2 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50">Solicitar aprobación al cliente</button>}
                    {!admin && file.uploadedBy?.role === 'ADMIN' && currentApproval?.status === 'PENDING' && <div className="mt-3 space-y-2">
                      <label className="block text-xs font-medium text-gray-600">Si pedís cambios, describilos<textarea value={approvalResponses[file.id] || ''} onChange={e => setApprovalResponses(current => ({ ...current, [file.id]: e.target.value }))} maxLength={2000} rows={2} className="input mt-1 w-full" /></label>
                      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy !== null} onClick={() => void submitApproval(work.id, file, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Aprobar entrega</button><button type="button" disabled={busy !== null || !(approvalResponses[file.id] || '').trim()} onClick={() => void submitApproval(work.id, file, 'changes')} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">Solicitar cambios</button></div>
                    </div>}
                    {admin && file.cleanupError && <p className="mt-1 text-xs text-amber-700">Quedó un archivo anterior pendiente de borrar. Usá el botón de reintento.</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <a title="Descargar" href={'/api/client-works/files/' + file.id + '/download?scope=' + (admin ? 'admin' : 'client')} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"><Download size={17} /></a>
                    <button title="Reemplazar" type="button" disabled={busy !== null || !filesEnabled} onClick={() => {
                      replaceTarget.current = { workId: work.id, fileId: file.id }
                      replaceInput.current?.click()
                    }} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"><RefreshCw size={16} /></button>
                    {admin && file.cleanupError && <button title="Reintentar limpieza del archivo anterior" type="button" disabled={busy !== null} onClick={() => void retryCleanup(file)} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 disabled:opacity-40"><RefreshCw size={16} /></button>}
                    <button title="Borrar" type="button" disabled={busy !== null} onClick={() => void deleteFile(file)} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"><Trash2 size={16} /></button>
                  </div>
                </div>
                {kind === 'image' && <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-3 block"><img src={previewUrl} alt={file.fileName} loading="lazy" className="max-h-72 max-w-full rounded-lg border border-gray-100 object-contain" /></a>}
                {kind === 'pdf' && <iframe title={'Vista previa: ' + file.fileName} src={previewUrl} className="mt-3 h-72 w-full rounded-lg border border-gray-200" />}
                {kind === 'video' && <video controls preload="metadata" src={previewUrl} className="mt-3 max-h-80 w-full rounded-lg bg-black" />}
                {kind === 'audio' && <audio controls preload="metadata" src={previewUrl} className="mt-3 w-full" />}
              </div>
            })}
        </div>
      </article>)}</div>
    }
    <input ref={replaceInput} type="file" className="hidden" onChange={e => {
      const file = e.target.files?.[0]
      const target = replaceTarget.current
      e.target.value = ''
      if (file && target) void uploadFile(target.workId, file, target.fileId).then(() => setNote(''))
    }} />
  </section>
}
