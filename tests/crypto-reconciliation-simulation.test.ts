import assert from 'node:assert/strict'
import Module from 'node:module'

type Scenario = 'valid' | 'cancelled' | 'reverted' | 'rpc-error' | 'reorg' | 'reorg-finalize' | 'wrong-amount' | 'duplicate-transfer' | 'low-confirmations' | 'finalize-error' | 'post-settlement-reorg' | 'post-settlement-rpc-error'

const TOKEN = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const RECIPIENT = '0x1111111111111111111111111111111111111111'
const TX_HASH = `0x${'a'.repeat(64)}`
const BLOCK_HASH = `0x${'b'.repeat(64)}`
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const recipientTopic = `0x${RECIPIENT.slice(2).toLowerCase().padStart(64, '0')}`

let scenario: Scenario = 'valid'
let syncCalls = 0
let canonicalChecks = 0
let payment: any
let order: any

function reset(nextScenario: Scenario) {
  scenario = nextScenario
  syncCalls = 0
  canonicalChecks = 0
  payment = {
    id: 'payment-simulation',
    orderId: 'order-simulation',
    chainId: 8453,
    tokenContract: TOKEN,
    recipientAddress: RECIPIENT,
    amountUnits: '1000000',
    txHash: TX_HASH,
    status: 'TX_SUBMITTED',
    finalizationClaimedAt: null,
    finalizationCompletedAt: null,
    verifiedAt: null,
    blockNumber: null,
    blockHash: null,
    confirmations: 0,
    lastCanonicalCheckAt: null,
  }
  if (nextScenario === 'post-settlement-reorg' || nextScenario === 'post-settlement-rpc-error') {
    payment.status = 'VERIFIED'
    payment.finalizationCompletedAt = new Date(Date.now() - 10 * 60 * 1000)
    payment.verifiedAt = new Date(Date.now() - 20 * 60 * 1000)
    payment.blockNumber = BigInt(128)
    payment.blockHash = BLOCK_HASH
    payment.lastCanonicalCheckAt = new Date(Date.now() - 10 * 60 * 1000)
  }
  order = {
    status: nextScenario === 'cancelled' ? 'CANCELLED' : 'PENDING',
    paymentType: 'CRYPTO',
    paymentId: nextScenario === 'post-settlement-reorg' || nextScenario === 'post-settlement-rpc-error' ? payment.id : null,
  }
  if (nextScenario === 'post-settlement-reorg' || nextScenario === 'post-settlement-rpc-error') order.status = 'PAID'
}

const fakePrisma = {
  cryptoPayment: {
    async findMany({ where }: any) {
      if (where.status === 'VERIFIED' && where.finalizationCompletedAt?.not === null) return payment.status === 'VERIFIED' && payment.finalizationCompletedAt ? [{ ...payment }] : []
      if (where.status === 'VERIFIED') return payment.status === 'VERIFIED' && !payment.finalizationCompletedAt ? [{ ...payment }] : []
      return payment.status === 'TX_SUBMITTED' && payment.txHash ? [{ ...payment }] : []
    },
    async findUnique() {
      return {
        status: payment.status,
        finalizationClaimedAt: payment.finalizationClaimedAt,
        finalizationCompletedAt: payment.finalizationCompletedAt,
        chainId: payment.chainId,
        txHash: payment.txHash,
        blockNumber: payment.blockNumber,
        blockHash: payment.blockHash,
      }
    },
    async updateMany({ where, data }: any) {
      if (where.id !== payment.id) return { count: 0 }
      if (where.status?.in && !where.status.in.includes(payment.status)) return { count: 0 }
      if (where.status && typeof where.status === 'string' && where.status !== payment.status) return { count: 0 }
      if (where.txHash && where.txHash !== payment.txHash) return { count: 0 }
      if (where.finalizationCompletedAt === null && payment.finalizationCompletedAt !== null) return { count: 0 }
      if (where.finalizationCompletedAt?.not === null && !payment.finalizationCompletedAt) return { count: 0 }
      if (where.OR && payment.finalizationClaimedAt !== null) {
        const staleBefore = where.OR[1]?.finalizationClaimedAt?.lt
        if (!staleBefore || payment.finalizationClaimedAt >= staleBefore) return { count: 0 }
      }
      Object.assign(payment, data)
      return { count: 1 }
    },
    async update({ data }: any) {
      Object.assign(payment, data)
      return payment
    },
  },
  order: {
    async findUnique() {
      return { ...order }
    },
  },
}

const originalLoad = (Module as any)._load
;(Module as any)._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === '@/lib/prisma') return { prisma: fakePrisma }
  if (request === '@/lib/orders-workflow') {
    return {
      syncOrderStatusAfterPayment: async (_orderId: string, paymentId: string) => {
        syncCalls += 1
        if (scenario === 'finalize-error' && syncCalls === 1) throw new Error('simulated failure before order update')
        order.status = 'PAID'
        order.paymentId = paymentId
      },
    }
  }
  if (request === '@/lib/crypto/networks') return { CRYPTO_PAYMENT_NETWORKS: [] }
  return originalLoad.call(this, request, parent, isMain)
}

function rpcResponse(result: unknown, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function main() {
  const oldFetch = globalThis.fetch
  const oldPaymentsEnabled = process.env.CRYPTO_PAYMENTS_ENABLED
  const oldCronSecret = process.env.CRON_SECRET
  process.env.CRYPTO_PAYMENTS_ENABLED = 'true'
  process.env.CRON_SECRET = 'test-secret'
  process.env.CRYPTO_RPC_URL_8453 = 'https://rpc.simulated.invalid'

  try {
    const { GET } = require('../src/app/api/cron/crypto-reconcile/route')

    globalThis.fetch = (async (_input: any, init?: RequestInit) => {
      if (scenario === 'rpc-error' || scenario === 'post-settlement-rpc-error') throw new Error('simulated RPC outage')
      const body = JSON.parse(String(init?.body))
      switch (body.method) {
        case 'eth_chainId':
          return rpcResponse('0x2105')
        case 'eth_getTransactionReceipt':
          return rpcResponse({
            status: scenario === 'reverted' ? '0x0' : '0x1',
            blockNumber: '0x80',
            blockHash: BLOCK_HASH,
            logs: [{
              address: TOKEN,
              topics: [TRANSFER_TOPIC, `0x${'2'.repeat(64)}`, recipientTopic],
              data: scenario === 'wrong-amount' ? '0xf4241' : '0xf4240',
              logIndex: '0x0',
            }, ...(scenario === 'duplicate-transfer' ? [{
              address: TOKEN,
              topics: [TRANSFER_TOPIC, `0x${'3'.repeat(64)}`, recipientTopic],
              data: '0xf4240',
              logIndex: '0x1',
            }] : [])],
          })
        case 'eth_blockNumber':
          return rpcResponse(scenario === 'low-confirmations' ? '0x80' : '0x100')
        case 'eth_getBlockByNumber': {
          canonicalChecks += 1
          const mismatch = scenario === 'reorg' || scenario === 'post-settlement-reorg' || (scenario === 'reorg-finalize' && canonicalChecks > 1)
          return rpcResponse({ hash: mismatch ? `0x${'c'.repeat(64)}` : BLOCK_HASH })
        }
        default:
          throw new Error(`Unexpected RPC method: ${body.method}`)
      }
    }) as typeof fetch

    const request = () => new Request('http://localhost/api/cron/crypto-reconcile', {
      method: 'GET',
      headers: { authorization: 'Bearer test-secret' },
    })

    reset('valid')
    let response = await GET(request())
    let body = await response.json() as any
    assert.equal(response.status, 200)
    assert.equal(body.verified, 1)
    assert.equal(payment.status, 'VERIFIED')
    assert.equal(payment.finalizationCompletedAt instanceof Date, true)
    assert.equal(order.status, 'PAID')
    assert.equal(order.paymentId, payment.id)
    assert.equal(syncCalls, 1)

    reset('cancelled')
    response = await GET(request())
    body = await response.json() as any
    assert.equal(response.status, 200)
    assert.equal(body.verified, 1)
    assert.equal(payment.status, 'REVIEW', 'verified transfer to a cancelled order must require manual review')
    assert.match(payment.reviewReason, /orden cancelada/i)
    assert.equal(payment.finalizationClaimedAt, null)
    assert.equal(order.status, 'CANCELLED', 'cancelled order must not be marked paid')
    assert.equal(syncCalls, 0, 'cancelled order must not trigger payment side effects')

    reset('reverted')
    response = await GET(request())
    body = await response.json() as any
    assert.equal(response.status, 200)
    assert.equal(body.review, 1)
    assert.equal(payment.status, 'REVIEW')
    assert.match(payment.reviewReason, /revertida/i)
    assert.equal(syncCalls, 0)

    reset('rpc-error')
    response = await GET(request())
    body = await response.json() as any
    assert.equal(response.status, 200)
    assert.equal(body.errors, 1)
    assert.equal(payment.status, 'TX_SUBMITTED', 'RPC failure is unknown/retryable, not a failed payment')
    assert.equal(syncCalls, 0)

    reset('wrong-amount')
    response = await GET(request())
    assert.equal(response.status, 200)
    assert.equal(payment.status, 'REVIEW', 'a transfer with a mismatched amount must require manual review')
    assert.equal(syncCalls, 0)

    reset('duplicate-transfer')
    response = await GET(request())
    assert.equal(response.status, 200)
    assert.equal(payment.status, 'REVIEW', 'multiple matching transfers must not be automatically credited')
    assert.equal(syncCalls, 0)

    reset('low-confirmations')
    response = await GET(request())
    assert.equal(response.status, 200)
    assert.equal(payment.status, 'CONFIRMING', 'insufficient confirmations must not settle the order')
    assert.equal(syncCalls, 0)

    reset('reorg')
    response = await GET(request())
    body = await response.json() as any
    assert.equal(response.status, 200)
    assert.equal(payment.status, 'REVIEW', 'receipt in a non-canonical block must not be verified')
    assert.equal(syncCalls, 0, 'non-canonical receipt must never settle the order')

    reset('reorg-finalize')
    response = await GET(request())
    body = await response.json() as any
    assert.equal(response.status, 200)
    assert.equal(payment.status, 'REVIEW', 'a reorg between verification and finalization must stop settlement')
    assert.equal(syncCalls, 0, 'finalization must re-check canonicality before side effects')

    reset('finalize-error')
    response = await GET(request())
    assert.equal(response.status, 200)
    assert.equal(payment.status, 'VERIFIED', 'a transient finalization error must preserve verified payment evidence')
    assert.equal(payment.finalizationCompletedAt, null, 'failed finalization must remain recoverable')
    assert.equal(order.status, 'PENDING', 'failed side effect must not falsely mark the order paid')
    payment.finalizationClaimedAt = new Date(Date.now() - 10 * 60 * 1000)
    response = await GET(request())
    assert.equal(response.status, 200)
    assert.equal(payment.status, 'VERIFIED')
    assert.ok(payment.finalizationCompletedAt instanceof Date, 'stale finalization lease must be recoverable on a later cron run')
    assert.equal(order.status, 'PAID')
    assert.equal(syncCalls, 2, 'retry should execute the previously failed finalization exactly once successfully')


    reset('post-settlement-reorg')
    response = await GET(request())
    body = await response.json() as any
    assert.equal(response.status, 200)
    assert.equal(body.settledReview, 1, 'post-settlement canonicality mismatch must be surfaced')
    assert.equal(payment.status, 'REVIEW', 'a post-settlement reorg must flag the payment for investigation')
    assert.equal(order.status, 'PAID', 'post-settlement monitoring must not silently reverse a paid order')
    assert.match(payment.reviewReason, /ya acreditado/i)
    assert.ok(payment.lastCanonicalCheckAt instanceof Date)

    reset('post-settlement-rpc-error')
    const staleCheckAt = payment.lastCanonicalCheckAt.getTime()
    response = await GET(request())
    body = await response.json() as any
    assert.equal(response.status, 200)
    assert.equal(body.errors, 1, 'post-settlement RPC outage must be reported')
    assert.equal(payment.status, 'VERIFIED', 'RPC outage must not be misclassified as a reorg')
    assert.equal(order.status, 'PAID')
    assert.equal(payment.lastCanonicalCheckAt.getTime(), staleCheckAt, 'RPC failure must leave the check timestamp stale for retry')

    console.log('Crypto reconciliation simulation tests passed (verified, cancelled order, reverted receipt, RPC outage, wrong amount, duplicate transfer, low confirmations, reorg before and during finalization, recoverable finalization failure, post-settlement reorg monitoring, retryable post-settlement RPC outage)')
  } finally {
    globalThis.fetch = oldFetch
    if (oldPaymentsEnabled === undefined) delete process.env.CRYPTO_PAYMENTS_ENABLED
    else process.env.CRYPTO_PAYMENTS_ENABLED = oldPaymentsEnabled
    if (oldCronSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = oldCronSecret
    delete process.env.CRYPTO_RPC_URL_8453
    ;(Module as any)._load = originalLoad
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
