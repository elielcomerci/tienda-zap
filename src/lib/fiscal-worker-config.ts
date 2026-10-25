const productionWorkerUrl = 'https://arca.zap.com.ar'

export function getFiscalWorkerBaseUrl() {
  return process.env.FISCAL_WORKER_URL?.trim()
    || process.env.ZAP_FISCAL_BASE_URL?.trim()
    || productionWorkerUrl
}

export function getFiscalWorkerSecret(kind: 'internal' | 'provisioning') {
  return kind === 'internal'
    ? process.env.FISCAL_WORKER_INTERNAL_SECRET?.trim() || process.env.INTERNAL_SECRET?.trim()
    : process.env.FISCAL_WORKER_PROVISIONING_SECRET?.trim() || process.env.TENANT_PROVISIONING_SECRET?.trim()
}
