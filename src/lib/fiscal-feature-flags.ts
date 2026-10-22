import { prisma } from '@/lib/prisma'

export const FISCAL_FEATURE_FLAGS = {
  accountProvisioning: { key: 'accountProvisioning', label: 'Alta de cuentas fiscales', description: 'Crear o vincular tenants del Worker desde el panel.' },
  contributorManagement: { key: 'contributorManagement', label: 'Vinculación de CUIT', description: 'Vincular CUIT y ambientes a una cuenta fiscal.' },
  apiKeyManagement: { key: 'apiKeyManagement', label: 'Creación de API keys', description: 'Permite emitir nuevas credenciales de acceso al Worker fiscal.' },
  certificateManagement: { key: 'certificateManagement', label: 'Certificados', description: 'Cargar o revocar certificados y claves fiscales.' },
  invoiceEmissionTest: { key: 'invoiceEmissionTest', label: 'Emisión en homologación', description: 'Permite validar y emitir comprobantes en TEST.' },
  invoiceEmissionProd: { key: 'invoiceEmissionProd', label: 'Emisión en producción', description: 'Permite validar y emitir comprobantes reales en PROD.' },
  batchImport: { key: 'batchImport', label: 'Importación por lote', description: 'Habilita el flujo de importación TSV en la interfaz.' },
  pdfExport: { key: 'pdfExport', label: 'Exportación PDF', description: 'Habilita la generación local de PDF desde el panel.' },
  manualInvoiceRegistration: { key: 'manualInvoiceRegistration', label: 'Registro manual de comprobantes', description: 'Permite registrar en el panel comprobantes emitidos por otros medios.' },
  wsfeRead: { key: 'wsfeRead', label: 'Consultas de comprobantes y puntos de venta', description: 'Permite consultar puntos de venta, última numeración y comprobantes directamente en ARCA.' },
  padronQuery: { key: 'padronQuery', label: 'Consulta de padrón', description: 'Permite consultar datos registrales con autorización activa para la CUIT.' },
  invoiceVoid: { key: 'invoiceVoid', label: 'Anulación / Nota de Crédito', description: 'Permite iniciar anulaciones mediante Nota de Crédito cuando el Worker lo admite.' },
  jobReconciliation: { key: 'jobReconciliation', label: 'Conciliación de trabajos', description: 'Permite verificar en ARCA el resultado de trabajos fallidos antes de reintentar.' },
  usageVisibility: { key: 'usageVisibility', label: 'Consumo fiscal', description: 'Permite consultar el consumo registrado por el Worker para una CUIT en producción.' },
  operationalRecovery: { key: 'operationalRecovery', label: 'Recuperación operativa del Worker', description: 'Permite reintentar trabajos DEAD y webhooks fallidos desde el panel de administración.' },
} as const

export type FiscalFeatureFlagKey = keyof typeof FISCAL_FEATURE_FLAGS

export const DEFAULT_FISCAL_FEATURE_FLAGS: Record<FiscalFeatureFlagKey, boolean> = {
  accountProvisioning: false,
  contributorManagement: false,
  apiKeyManagement: false,
  certificateManagement: false,
  invoiceEmissionTest: false,
  invoiceEmissionProd: false,
  batchImport: false,
  pdfExport: false,
  manualInvoiceRegistration: false,
  wsfeRead: false,
  padronQuery: false,
  invoiceVoid: false,
  jobReconciliation: false,
  usageVisibility: false,
  operationalRecovery: false,
}

export async function getFiscalFeatureFlags(): Promise<Record<FiscalFeatureFlagKey, boolean>> {
  const keys = Object.values(FISCAL_FEATURE_FLAGS).map(flag => flag.key)
  try {
    const rows = await prisma.fiscalFeatureFlag.findMany({ where: { key: { in: keys } }, select: { key: true, enabled: true } })
    const result = { ...DEFAULT_FISCAL_FEATURE_FLAGS }
    for (const row of rows) {
      if (row.key in result) result[row.key as FiscalFeatureFlagKey] = row.enabled
    }
    return result
  } catch (error) {
    // Fail closed if the migration has not been applied or the settings store is unavailable.
    console.error('[fiscal/feature-flags] read failed; all flags disabled', error instanceof Error ? error.name : 'UnknownError')
    return { ...DEFAULT_FISCAL_FEATURE_FLAGS }
  }
}

export async function isFiscalFeatureEnabled(key: FiscalFeatureFlagKey): Promise<boolean> {
  const flags = await getFiscalFeatureFlags()
  return flags[key]
}
