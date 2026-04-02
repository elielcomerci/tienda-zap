import { getCurrentUserCreditEligibility } from '@/lib/credits'
import { getFinancingSnapshot } from '@/lib/financing'

export async function GET() {
  try {
    const financingSnapshot = await getFinancingSnapshot()
    const eligibility = await getCurrentUserCreditEligibility(financingSnapshot)

    return Response.json({
      ...eligibility,
      defaultInstallments: financingSnapshot.settings.defaultInstallments,
      defaultPaymentFrequency: financingSnapshot.settings.defaultPaymentFrequency,
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
