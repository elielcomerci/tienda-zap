export const dynamic = 'force-dynamic'
export const maxDuration = 10

const NETWORKS = [
  { chainId: 8453, name: 'Base' },
  { chainId: 10, name: 'Optimism' },
  { chainId: 480, name: 'World Chain' },
] as const

const RPC_TIMEOUT_MS = 2500

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.CRYPTO_CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ error: 'No autorizado.' }, { status: 401, headers: { 'cache-control': 'no-store' } })
  }

  const networks = await Promise.all(NETWORKS.map(async ({ chainId, name }) => {
    const url = process.env[`CRYPTO_RPC_URL_${chainId}`]
    if (!url) return { chainId, name, ok: false, error: 'missing_rpc_url' }

    try {
      const response = await fetch(url, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
        signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
      })
      if (!response.ok) return { chainId, name, ok: false, error: `rpc_http_${response.status}` }

      const payload = await response.json() as {
        result?: unknown
        error?: { code?: number; message?: string }
      }
      if (payload.error) return { chainId, name, ok: false, error: 'rpc_error' }
      if (typeof payload.result !== 'string') return { chainId, name, ok: false, error: 'invalid_rpc_response' }

      const reportedChainId = Number(BigInt(payload.result))
      if (reportedChainId !== chainId) {
        return { chainId, name, ok: false, error: 'wrong_chain', reportedChainId }
      }
      return { chainId, name, ok: true, reportedChainId }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError'
      return { chainId, name, ok: false, error: isTimeout ? 'rpc_timeout' : 'rpc_unreachable' }
    }
  }))

  const ok = networks.every(network => network.ok)
  return Response.json(
    { ok, mode: 'read_only', paymentsEnabled: false, networks },
    { status: ok ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  )
}
