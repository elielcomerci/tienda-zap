import { prisma } from '@/lib/prisma'
import { syncOrderStatusAfterPayment } from '@/lib/orders-workflow'
import { CRYPTO_PAYMENT_NETWORKS } from '@/lib/crypto/networks'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const REQUIRED_CONFIRMATIONS = 20
const MAX_PER_RUN = 4
const FINALIZATION_LEASE_MS = 2 * 60 * 1000

type RpcLog = {
  address?: string
  topics?: string[]
  data?: string
  logIndex?: string
}

type RpcReceipt = {
  status?: string
  blockNumber?: string
  logs?: RpcLog[]
}

async function rpc(chainId: number, method: string, params: unknown[]) {
  const url = process.env[`CRYPTO_RPC_URL_${chainId}`]
  if (!url) throw new Error(`Falta CRYPTO_RPC_URL_${chainId}`)

  const response = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`RPC ${chainId} HTTP ${response.status}`)
  const payload = await response.json() as { result?: unknown; error?: { message?: string } }
  if (payload.error) throw new Error(payload.error.message || 'Error RPC')
  return payload.result
}

function normalizeAddress(value: string | undefined) {
  return (value || '').toLowerCase()
}

function paddedAddress(address: string) {
  return `0x${address.toLowerCase().replace(/^0x/, '').padStart(64, '0')}`
}

async function inspectSubmittedPayment(payment: {
  id: string
  orderId: string
  chainId: number
  tokenContract: string
  recipientAddress: string
  amountUnits: string
  txHash: string
}) {
  const [chainIdResult, receiptResult, currentBlockResult] = await Promise.all([
    rpc(payment.chainId, 'eth_chainId', []),
    rpc(payment.chainId, 'eth_getTransactionReceipt', [payment.txHash]),
    rpc(payment.chainId, 'eth_blockNumber', []),
  ])
  const reportedChainId = Number(BigInt(String(chainIdResult)))
  if (reportedChainId !== payment.chainId) {
    throw new Error(`El RPC configurado para ${payment.chainId} responde para la red ${reportedChainId}`)
  }

  const receipt = receiptResult as RpcReceipt | null
  if (!receipt) return { kind: 'pending' as const }

  if (receipt.status !== '0x1') {
    await prisma.cryptoPayment.updateMany({
      where: { id: payment.id, status: { in: ['TX_SUBMITTED', 'DETECTED', 'CONFIRMING'] } },
      data: { status: 'REVIEW', reviewReason: 'La transacción fue revertida o no tiene un recibo exitoso.' },
    })
    return { kind: 'review' as const }
  }

  const token = payment.tokenContract.toLowerCase()
  const recipientTopic = paddedAddress(payment.recipientAddress)
  const recipientTransfers = (receipt.logs || []).filter((log) =>
    normalizeAddress(log.address) === token &&
    (log.topics || [])[0]?.toLowerCase() === TRANSFER_TOPIC &&
    (log.topics || [])[2]?.toLowerCase() === recipientTopic
  )

  if (recipientTransfers.length !== 1) {
    await prisma.cryptoPayment.updateMany({
      where: { id: payment.id, status: { in: ['TX_SUBMITTED', 'DETECTED', 'CONFIRMING'] } },
      data: {
        status: 'REVIEW',
        reviewReason: recipientTransfers.length === 0
          ? 'No se encontró una transferencia del contrato esperado al destinatario registrado.'
          : 'La transacción contiene varias transferencias al destinatario; requiere conciliación manual.',
      },
    })
    return { kind: 'review' as const }
  }

  const transfer = recipientTransfers[0]
  if (!transfer.data || BigInt(transfer.data) !== BigInt(payment.amountUnits)) {
    await prisma.cryptoPayment.updateMany({
      where: { id: payment.id, status: { in: ['TX_SUBMITTED', 'DETECTED', 'CONFIRMING'] } },
      data: {
        status: 'REVIEW',
        reviewReason: 'El importe transferido no coincide exactamente con la cotización.',
      },
    })
    return { kind: 'review' as const }
  }

  const blockNumber = BigInt(receipt.blockNumber || '0x0')
  const currentBlock = BigInt(String(currentBlockResult))
  const confirmationsBig = currentBlock >= blockNumber ? currentBlock - blockNumber + BigInt(1) : BigInt(0)
  const confirmations = Number(confirmationsBig)
  const logIndex = Number(BigInt(transfer.logIndex || '0x0'))
  const now = new Date()

  const updated = await prisma.cryptoPayment.updateMany({
    where: {
      id: payment.id,
      txHash: payment.txHash,
      status: { in: ['TX_SUBMITTED', 'DETECTED', 'CONFIRMING'] },
    },
    data: {
      status: confirmations >= REQUIRED_CONFIRMATIONS ? 'VERIFIED' : 'CONFIRMING',
      blockNumber,
      logIndex,
      confirmations,
      detectedAt: now,
      ...(confirmations >= REQUIRED_CONFIRMATIONS ? { verifiedAt: now } : {}),
      reviewReason: null,
    },
  })

  return { kind: updated.count ? (confirmations >= REQUIRED_CONFIRMATIONS ? 'verified' as const : 'confirming' as const) : 'pending' as const }
}

async function finalizeVerifiedPayment(paymentId: string, orderId: string) {
  const now = new Date()
  const payment = await prisma.cryptoPayment.findUnique({
    where: { id: paymentId },
    select: { status: true, finalizationClaimedAt: true, finalizationCompletedAt: true },
  })
  if (!payment || payment.status !== 'VERIFIED' || payment.finalizationCompletedAt) return

  if (
    payment.finalizationClaimedAt &&
    now.getTime() - payment.finalizationClaimedAt.getTime() < FINALIZATION_LEASE_MS
  ) return

  const claim = await prisma.cryptoPayment.updateMany({
    where: {
      id: paymentId,
      status: 'VERIFIED',
      finalizationCompletedAt: null,
      OR: [
        { finalizationClaimedAt: null },
        { finalizationClaimedAt: { lt: new Date(now.getTime() - FINALIZATION_LEASE_MS) } },
      ],
    },
    data: { finalizationClaimedAt: now },
  })
  if (!claim.count) return

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, paymentType: true },
    })
    if (!order || order.paymentType !== 'CRYPTO') {
      await prisma.cryptoPayment.update({
        where: { id: paymentId },
        data: { status: 'REVIEW', reviewReason: 'La orden vinculada no coincide con un pedido cripto.' },
      })
      return
    }

    await syncOrderStatusAfterPayment(orderId, paymentId)
    await prisma.cryptoPayment.updateMany({
      where: { id: paymentId, status: 'VERIFIED', finalizationCompletedAt: null },
      data: { finalizationCompletedAt: new Date(), finalizationClaimedAt: null },
    })
  } catch (error) {
    console.error('[crypto finalize]', paymentId, error)
    // Leave VERIFIED and the claim timestamp. The lease permits a later retry.
  }
}

export async function GET(request: Request) {
  if (process.env.CRYPTO_PAYMENTS_ENABLED !== 'true') {
    return Response.json({ error: 'La conciliación cripto está deshabilitada en este entorno.' }, { status: 503 })
  }

  const secret = process.env.CRON_SECRET || process.env.CRYPTO_CRON_SECRET
  const authorization = request.headers.get('authorization')
  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const results = { checked: 0, confirming: 0, verified: 0, review: 0, errors: 0 }
  const pending = await prisma.cryptoPayment.findMany({
    where: {
      status: { in: ['TX_SUBMITTED', 'DETECTED', 'CONFIRMING'] },
      txHash: { not: null },
    },
    orderBy: { submittedAt: 'asc' },
    take: MAX_PER_RUN,
    select: {
      id: true, orderId: true, chainId: true, tokenContract: true,
      recipientAddress: true, amountUnits: true, txHash: true,
    },
  })

  for (let offset = 0; offset < pending.length; offset += 5) {
    const batch = pending.slice(offset, offset + 5)
    const batchResults = await Promise.all(batch.map(async (payment) => {
      if (!payment.txHash) return { kind: 'pending' as const }
      try {
        const result = await inspectSubmittedPayment({ ...payment, txHash: payment.txHash })
        if (result.kind === 'verified') {
          await finalizeVerifiedPayment(payment.id, payment.orderId)
        }
        return result
      } catch (error) {
        // RPC failures are retryable/unknown; never mark the payment as failed.
        console.error('[crypto reconcile]', payment.id, error)
        return { kind: 'error' as const }
      }
    }))

    results.checked += batch.length
    for (const result of batchResults) {
      if (result.kind === 'confirming') results.confirming += 1
      if (result.kind === 'verified') results.verified += 1
      if (result.kind === 'review') results.review += 1
      if (result.kind === 'error') results.errors += 1
    }
  }

  const strandedVerified = await prisma.cryptoPayment.findMany({
    where: { status: 'VERIFIED', finalizationCompletedAt: null, order: { paymentType: 'CRYPTO', status: { not: 'CANCELLED' } } },
    orderBy: { verifiedAt: 'asc' },
    take: MAX_PER_RUN,
    select: { id: true, orderId: true },
  })
  for (const payment of strandedVerified) {
    try {
      await finalizeVerifiedPayment(payment.id, payment.orderId)
    } catch (error) {
      results.errors += 1
      console.error('[crypto finalize retry]', payment.id, error)
    }
  }

  return Response.json({ ok: true, ...results })
}
