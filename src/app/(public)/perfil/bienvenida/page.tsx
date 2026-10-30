import {auth} from '@/auth'
import {prisma} from '@/lib/prisma'
import {redirect} from 'next/navigation'
import ProposalOnboardingForm from './ProposalOnboardingForm'

export const dynamic='force-dynamic'

export default async function ProposalWelcomePage({searchParams}:{searchParams:Promise<{callbackUrl?:string}>}) {
  const {callbackUrl:requested}=await searchParams
  const callbackUrl=requested&&requested.startsWith('/')&&!requested.startsWith('//')&&!requested.includes('\\')&&!/%5c/i.test(requested)&&!/[\u0000-\u001f\u007f]/.test(requested)?requested:'/perfil'
  const session=await auth()
  if(!session?.user?.id) redirect('/login?callbackUrl='+encodeURIComponent('/perfil/bienvenida?callbackUrl='+callbackUrl))
  const [user,onboarding]=await Promise.all([
    prisma.user.findUnique({where:{id:session.user.id},select:{name:true,email:true}}),
    prisma.proposalClientOnboarding.findUnique({where:{userId:session.user.id},select:{completedAt:true}})
  ])
  if(onboarding?.completedAt) redirect(callbackUrl)
  return <ProposalOnboardingForm callbackUrl={callbackUrl} initialName={user?.name||''} email={user?.email||session.user.email||''}/>
}
