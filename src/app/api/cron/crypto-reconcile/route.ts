import { prisma } from '@/lib/prisma'
import { syncOrderStatusAfterPayment } from '@/lib/orders-workflow'
import { CRYPTO_PAYMENT_NETWORKS } from '@/lib/crypto/networks'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const REQUIRED_CONFIRMATIONS = 20
const MAX_PER_RUN = 4
const FINALIZATION_LEASE_MS = 2 * 60 * 1000
const POST_SETTLEMENT_CHECK_INTERVAL_MS = 5 * 60 * 1000

type RpcLog = {
  address?: string
  topics?: string[]
  data?: string
  logIndex?: string
}

type RpcReceipt = {
  status?: string
  blockNumber?: string
  blockHash?: string
  logs?: RpcLog[]
}

type RpcBlock = {
  hash?: string
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

  // Confirmation depth alone does not prove canonicality. Bind the receipt
  // to the current canonical block before counting confirmations.
  if (!receipt.blockNumber || !receipt.blockHash) {
    await prisma.cryptoPayment.updateMany({
      where: { id: payment.id, status: { in: ['TX_SUBMITTED', 'DETECTED', 'CONFIRMING'] } },
      data: { status: 'REVIEW', reviewReason: 'El recibo no informa bloque y hash verificables; requiere revisión manual.' },
    })
    return { kind: 'review' as const }
  }
  const canonicalBlock = await rpc(payment.chainId, 'eth_getBlockByNumber', [receipt.blockNumber, false]) as RpcBlock | null
  if (!canonicalBlock?.hash || canonicalBlock.hash.toLowerCase() !== receipt.blockHash.toLowerCase()) {
    await prisma.cryptoPayment.updateMany({
      where: { id: payment.id, status: { in: ['TX_SUBMITTED', 'DETECTED', 'CONFIRMING'] } },
      data: { status: 'REVIEW', reviewReason: 'El bloque del recibo no coincide con el bloque canónico de la red.' },
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
      blockHash: receipt.blockHash.toLowerCase(),
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
    select: {
      status: true, finalizationClaimedAt: true, finalizationCompletedAt: true,
      chainId: true, txHash: true, blockNumber: true, blockHash: true,
    },
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
    // Re-check immediately before any order side effect. A receipt may have
    // been orphaned after the confirmation threshold was reached.
    if (!payment.txHash || payment.blockNumber === null || !payment.blockHash) {
      await prisma.cryptoPayment.update({
        where: { id: paymentId },
        data: { status: 'REVIEW', reviewReason: 'Falta evidencia del bloque canónico antes de finalizar el pago.', finalizationClaimedAt: null },
      })
      return
    }
    const latestReceipt = await rpc(payment.chainId, 'eth_getTransactionReceipt', [payment.txHash]) as RpcReceipt | null
    if (!latestReceipt || latestReceipt.status !== '0x1' || !latestReceipt.blockNumber || !latestReceipt.blockHash || BigInt(latestReceipt.blockNumber) !== payment.blockNumber) {
      await prisma.cryptoPayment.update({
        where: { id: paymentId },
        data: { status: 'REVIEW', reviewReason: 'El recibo ya no coincide con el bloque verificado; requiere revisión manual.', finalizationClaimedAt: null },
      })
      return
    }
    const latestCanonicalBlock = await rpc(payment.chainId, 'eth_getBlockByNumber', [latestReceipt.blockNumber, false]) as RpcBlock | null
    if (!latestCanonicalBlock?.hash || latestCanonicalBlock.hash.toLowerCase() !== latestReceipt.blockHash.toLowerCase() || latestReceipt.blockHash.toLowerCase() !== payment.blockHash.toLowerCase()) {
      await prisma.cryptoPayment.update({
        where: { id: paymentId },
        data: { status: 'REVIEW', reviewReason: 'El bloque verificado dejó de ser canónico antes de acreditar el pedido.', finalizationClaimedAt: null },
      })
      return
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, paymentType: true, paymentId: true },
    })
    if (!order || order.paymentType !== 'CRYPTO') {
      await prisma.cryptoPayment.update({
        where: { id: paymentId },
        data: { status: 'REVIEW', reviewReason: 'La orden vinculada no coincide con un pedido cripto.' },
      })
      return
    }

    // A payment may finish only a pending order or recover its own prior
    // finalization. Never mark a cancelled order paid or run payment side
    // effects for an order already settled through another payment.
    if (order.status === 'CANCELLED' || (order.status !== 'PENDING' && order.paymentId !== paymentId)) {
      await prisma.cryptoPayment.update({
        where: { id: paymentId },
        data: {
          status: 'REVIEW',
          reviewReason: order.status === 'CANCELLED'
            ? 'Se detectó una transferencia para una orden cancelada; requiere revisión manual.'
            : 'La orden ya no está pendiente y no está vinculada a este pago; requiere revisión manual.',
          finalizationClaimedAt: null,
        },
      })
      return
    }

    await syncOrderStatusAfterPayment(orderId, paymentId)
    await prisma.cryptoPayment.updateMany({
      where: { id: paymentId, status: 'VERIFIED', finalizationCompletedAt: null },
      data: { finalizationCompletedAt: new Date(), finalizationClaimedAt: null, lastCanonicalCheckAt: new Date() },
    })
  } catch (error) {
    console.error('[crypto finalize]', paymentId, error)
    // Leave VERIFIED and the claim timestamp. The lease permits a later retry.
  }
}


async function monitorSettledPayment(payment: {
  id: string
  chainId: number
  txHash: string
  blockNumber: bigint
  blockHash: string
}) {
  // RPC outages are deliberately allowed to throw: the caller leaves the
  // payment VERIFIED and the timestamp unchanged so the next cron retries.
  const receipt = await rpc(payment.chainId, 'eth_getTransactionReceipt', [payment.txHash]) as RpcReceipt | null
  if (
    !receipt || receipt.status !== '0x1' || !receipt.blockNumber || !receipt.blockHash ||
    BigInt(receipt.blockNumber) !== payment.blockNumber ||
    receipt.blockHash.toLowerCase() !== payment.blockHash.toLowerCase()
  ) {
    await prisma.cryptoPayment.updateMany({
      where: { id: payment.id, status: 'VERIFIED', finalizationCompletedAt: { not: null } },
      data: {
        status: 'REVIEW',
        reviewReason: 'El recibo de un pago ya acreditado dejó de coincidir con la evidencia liquidada; investigar posible reorganización. El pedido permanece pagado hasta revisión manual.',
        lastCanonicalCheckAt: new Date(),
      },
    })
    return 'review' as const
  }

  const canonicalBlock = await rpc(payment.chainId, 'eth_getBlockByNumber', [receipt.blockNumber, false]) as RpcBlock | null
  if (!canonicalBlock?.hash || canonicalBlock.hash.toLowerCase() !== payment.blockHash.toLowerCase()) {
    await prisma.cryptoPayment.updateMany({
      where: { id: payment.id, status: 'VERIFIED', finalizationCompletedAt: { not: null } },
      data: {
        status: 'REVIEW',
        reviewReason: 'El bloque de un pago ya acreditado ya no es canónico. El pedido permanece pagado; requiere investigación manual y conciliación.',
        lastCanonicalCheckAt: new Date(),
      },
    })
    return 'review' as const
  }

  await prisma.cryptoPayment.updateMany({
    where: { id: payment.id, status: 'VERIFIED', finalizationCompletedAt: { not: null } },
    data: { lastCanonicalCheckAt: new Date() },
  })
  return 'ok' as const
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

  const results = { checked: 0, confirming: 0, verified: 0, review: 0, errors: 0, settledChecked: 0, settledReview: 0 }
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


  // Periodically re-check already-settled payments. This detects a later
  // reorg without automatically reversing the order or erasing settlement.
  const settledCutoff = new Date(Date.now() - POST_SETTLEMENT_CHECK_INTERVAL_MS)
  const settled = await prisma.cryptoPayment.findMany({
    where: {
      status: 'VERIFIED',
      finalizationCompletedAt: { not: null },
      txHash: { not: null },
      blockNumber: { not: null },
      blockHash: { not: null },
      OR: [
        { lastCanonicalCheckAt: null },
        { lastCanonicalCheckAt: { lt: settledCutoff } },
      ],
    },
    orderBy: { lastCanonicalCheckAt: 'asc' },
    take: MAX_PER_RUN,
    select: { id: true, chainId: true, txHash: true, blockNumber: true, blockHash: true },
  })
  for (const payment of settled) {
    if (!payment.txHash || payment.blockNumber === null || !payment.blockHash) continue
    try {
      const outcome = await monitorSettledPayment({
        id: payment.id,
        chainId: payment.chainId,
        txHash: payment.txHash,
        blockNumber: payment.blockNumber,
        blockHash: payment.blockHash,
      })
      results.settledChecked += 1
      if (outcome === 'review') results.settledReview += 1
    } catch (error) {
      // Leave lastCanonicalCheckAt untouched: transient RPC failures retry.
      results.errors += 1
      console.error('[crypto settled monitor]', payment.id, error)
    }
  }

  return Response.json({ ok: true, ...results })
}
