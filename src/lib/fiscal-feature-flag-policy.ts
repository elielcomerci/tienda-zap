import type { FiscalFeatureFlagKey } from '@/lib/fiscal-feature-flags'

type FeatureFlags = Record<FiscalFeatureFlagKey, boolean>

/**
 * Production invoice emission requires two independent approvals:
 * the persisted admin flag and an explicit deployment-level opt-in.
 * An enabled DB row alone must never authorize real fiscal issuance.
 */
export function applyFiscalFeatureGates(flags: FeatureFlags, allowProductionEmission: boolean, hasPersistedProductionFlag: boolean): FeatureFlags {
  return {
    ...flags,
    invoiceEmissionProd: allowProductionEmission && hasPersistedProductionFlag && flags.invoiceEmissionProd,
  }
}
