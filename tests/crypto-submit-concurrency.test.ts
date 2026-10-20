import assert from 'node:assert/strict'
import Module from 'node:module'

const paymentState: any = {
  id: 'payment-test',
  orderId: 'order-test',
  chainId: 1,
  status: 'AWAITING_PAYMENT',
  txHash: null,
  submittedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
  order: {
    userId: 'owner-test',
    status: 'PENDING',
    paymentType: 'CRYPTO',
    publicAccessTokenHash: null,
  },
}

const fakePrisma = {
  cryptoPayment: {
    async findUnique({ select }: any) {
      if (select?.order) return { ...paymentState, order: { ...paymentState.order } }
      return {
        status: paymentState.status,
        txHash: paymentState.txHash,
        submittedAt: paymentState.submittedAt,
      }
    },
    async findFirst() {
      return null
    },
    async updateMany({ where, data }: any) {
      // Match Prisma's conditional UPDATE semantics: predicate check and write
      // happen together before yielding, so only one concurrent caller claims it.
      const matches = paymentState.id === where.id &&
        paymentState.status === where.status &&
        paymentState.txHash === where.txHash &&
        paymentState.expiresAt > where.expiresAt.gt
      if (!matches) return { count: 0 }
      Object.assign(paymentState, data)
      return { count: 1 }
    },
    async update({ data }: any) {
      Object.assign(paymentState, data)
      return paymentState
    },
  },
}

const originalLoad = (Module as any)._load
;(Module as any)._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === '@/auth') return { auth: async () => ({ user: { id: 'owner-test' } }) }
  if (request === '@/lib/prisma') return { prisma: fakePrisma }
  if (request === '@/lib/order-access') return { hashOrderPublicAccessToken: (token: string) => token }
  return originalLoad.call(this, request, parent, isMain)
}

async function main() {
  try {
    const { POST } = require('../src/app/api/checkout/crypto/submit/route')
    const hashA = `0x${'a'.repeat(64)}`
    const hashB = `0x${'b'.repeat(64)}`
    const request = (txHash: string) => new Request('http://localhost/api/checkout/crypto/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paymentId: paymentState.id, txHash }),
    })

    const responses = await Promise.all([POST(request(hashA)), POST(request(hashB))])
    const statuses = responses.map(response => response.status).sort((a, b) => a - b)
    assert.deepEqual(statuses, [200, 409], 'only one distinct transaction hash may claim a payment')
    assert.ok([hashA, hashB].includes(paymentState.txHash), 'the payment stores exactly one submitted hash')
    assert.equal(paymentState.status, 'TX_SUBMITTED')
    const bodies = await Promise.all(responses.map(response => response.json()))
    assert.equal(bodies.filter((body: any) => body.accepted === true).length, 1)

    // A repeated concurrent submission of the same hash should be idempotent.
    paymentState.status = 'AWAITING_PAYMENT'
    paymentState.txHash = null
    paymentState.submittedAt = null
    const repeated = await Promise.all([POST(request(hashA)), POST(request(hashA))])
    assert.deepEqual(repeated.map(response => response.status), [200, 200])
    const repeatedBodies = await Promise.all(repeated.map(response => response.json()))
    assert.equal(repeatedBodies.every((body: any) => body.accepted === true), true)
    assert.equal(paymentState.txHash, hashA)
    console.log('Crypto submit concurrent-claim and idempotency regression tests passed')
  } finally {
    ;(Module as any)._load = originalLoad
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
