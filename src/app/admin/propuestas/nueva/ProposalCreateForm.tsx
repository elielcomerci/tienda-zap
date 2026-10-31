'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import WelcomeCouponModal, { type WelcomeProductOption, type WelcomePromotionOption } from './WelcomeCouponModal'

type AccountOption = { id: string; name: string; email?: string | null }
type Stage = { title: string; track: string; description: string; scope: string; deliverables: string; timeline: string; amount: string; paymentTerms: string; conditions: string }
type NewClient = { name: string; legalName: string; taxId: string; contactName: string; phone: string; whatsapp: string }
const emptyClient: NewClient = { name: '', legalName: '', taxId: '', contactName: '', phone: '', whatsapp: '' }
const emptyStage = (title = '', track = 'NOW'): Stage => ({ title, track, description: '', scope: '', deliverables: '', timeline: '', amount: '', paymentTerms: '', conditions: '' })
const inputClass = 'input'
const labelClass = 'label'

export default function ProposalCreateForm({ accounts, promotions, products }: { accounts: AccountOption[]; promotions: WelcomePromotionOption[]; products: WelcomeProductOption[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)
  const [welcomeCouponPromotionName, setWelcomeCouponPromotionName] = useState('')
  const [welcomeCouponRecipientEmail, setWelcomeCouponRecipientEmail] = useState('')
  const [couponNotice, setCouponNotice] = useState('')
  const [businessAccountId, setBusinessAccountId] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)
  const [newClient, setNewClient] = useState<NewClient>(emptyClient)
  const [fields, setFields] = useState({ title: '', targetEmail: '', welcomeCouponCode: '', summary: '', diagnosis: '', solution: '', youtubeUrl: '', referenceUrl: '' })
  const [stages, setStages] = useState<Stage[]>([emptyStage()])
  const selectedAccount = accounts.find(account => account.id === businessAccountId)
  const recipientBusiness = creatingClient ? newClient.name : selectedAccount?.name || ''
  const recipientName = creatingClient ? newClient.contactName : ''
  const recipientPhone = creatingClient ? (newClient.phone || newClient.whatsapp) : ''
  const setField = (key: keyof typeof fields, value: string) => setFields(current => ({ ...current, [key]: value }))
  const setTargetEmail = (value: string) => {
    setField('targetEmail', value)
    if (fields.welcomeCouponCode && welcomeCouponRecipientEmail && value.trim().toLowerCase() !== welcomeCouponRecipientEmail) {
      setField('welcomeCouponCode', '')
      setWelcomeCouponPromotionName('')
      setWelcomeCouponRecipientEmail('')
      setCouponNotice('Cambió el email del destinatario. Creá un nuevo cupón para asociarlo correctamente.')
    }
  }
  const setClientField = (key: keyof NewClient, value: string) => setNewClient(current => ({ ...current, [key]: value }))
  const setStage = (index: number, key: keyof Stage, value: string) => setStages(current => current.map((stage, i) => i === index ? { ...stage, [key]: value } : stage))
  const field = (key: keyof typeof fields, title: string, multiline = false) => <label className="block">
    <span className={labelClass}>{title}</span>
    {multiline ? <textarea className={inputClass} rows={3} value={fields[key]} onChange={event => setField(key, event.target.value)} /> : <input className={inputClass} value={fields[key]} onChange={event => setField(key, event.target.value)} />}
  </label>
  const clientField = (key: keyof NewClient, title: string, required = false) => <label className="block">
    <span className={labelClass}>{title}{required ? ' *' : ' (opcional)'}</span>
    <input className={inputClass} required={required} value={newClient[key]} onChange={event => setClientField(key, event.target.value)} />
  </label>
  const stageField = (index: number, key: keyof Stage, title: string, multiline = false) => <label className="block">
    <span className={labelClass}>{title}</span>
    {multiline ? <textarea className={inputClass} rows={3} value={stages[index][key]} onChange={event => setStage(index, key, event.target.value)} /> : <input className={inputClass} value={stages[index][key]} onChange={event => setStage(index, key, event.target.value)} />}
  </label>

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!stages.length) return setError('Agregá al menos una solución.')
    if (stages.some(stage => !stage.title.trim())) return setError('Cada solución necesita un nombre.')
    if (!creatingClient && !businessAccountId) return setError('Seleccioná una cuenta existente o creá el cliente.')
    if (creatingClient && !newClient.name.trim()) return setError('El nombre del cliente es obligatorio.')
    setBusy(true)
    try {
      const response = await fetch('/api/admin/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, businessAccountId: creatingClient ? null : businessAccountId || null, newBusinessAccount: creatingClient ? newClient : null, stages }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos guardar la propuesta.')
      router.push('/admin/propuestas/' + data.proposal.id)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar la propuesta.')
      setBusy(false)
    }
  }

  return <>
  <form onSubmit={submit} className="mx-auto max-w-4xl space-y-5">
    <section className="card p-5 sm:p-7">
      <h2 className="text-base font-semibold tracking-tight text-gray-950">Cliente</h2>
      <p className="mt-1 text-sm text-gray-500">Buscá un cliente del CRM o crealo. El email identifica su acceso a ZAP.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {field('title', 'Título de la propuesta')}
        <label className="block"><span className={labelClass}>Cliente existente</span><select className={inputClass} value={businessAccountId} disabled={creatingClient} onChange={event => { const id=event.target.value; setBusinessAccountId(id); const account=accounts.find(item=>item.id===id); if(account?.email) setTargetEmail(account.email) }}><option value="">Elegí una cuenta del CRM</option>{accounts.map(account=><option key={account.id} value={account.id}>{account.name}{account.email?' · '+account.email:''}</option>)}</select></label>
        <label className="block"><span className={labelClass}>Email de acceso a ZAP *</span><input type="email" required autoComplete="email" className={inputClass} value={fields.targetEmail} onChange={event => setTargetEmail(event.target.value)} placeholder="nombre@empresa.com"/><span className="mt-1 block text-xs text-gray-500">Le enviaremos la invitación a esta dirección. El acceso a ZAP no depende de aceptar la propuesta.</span></label>
      </div>
      <div className="mt-5 border-t border-gray-100 pt-4">
        <button type="button" className="btn-secondary" onClick={()=>{setCreatingClient(value=>!value);setBusinessAccountId('')}}>{creatingClient?'Cancelar alta de cliente':'＋ Crear un cliente nuevo'}</button>
        {creatingClient&&<div className="mt-4 rounded-2xl border border-gray-200 p-4 sm:p-5">
          <p className="text-sm text-gray-600">Solo el nombre es obligatorio. Los demás datos pueden completarse ahora o más adelante.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {clientField('name','Nombre del cliente o negocio',true)}
            {clientField('legalName','Razón social')}
            {clientField('taxId','CUIT / DNI')}
            {clientField('contactName','Persona de contacto')}
            {clientField('phone','Teléfono')}
            {clientField('whatsapp','WhatsApp')}
          </div>
        </div>}
      </div>
    </section>
    <section className="card p-5 sm:p-7">
      <h2 className="text-base font-semibold tracking-tight text-gray-950">La mirada de ZAP</h2>
      <p className="mt-1 text-sm text-gray-500">El contexto que entendimos, el desafío y nuestra recomendación. Los campos vacíos no aparecen.</p>
      <div className="mt-5 space-y-4">{field('summary','Contexto',true)}{field('diagnosis','El desafío',true)}{field('solution','Nuestra mirada',true)}</div>
    </section>
    <section className="card p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold tracking-tight text-gray-950">Soluciones propuestas</h2><p className="mt-1 text-sm text-gray-500">Cada solución se presenta y se decide por separado. Podés combinar servicios, medios y horizontes de trabajo.</p></div><button type="button" onClick={()=>setStages(current=>[...current,emptyStage()])} className="shrink-0 btn-secondary">Agregar solución</button></div>
      <div className="mt-5 space-y-3">{stages.map((stage,index)=><article key={index} className="rounded-xl border border-gray-200 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[.12em] text-gray-500">Solución {index+1}</p>{stages.length>1&&<button type="button" onClick={()=>setStages(current=>current.filter((_,i)=>i!==index))} className="text-xs font-medium text-gray-500 underline underline-offset-4">Quitar</button>}</div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className={labelClass}>Horizonte</span><select className={inputClass} value={stage.track} onChange={event=>setStage(index,'track',event.target.value)}><option value="NOW">Prioridad inmediata</option><option value="LATER">Desarrollo a futuro</option></select></label>{stageField(index,'title','Nombre de la solución')}{stageField(index,'timeline','Plazo')}</div>
        <details className="group mt-4 border-t border-gray-100 pt-3"><summary className="cursor-pointer list-none text-sm font-medium text-gray-700"><span className="group-open:hidden">Definir alcance e inversión +</span><span className="hidden group-open:inline">Ocultar detalles −</span></summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2">{stageField(index,'description','Presentación',true)}</div>{stageField(index,'scope','Alcance',true)}{stageField(index,'deliverables','Entregables',true)}{stageField(index,'amount','Inversión')}{stageField(index,'paymentTerms','Modalidad de pago',true)}<div className="sm:col-span-2">{stageField(index,'conditions','Consideraciones',true)}</div></div></details>
      </article>)}</div>
    </section>
    <section className="card p-5 sm:p-7">
      <h2 className="text-base font-semibold tracking-tight text-gray-950">Referencias</h2>
      <p className="mt-1 text-sm text-gray-500">Podés sumar archivos y más enlaces desde el detalle una vez creada la propuesta.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{field('youtubeUrl','Enlace de YouTube (opcional)')}{field('referenceUrl','Otro enlace (opcional)')}</div>
    </section>
    <section className="card p-5 sm:p-7">
      <h2 className="text-base font-semibold tracking-tight text-gray-950">Acceso y beneficios</h2>
      <p className="mt-1 text-sm text-gray-500">Asociá un cupón existente o creá uno sin salir de la propuesta. Se presenta al terminar de revisar las soluciones.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="block"><span className={labelClass}>Código de cupón</span><input className={inputClass} value={fields.welcomeCouponCode} onChange={event=>{setField('welcomeCouponCode',event.target.value);setWelcomeCouponPromotionName('');setWelcomeCouponRecipientEmail('');setCouponNotice('')}} placeholder="ZAP-XXXXXXXX-X" autoCapitalize="characters" autoCorrect="off"/><span className="mt-1 block text-xs text-gray-500">Se ofrece al ingresar al dashboard y queda asociado a la cuenta. Se respetan la vigencia, los productos y todas las condiciones configuradas.</span></label>
        <button type="button" onClick={()=>setIsCouponModalOpen(true)} className="btn-secondary whitespace-nowrap">＋ Crear cupón</button>
      </div>
      {welcomeCouponPromotionName && fields.welcomeCouponCode && <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">Creado desde la promoción <strong className="text-gray-900">{welcomeCouponPromotionName}</strong>.</p>}
      {couponNotice && <p role="status" className="mt-2 text-xs text-amber-700">{couponNotice}</p>}
    </section>
    {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex justify-end gap-3 pb-6"><button type="button" onClick={()=>router.push('/admin/propuestas')} className="btn-secondary">Cancelar</button><button disabled={busy} className="btn-primary disabled:opacity-50">{busy?'Guardando…':'Guardar propuesta'}</button></div>
  </form>
  {isCouponModalOpen && <WelcomeCouponModal
    promotions={promotions}
    products={products}
    recipientEmail={fields.targetEmail}
    recipientName={recipientName}
    recipientBusiness={recipientBusiness}
    recipientPhone={recipientPhone}
    proposalTitle={fields.title}
    onClose={()=>setIsCouponModalOpen(false)}
    onCreated={(code,promotionName)=>{setField('welcomeCouponCode',code);setWelcomeCouponPromotionName(promotionName);setWelcomeCouponRecipientEmail(fields.targetEmail.trim().toLowerCase());setCouponNotice('');setIsCouponModalOpen(false)}}
  />}
  </>
}
