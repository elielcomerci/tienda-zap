'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'

type Stage={id?:string;title:string;track:string;description:string;scope:string;deliverables:string;timeline:string;conditions:string;amount:string;paymentTerms:string;locked?:boolean}
type Fields={title:string;summary:string;diagnosis:string;solution:string;scope:string;deliverables:string;timeline:string;conditions:string;amount:string;paymentTerms:string}
const emptyStage=():Stage=>({title:'',track:'NOW',description:'',scope:'',deliverables:'',timeline:'',conditions:'',amount:'',paymentTerms:''})
const cls='input'
const label='label'
export default function ProposalEditForm({proposalId,version,initial,initialStages}:{proposalId:string;version:number;initial:Fields;initialStages:Stage[]}) {
  const router=useRouter()
  const [fields,setFields]=useState(initial)
  const [stages,setStages]=useState(initialStages)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const set=(key:keyof Fields,value:string)=>setFields(current=>({...current,[key]:value}))
  const setStage=(index:number,key:keyof Stage,value:string)=>setStages(current=>current.map((stage,i)=>i===index?{...stage,[key]:value}:stage))
  const field=(key:keyof Fields,title:string,multiline=false)=><label><span className={label}>{title}</span>{multiline?<textarea className={cls} rows={4} value={fields[key]} onChange={e=>set(key,e.target.value)}/>:<input className={cls} value={fields[key]} onChange={e=>set(key,e.target.value)}/>}</label>
  const stageField=(stage:Stage,index:number,key:keyof Stage,title:string,multiline=false)=><label><span className={label}>{title}</span>{multiline?<textarea className={cls} rows={3} disabled={stage.locked} value={String(stage[key]||'')} onChange={e=>setStage(index,key,e.target.value)}/>:<input className={cls} disabled={stage.locked} value={String(stage[key]||'')} onChange={e=>setStage(index,key,e.target.value)} />}</label>
  async function save(e:React.FormEvent) {
    e.preventDefault();setBusy(true);setError('')
    try {
      const response=await fetch('/api/admin/proposals/'+proposalId,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,expectedVersion:version,stages:stages.map(({locked,...stage})=>stage)})})
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||'No pudimos guardar los cambios.')
      router.push('/admin/propuestas/'+proposalId);router.refresh()
    } catch(cause) {setError(cause instanceof Error?cause.message:'Error al guardar.');setBusy(false)}
  }
  return <form onSubmit={save} className="mx-auto max-w-4xl space-y-6">
    <section className="card p-6"><h2 className="font-semibold">Presentación</h2><p className="mt-1 text-sm text-gray-500">Lo que dejes vacío no aparece en la propuesta.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{field('title','Título de la propuesta')}{field('amount','Inversión general')}{field('summary','Contexto',true)}{field('diagnosis','El desafío',true)}{field('solution','Nuestra mirada',true)}{field('scope','Alcance general',true)}{field('deliverables','Entregables generales',true)}{field('timeline','Plazos generales',true)}{field('conditions','Consideraciones',true)}{field('paymentTerms','Modalidad de pago',true)}</div></section>
    <section className="card p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Soluciones propuestas</h2><p className="mt-1 text-sm text-gray-500">Cada solución se decide por separado. Las aprobadas y convertidas en trabajo quedan protegidas.</p></div><button type="button" onClick={()=>setStages(current=>[...current,emptyStage()])} className="btn-secondary">Agregar solución</button></div>
      <div className="mt-5 space-y-5">{stages.map((stage,index)=><div key={stage.id||'new-'+index} className="rounded-xl border p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Solución {index+1}: {stage.title||'Nueva solución'}</h3>{stage.locked&&<span className="text-xs text-gray-500">Trabajo iniciado · bloqueada</span>}</div><div className="grid gap-3 sm:grid-cols-2"><label><span className={label}>Horizonte</span><select disabled={stage.locked} className={cls} value={stage.track||'NOW'} onChange={e=>setStage(index,'track',e.target.value)}><option value="NOW">Prioridad inmediata</option><option value="LATER">Desarrollo a futuro</option></select></label>{stageField(stage,index,'title','Nombre de la solución')}{stageField(stage,index,'timeline','Plazo')}{stageField(stage,index,'description','Presentación',true)}{stageField(stage,index,'scope','Alcance',true)}{stageField(stage,index,'deliverables','Entregables',true)}{stageField(stage,index,'amount','Inversión')}{stageField(stage,index,'paymentTerms','Modalidad de pago',true)}{stageField(stage,index,'conditions','Consideraciones',true)}</div></div>)}</div>
    </section>
    {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex justify-end gap-3"><button type="button" onClick={()=>router.back()} className="btn-secondary">Cancelar</button><button disabled={busy} className="btn-primary disabled:opacity-50">{busy?'Guardando…':'Guardar nueva versión'}</button></div>
  </form>
}
