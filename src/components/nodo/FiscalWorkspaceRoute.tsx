import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'
import FiscalOnboardingClient from '@/components/fiscal/FiscalOnboardingClient'
import FiscalWorkspaceClient, { type FiscalWorkspaceSection } from '@/components/fiscal/FiscalWorkspaceClient'

export default async function FiscalWorkspaceRoute({ section }: { section: FiscalWorkspaceSection }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ownAccount = await prisma.fiscalClientAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!ownAccount) {
    return <FiscalOnboardingClient provisioningEnabled={await isFiscalFeatureEnabled('accountProvisioning')} />
  }

  return <main className="min-h-screen bg-[#FAF9F6]"><FiscalWorkspaceClient accountId={ownAccount?.id} section={section} /></main>
}
