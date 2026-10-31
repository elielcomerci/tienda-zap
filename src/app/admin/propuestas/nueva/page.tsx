import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProposalCreateForm from './ProposalCreateForm'

export const dynamic = 'force-dynamic'
export default async function NewProposalPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/login')
  const {q:rawQuery,page:rawPage}=await searchParams
  const q=(rawQuery||'').trim().slice(0,100)
  const page=Math.max(1,Number.parseInt(rawPage||'1',10)||1)
  const where=q?{OR:[{name:{contains:q,mode:'insensitive' as const}},{legalName:{contains:q,mode:'insensitive' as const}},{taxId:{contains:q,mode:'insensitive' as const}},{contacts:{some:{email:{contains:q,mode:'insensitive' as const}}}}]}:undefined
  const [accounts,total] = await Promise.all([
    prisma.businessAccount.findMany({where,select:{id:true,name:true,contacts:{where:{isPrimary:true},take:1,select:{email:true}}},orderBy:{updatedAt:'desc'},skip:(page-1)*500,take:500}),
    prisma.businessAccount.count({where})
  ])
  const accountOptions=accounts.map(account=>({id:account.id,name:account.name,email:account.contacts[0]?.email||null}))
  const pages=Math.max(1,Math.ceil(total/500))
  return <div className="mx-auto max-w-4xl space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-gray-500">Equipo comercial / Propuestas</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Nueva propuesta</h1><p className="mt-2 text-sm text-gray-500">Armá el planteo comercial. El importe es opcional y el enlace se genera una vez guardada.</p></div>
    <section className="rounded-2xl border border-gray-200 bg-white p-4"><form method="get" className="flex flex-col gap-2 sm:flex-row"><input name="q" defaultValue={q} placeholder="Buscar por nombre, razón social, CUIT o email" className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm"/><button className="rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white">Buscar</button></form><div className="mt-3 flex items-center justify-between text-xs text-gray-500"><span>{total} clientes · mostrando {accounts.length}</span><span>Página {page} de {pages}</span></div>{pages>1&&<div className="mt-3 flex gap-2 text-sm">{page>1&&<Link className="rounded-lg border px-3 py-1.5" href={`?q=${encodeURIComponent(q)}&page=${page-1}`}>Anterior</Link>}{page<pages&&<Link className="rounded-lg border px-3 py-1.5" href={`?q=${encodeURIComponent(q)}&page=${page+1}`}>Siguiente</Link>}</div>}</section>
    <ProposalCreateForm accounts={accountOptions} />
  </div>
}
