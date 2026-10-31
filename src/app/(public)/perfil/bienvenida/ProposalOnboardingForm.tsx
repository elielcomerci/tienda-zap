'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'

const objectives=[
  ['CONSEGUIR_CLIENTES','Conseguir más clientes'],
  ['ORDENAR_NEGOCIO','Ordenar y hacer crecer el negocio'],
  ['MEJORAR_MARCA','Mejorar la marca'],
  ['MEJORAR_PRESENCIA','Mejorar la presencia y comunicación'],
  ['AUTOMATIZAR_PROCESOS','Automatizar procesos'],
  ['DESARROLLAR_SISTEMAS','Desarrollar sistemas o herramientas'],
  ['OTRO','Otro objetivo']
] as const
const tax=[
  ['RESPONSABLE_INSCRIPTO','Responsable inscripto'],
  ['MONOTRIBUTO','Monotributo'],
  ['EXENTO','Exento'],
  ['NO_ESTOY_SEGURO','No estoy seguro'],
  ['OTRA','Otra situación']
] as const

export default function ProposalOnboardingForm({callbackUrl,initialName,email}:{callbackUrl:string;initialName:string;email:string}) {
  const router=useRouter()
  const [step,setStep]=useState(0)
  const [name,setName]=useState(initialName)
  const [taxSituation,setTaxSituation]=useState('')
  const [selected,setSelected]=useState<string[]>([])
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  function toggle(value:string){setSelected(current=>current.includes(value)?current.filter(item=>item!==value):[...current,value])}
  async function submit() {
    setBusy(true);setError('')
    try {
      const response=await fetch('/api/perfil/propuesta-onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,taxSituation,objectives:selected,callbackUrl})})
      const data=await response.json()
      if(!response.ok) throw new Error(data.error||'No pudimos guardar tus datos.')
      router.replace(data.callbackUrl||callbackUrl);router.refresh()
    } catch(cause) {setError(cause instanceof Error?cause.message:'No pudimos guardar tus datos.');setBusy(false)}
  }
  return <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
    <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.16em] text-gray-500">Tu espacio ZAP · Paso {step+1} de 3</p><div className="mt-3 flex gap-2">{[0,1,2].map(item=><span key={item} className={'h-1.5 flex-1 rounded-full '+(item<=step?'bg-gray-950':'bg-gray-200')}/>)}</div></div>
    <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
      {step===0&&<div><h1 className="text-2xl font-semibold">Empecemos por conocerte.</h1><p className="mt-2 text-sm text-gray-500">Son unos pocos datos para que podamos trabajar mejor.</p><div className="mt-6 space-y-4"><label className="block text-sm font-medium">Nombre y apellido<input value={name} onChange={e=>setName(e.target.value)} maxLength={120} className="mt-1 w-full rounded-xl border px-3 py-3" placeholder="Tu nombre completo"/></label><label className="block text-sm font-medium">Email<input value={email} disabled className="mt-1 w-full rounded-xl border bg-gray-50 px-3 py-3 text-gray-500"/></label></div></div>}
      {step===1&&<div><h1 className="text-2xl font-semibold">¿Cuál es tu situación fiscal?</h1><p className="mt-2 text-sm text-gray-500">Nos ayuda a preparar correctamente una eventual contratación o facturación.</p><div className="mt-6 space-y-2">{tax.map(([value,label])=><label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm"><input type="radio" name="taxSituation" checked={taxSituation===value} onChange={()=>setTaxSituation(value)}/>{label}</label>)}</div></div>}
      {step===2&&<div><h1 className="text-2xl font-semibold">¿Qué te gustaría lograr?</h1><p className="mt-2 text-sm text-gray-500">Podés elegir más de uno. Esto nos ayuda a entender qué es importante para vos.</p><div className="mt-6 space-y-2">{objectives.map(([value,label])=><label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={selected.includes(value)} onChange={()=>toggle(value)}/>{label}</label>)}</div></div>}
      {error&&<p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-7 flex items-center justify-between gap-3"><button type="button" onClick={()=>step===0?router.back():setStep(value=>value-1)} className="rounded-xl border px-4 py-3 text-sm">{step===0?'Volver':'Atrás'}</button>{step<2?<button type="button" disabled={step===0&&name.trim().length<2||step===1&&!taxSituation} onClick={()=>setStep(value=>value+1)} className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Continuar</button>:<button type="button" onClick={submit} disabled={busy||selected.length===0} className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy?'Guardando…':'Finalizar'}</button>}</div>
    </section>
    <p className="mt-4 text-center text-xs text-gray-400">Tus datos se usan para organizar la relación comercial con ZAP.</p>
  </main>
}
