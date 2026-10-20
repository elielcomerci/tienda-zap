import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { hashOrderPublicAccessToken } from '@/lib/order-access'
import { CRYPTO_PAYMENT_NETWORKS } from '@/lib/crypto/networks'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const paymentId = typeof body?.paymentId === 'string' ? body.paymentId.trim() : ''
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken : ''

    if (!paymentId) return Response.json({ error: 'Falta el identificador del pago.' }, { status: 400 })

    const payment = await prisma.cryptoPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        orderId: true,
        status: true,
        chainId: true,
        networkKey: true,
        tokenSymbol: true,
        arsAmount: true,
        tokenAmount: true,
        amountUnits: true,
        tokenContract: true,
        tokenDecimals: true,
        recipientAddress: true,
        quotePriceArs: true,
        quoteSource: true,
        quoteObservedAt: true,
        expiresAt: true,
        txHash: true,
        submittedAt: true,
        blockNumber: true,
        confirmations: true,
        detectedAt: true,
        verifiedAt: true,
        order: { select: { userId: true, publicAccessTokenHash: true } },
      },
    })

    if (!payment) return Response.json({ error: 'Pago cripto no encontrado.' }, { status: 404 })

    const session = await auth()
    const tokenMatches = Boolean(
      accessToken &&
      payment.order.publicAccessTokenHash &&
      hashOrderPublicAccessToken(accessToken) === payment.order.publicAccessTokenHash
    )
    const isOwner = Boolean(session?.user?.id && payment.order.userId === session.user.id)
    if (!tokenMatches && !isOwner) {
      return Response.json({ error: 'No tenés acceso a este pago.' }, { status: 403 })
    }

    const network = CRYPTO_PAYMENT_NETWORKS.find((candidate) => candidate.chainId === payment.chainId)
    return Response.json({
      payment: {
        paymentsEnabled: process.env.CRYPTO_PAYMENTS_ENABLED === 'true',
        id: payment.id,
        status: payment.status,
        chainId: payment.chainId,
        tokenSymbol: payment.tokenSymbol,
        networkKey: payment.networkKey,
        arsAmount: payment.arsAmount.toString(),
        tokenAmount: payment.tokenAmount.toString(),
        amountUnits: payment.amountUnits,
        tokenContract: payment.tokenContract,
        tokenDecimals: payment.tokenDecimals,
        recipientAddress: payment.recipientAddress,
        quotePriceArs: payment.quotePriceArs.toString(),
        quoteSource: payment.quoteSource,
        quoteObservedAt: payment.quoteObservedAt,
        expiresAt: payment.expiresAt,
        txHash: payment.txHash,
        submittedAt: payment.submittedAt,
        blockNumber: payment.blockNumber?.toString() ?? null,
        confirmations: payment.confirmations,
        detectedAt: payment.detectedAt,
        verifiedAt: payment.verifiedAt,
        explorerUrl: payment.txHash && network ? `${network.explorerUrl}/tx/${payment.txHash}` : null,
      },
    })
  } catch (error) {
    console.error('[crypto status]', error)
    return Response.json({ error: 'No se pudo consultar el estado del pago.' }, { status: 500 })
  }
}
