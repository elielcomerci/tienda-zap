export interface Env {
  CHECKOUT_RECONCILE_URL: string
  CRON_SECRET: string
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runReconciliation(env))
  },
}

async function runReconciliation(env: Env): Promise<void> {
  if (!env.CHECKOUT_RECONCILE_URL || !env.CRON_SECRET) {
    console.error('Crypto reconciler is missing CHECKOUT_RECONCILE_URL or CRON_SECRET')
    return
  }

  let url: URL
  try {
    url = new URL(env.CHECKOUT_RECONCILE_URL)
    if (url.protocol !== 'https:') {
      console.error('CHECKOUT_RECONCILE_URL must use HTTPS')
      return
    }
  } catch {
    console.error('CHECKOUT_RECONCILE_URL is not a valid URL')
    return
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${env.CRON_SECRET}`,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(55000),
    })

    const body = await response.text()
    if (!response.ok) {
      console.error('Crypto reconciliation endpoint failed', response.status, body.slice(0, 1000))
      return
    }

    console.log('Crypto reconciliation completed', body.slice(0, 3000))
  } catch (error) {
    console.error('Crypto reconciliation request failed; next scheduled run will retry', error)
  }
}
