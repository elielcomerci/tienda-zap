'use client'

import { useEffect, useState } from 'react'
import { PaymentFrequency } from '@/lib/financing-calculator'

export type CreditEligibilitySnapshot = {
  authenticated: boolean
  canRequestCredit: boolean
  activeCreditsCount: number
  overdueInstallmentsCount: number
  hasDelinquency: boolean
  effectiveRatePercent: number
  baseRatePercent: number
  ratePenaltyPercent: number
  downPaymentPenaltyPercent: number
  defaultInstallments: number
  defaultPaymentFrequency: PaymentFrequency
}

export function useCreditEligibility() {
  const [eligibility, setEligibility] = useState<CreditEligibilitySnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    setIsLoading(true)

    fetch('/api/creditos/eligibility')
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'No pudimos validar Credito ZAP.')
        }

        if (active) {
          setEligibility(payload)
        }
      })
      .catch(() => {
        if (active) {
          setEligibility(null)
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  return { eligibility, isLoading }
}
