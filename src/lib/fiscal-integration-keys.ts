export interface IntegrationApiKeyMetadata {
  id: string
  label: string
  expiresAt: string | null
  revokedAt: string | null
}

export function buildIntegrationApiKeyLabel(label: string, stack: string): string {
  const suffix = ` (${stack})`
  return `Integración: ${label.slice(0, 80 - 'Integración: '.length - suffix.length)}${suffix}`
}

export function getIntegrationKeyInventoryError(
  apiKeys: IntegrationApiKeyMetadata[],
  rotationKeyId: string | null,
  now = new Date(),
): 'ROTATION_KEY_NOT_AVAILABLE' | 'API_KEY_LIMIT_REACHED' | null {
  const activeKeys = apiKeys.filter(key => !key.revokedAt && (!key.expiresAt || new Date(key.expiresAt) > now))
  if (rotationKeyId && !activeKeys.some(key => key.id === rotationKeyId && key.label.startsWith('Integración:'))) {
    return 'ROTATION_KEY_NOT_AVAILABLE'
  }
  return activeKeys.filter(key => key.id !== rotationKeyId).length >= 10 ? 'API_KEY_LIMIT_REACHED' : null
}
