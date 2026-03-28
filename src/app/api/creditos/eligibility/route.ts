import { getCurrentUserCreditEligibility } from '@/lib/credits'

export async function GET() {
  try {
    const eligibility = await getCurrentUserCreditEligibility()
    return Response.json(eligibility)
  } catch (error: any) {
    return Response.json(
      {
        error: error?.message || 'No pudimos validar tu estado crediticio.',
      },
      { status: 500 }
    )
  }
}
