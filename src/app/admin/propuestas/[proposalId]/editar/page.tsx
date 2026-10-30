import Link from 'next/link'
import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {notFound,redirect} from 'next/navigation'
import ProposalEditForm from '../ProposalEditForm'

export const dynamic='force-dynamic'

export default async function EditProposalPage({params}:{params:Promise<{proposalId:string}>}) {
  const session=await auth()
  if(session?.user?.role!=='ADMIN') redirect('/login')
  const {proposalId}=await params
  const proposal=await prisma.commercialProposal.findUnique({
    where:{id:proposalId},
    include:{stages:{orderBy:{position:'asc'}}}
  })
  if(!proposal) notFound()
  return <main className="px-4 py-8 sm:px-6">
    <div className="mx-auto mb-6 max-w-4xl">
      <Link href={'/admin/propuestas/'+proposalId} className="text-sm text-gray-500">← Volver a la propuesta</Link>
      <h1 className="mt-2 text-3xl font-semibold">Editar propuesta</h1>
      <p className="mt-1 text-sm text-gray-500">Versión actual: {proposal.version}. Los cambios se guardan como una nueva versión.</p>
    </div>
    <ProposalEditForm proposalId={proposal.id} version={proposal.version}
      initial={{
        title:proposal.title,summary:proposal.summary||'',diagnosis:proposal.diagnosis||'',solution:proposal.solution||'',
        scope:proposal.scope||'',deliverables:proposal.deliverables||'',timeline:proposal.timeline||'',
        conditions:proposal.conditions||'',amount:proposal.amount?.toString()||'',paymentTerms:proposal.paymentTerms||''
      }}
      initialStages={proposal.stages.map(stage=>({
        id:stage.id,title:stage.title,description:stage.description||'',scope:stage.scope||'',
        deliverables:stage.deliverables||'',timeline:stage.timeline||'',conditions:stage.conditions||'',
        amount:stage.amount?.toString()||'',paymentTerms:stage.paymentTerms||'',locked:!!stage.clientWorkId
      }))}
    />
  </main>
}
