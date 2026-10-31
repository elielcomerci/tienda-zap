import Link from 'next/link'
import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {notFound,redirect} from 'next/navigation'
import ProposalSharePanel from './ProposalSharePanel'
import ProposalStageReply from './ProposalStageReply'
import ProposalMaterials from '@/components/proposals/ProposalMaterials'
import ProposalPrintActions from '@/components/proposals/ProposalPrintActions'
export const dynamic='force-dynamic'
const labels:Record<string,string>={ACCEPTED:'Aprobada',PENDING:'Pendiente',QUERY:'Consulta',CHANGES_REQUESTED:'Cambios solicitados',REJECTED:'No aprobada'}
export default async function ProposalDetailPage({params}:{params:Promise<{proposalId:string}>}){
 const s=await auth();if(s?.user?.role!=='ADMIN')redirect('/login')
 const{proposalId}=await params
 const p=await prisma.commercialProposal.findUnique({where:{id:proposalId},include:{customer:{select:{name:true,email:true}},businessAccount:{select:{name:true,legalName:true}},materials:{orderBy:{sortOrder:'asc'}},stages:{orderBy:{position:'asc'},include:{comments:{orderBy:{createdAt:'asc'}}}},invitations:{orderBy:{createdAt:'desc'},take:5}}})
 if(!p)notFound()
 const sections=[['Introducción',p.summary],['Lo que entendimos',p.diagnosis],['Nuestra mirada',p.solution],['Alcance general',p.scope],['Entregables generales',p.deliverables],['Plazos generales',p.timeline],['Consideraciones',p.conditions],['Modalidad de pago',p.paymentTerms]] as const
 const visible=sections.filter(([,v])=>typeof v==='string'&&v.trim())
 const recipient=p.businessAccount?.name||p.customer?.name||p.targetEmail||'Cliente'
 return <div className="proposal-print-shell mx-auto max-w-4xl space-y-6">
  <div className="no-print"><Link href="/admin/propuestas" className="text-sm text-gray-500">← Propuestas</Link><h1 className="mt-2 text-3xl font-semibold">{p.title}</h1><p className="mt-1 text-sm text-gray-500">{recipient} · Versión {p.version}</p></div>
  <ProposalPrintActions />
  <header className="proposal-print-section border-b border-gray-200 pb-7"><div className="flex items-start justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-zap-magenta">ZAP</p><p className="mt-2 text-xs font-semibold uppercase tracking-[.16em] text-gray-500">Propuesta comercial {p.version>1?`· v${p.version}`:''}</p></div><div className="text-right text-xs text-gray-500"><p>{new Date().toLocaleDateString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}</p><p className="mt-1">{recipient}</p></div></div><h1 className="mt-7 text-3xl font-semibold tracking-tight text-gray-950">{p.title}</h1></header>
  <div className="no-print"><Link href={'/admin/propuestas/'+p.id+'/editar'} className="rounded-xl border px-4 py-2 text-sm font-semibold">Editar propuesta</Link></div>
  <div className="no-print"><ProposalSharePanel proposalId={p.id} initialInvites={p.invitations.map(i=>({createdAt:i.createdAt.toISOString(),expiresAt:i.expiresAt?.toISOString()||null,revoked:!!i.revokedAt}))} hasActiveInvite={p.invitations.some(i=>!i.revokedAt&&(!i.expiresAt||i.expiresAt>new Date()))}/></div>
  {visible.length>0&&<section className="proposal-print-section rounded-2xl border bg-white p-6"><h2 className="font-semibold">Presentación general</h2><div className="mt-5 space-y-5">{visible.map(([t,v])=><div key={t} className="proposal-print-section"><h3 className="text-sm font-semibold">{t}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-gray-600">{v}</p></div>)}</div></section>}
  <ProposalMaterials proposalId={p.id} canManage={true} materials={p.materials.map(m=>({...m,createdAt:m.createdAt.toISOString()}))}/>
  {p.stages.length>0&&<section className="proposal-print-section rounded-2xl border bg-white p-6"><h2 className="font-semibold">Soluciones propuestas</h2><div className="mt-5 space-y-6">{p.stages.map(x=><div key={x.id} className="proposal-print-stage border-t pt-5 first:border-0 first:pt-0"><div className="flex justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{x.track==='LATER'?'Desarrollo a futuro':'Prioridad inmediata'}</p><h3 className="mt-1 font-semibold">{x.position+1}. {x.title}</h3></div><span className="no-print rounded-full bg-gray-100 px-3 py-1 text-xs">{labels[x.status]||x.status}</span></div>{x.description&&<p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{x.description}</p>}{x.scope&&<div className="mt-3"><p className="text-xs font-semibold text-gray-500">Alcance</p><p className="mt-1 whitespace-pre-wrap text-sm">{x.scope}</p></div>}{x.deliverables&&<div className="mt-3"><p className="text-xs font-semibold text-gray-500">Entregables</p><p className="mt-1 whitespace-pre-wrap text-sm">{x.deliverables}</p></div>}{x.timeline&&<p className="mt-3 text-sm"><strong>Plazo:</strong> {x.timeline}</p>}{x.amount!=null&&<p className="mt-2 font-semibold">{new Intl.NumberFormat('es-AR',{style:'currency',currency:x.currency}).format(Number(x.amount))}</p>}{x.paymentTerms&&<p className="mt-2 whitespace-pre-wrap text-sm">{x.paymentTerms}</p>}{x.conditions&&<p className="mt-2 whitespace-pre-wrap text-sm">{x.conditions}</p>}<div className="no-print">{x.clientWorkId&&<p className="mt-2 text-sm text-emerald-700">Trabajo creado: {x.clientWorkId} · <Link href="/admin/trabajos" className="font-semibold underline">Abrir trabajos</Link></p>}{x.comments.map(c=><div key={c.id} className="mt-3 rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{c.authorName||c.authorRole} · {c.action||'Comentario'} · {new Date(c.createdAt).toLocaleString('es-AR')}</p>{c.message&&<p className="mt-1 whitespace-pre-wrap text-sm">{c.message}</p>}</div>)}<ProposalStageReply proposalId={p.id} stageId={x.id}/></div></div>)}</div></section>}
  <footer className="proposal-print-section border-t border-gray-200 pt-5 text-sm text-gray-500"><strong className="text-gray-900">ZAP Agencia Creativa</strong><p className="mt-1">Estrategia, creatividad, diseño y tecnología.</p></footer>
 </div>
}
