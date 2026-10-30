import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Propuestas comerciales | ZAP Admin' }
const labels: Record<string, string> = { DRAFT: 'Borrador', SHARED: 'Compartida', VIEWED: 'Vista', PENDING: 'Pendiente', QUERY: 'Consulta solicitada', ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', EXPIRED: 'Vencida', CANCELLED: 'Cancelada' }

export default async function ProposalsPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/login')
  const {q:rawQuery,page:rawPage}=await searchParams
  const q=(rawQuery||'').trim().slice(0,120)
  const page=Math.max(1,Number.parseInt(rawPage||'1',10)||1)
  const where=q?{OR:[{title:{contains:q,mode:'insensitive' as const}},{targetEmail:{contains:q,mode:'insensitive' as const}},{customer:{is:{name:{contains:q,mode:'insensitive' as const}}}},{businessAccount:{is:{name:{contains:q,mode:'insensitive' as const}}}}]}:undefined
  const [proposals,total]=await Promise.all([
    prisma.commercialProposal.findMany({where,orderBy:{updatedAt:'desc'},skip:(page-1)*50,take:50,include:{customer:{select:{name:true,email:true}},businessAccount:{select:{name:true}},_count:{select:{materials:true,invitations:true}}}}),
    prisma.commercialProposal.count({where})
  ])
  const pages=Math.max(1,Math.ceil(total/50))
  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-gray-500">Equipo comercial</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Propuestas</h1><p className="mt-2 text-sm text-gray-500">Prepará una propuesta, compartila en privado y seguí la respuesta desde acá.</p></div><Link href="/admin/propuestas/nueva" className="inline-flex items-center justify-center rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">Nueva propuesta</Link></header>
    <form method="get" className="flex flex-col gap-2 sm:flex-row"><input name="q" defaultValue={q} placeholder="Buscar por propuesta, cliente o email" className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"/><button className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold">Buscar</button><span className="self-center text-xs text-gray-500">{total} propuestas · página {page} de {pages}</span></form>
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">{proposals.length===0?<div className="px-6 py-16 text-center"><h2 className="text-lg font-semibold text-gray-900">No encontramos propuestas</h2><p className="mt-2 text-sm text-gray-500">Probá con otro término o creá una nueva.</p></div>:<div className="divide-y divide-gray-100">{proposals.map(p=><Link key={p.id} href={`/admin/propuestas/${p.id}`} className="flex flex-col gap-2 p-5 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-gray-900">{p.title}</p><p className="mt-1 text-sm text-gray-500">{p.businessAccount?.name||p.customer?.name||p.targetEmail||'Sin cliente asociado'} · Actualizada {new Date(p.updatedAt).toLocaleDateString('es-AR')}</p></div><div className="flex items-center gap-3 text-xs text-gray-500"><span>{p.amount==null?'Inversión a definir':new Intl.NumberFormat('es-AR',{style:'currency',currency:p.currency,maximumFractionDigits:0}).format(Number(p.amount))}</span><span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-700">{labels[p.status]||p.status}</span><span>{p._count.materials} adj. · {p._count.invitations} enlaces</span></div></Link>)}</div>}</div>
    {pages>1&&<nav className="flex items-center justify-between text-sm"><span className="text-gray-500">Página {page} de {pages}</span><div className="flex gap-2">{page>1&&<Link className="rounded-lg border border-gray-300 px-3 py-2" href={`?q=${encodeURIComponent(q)}&page=${page-1}`}>Anterior</Link>}{page<pages&&<Link className="rounded-lg border border-gray-300 px-3 py-2" href={`?q=${encodeURIComponent(q)}&page=${page+1}`}>Siguiente</Link>}</div></nav>}
  </div>
}
