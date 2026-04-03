import { getCurrentUserCreditEligibility } from '@/lib/credits'
import { getFinancingSnapshot } from '@/lib/financing'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const financingSnapshot = await getFinancingSnapshot()
    const eligibility = await getCurrentUserCreditEligibility(financingSnapshot)

    let userProfile = undefined
    if (eligibility.authenticated) {
      const session = await auth()
      if (session?.user?.id) {
        userProfile = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            name: true,
            email: true,
            phone: true,
            documentId: true,
            billingAddress: true,
            billingCity: true,
            billingProvince: true,
            shippingAddress: true,
            shippingCity: true,
            shippingProvince: true,
            shippingPostalCode: true,
          }
        })
      }
    }

    return Response.json({
      ...eligibility,
      defaultInstallments: financingSnapshot.settings.defaultInstallments,
      defaultPaymentFrequency: financingSnapshot.settings.defaultPaymentFrequency,
      userProfile,
    })
  } catch (error: any) {
    return Response.json(
      {
        error: error?.message || 'No pudimos validar tu estado crediticio.',
      },
      { status: 500 }
    )
  }
}
