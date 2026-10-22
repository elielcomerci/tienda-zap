import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { hashOrderPublicAccessToken } from '@/lib/order-access'
import { getEnabledCryptoAsset, type CryptoAssetSymbol } from '@/lib/crypto/networks'
import {
  arsToCents,
  calculateTokenAmountUnits,
  formatTokenUnits,
  getCriptoYaSellReferencePrice,
} from '@/lib/crypto/quotes'

const RECEIVING_ADDRESS = '0x46da5941eF55e27256ED5802BF8521f75D0c6684'
const QUOTE_LIFETIME_MS = 10 * 60 * 1000
const ALLOWED_SYMBOLS = new Set<CryptoAssetSymbol>(['USDC', 'USDT', 'WLD'])

export async function POST(request: Request) {
  if (process.env.CRYPTO_PAYMENTS_ENABLED !== 'true') {
    return Response.json({ error: 'Los pagos cripto están deshabilitados en este entorno.' }, { status: 503 })
  }

  try {
    const body = await request.json().catch(() => null)
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : ''
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken : ''
    const chainId = Number(body?.chainId)
    const tokenSymbol = typeof body?.tokenSymbol === 'string' ? body.tokenSymbol.toUpperCase() : ''

    if (!orderId || !Number.isInteger(chainId) || !ALLOWED_SYMBOLS.has(tokenSymbol as CryptoAssetSymbol)) {
      return Response.json({ error: 'Pedido, red o activo inválido.' }, { status: 400 })
    }

    const selected = getEnabledCryptoAsset(chainId, tokenSymbol as CryptoAssetSymbol)
    if (!selected) {
      return Response.json({ error: 'Ese activo no está habilitado para pagos.' }, { status: 400 })
    }

    const session = await auth()
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        total: true,
        status: true,
        paymentType: true,
        publicAccessTokenHash: true,
      },
    })

    if (!order) return Response.json({ error: 'Pedido no encontrado.' }, { status: 404 })

    const tokenMatches = Boolean(
      accessToken &&
      order.publicAccessTokenHash &&
      hashOrderPublicAccessToken(accessToken) === order.publicAccessTokenHash
    )
    const isOwner = Boolean(session?.user?.id && order.userId === session.user.id)
    if (!tokenMatches && !isOwner) {
      return Response.json({ error: 'No tenés acceso a este pedido.' }, { status: 403 })
    }

    if (order.paymentType !== 'CRYPTO' || order.status !== 'PENDING') {
      return Response.json({ error: 'El pedido no está pendiente de pago cripto.' }, { status: 409 })
    }

    const blockingPayment = await prisma.cryptoPayment.findFirst({
      where: {
        orderId,
        status: { in: ['TX_SUBMITTED', 'DETECTED', 'CONFIRMING', 'VERIFIED', 'REVIEW'] },
      },
      select: { id: true },
    })
    if (blockingPayment) {
      return Response.json({ error: 'Este pedido ya tiene una transferencia en seguimiento.' }, { status: 409 })
    }

    const price = await getCriptoYaSellReferencePrice(tokenSymbol as CryptoAssetSymbol)
    const arsAmountCents = arsToCents(order.total)
    const amountUnits = calculateTokenAmountUnits(
      arsAmountCents,
      price.priceArs,
      selected.asset.decimals
    )
    const tokenAmount = formatTokenUnits(amountUnits, selected.asset.decimals)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + QUOTE_LIFETIME_MS)

    const payment = await prisma.$transaction(async (tx) => {
      // Expire the previous quote and create its replacement atomically. If a
      // concurrent request wins the partial unique index, this transaction
      // rolls back so it cannot expire the winner's active quote.
      await tx.cryptoPayment.updateMany({
        where: {
          orderId,
          status: { in: ['QUOTED', 'AWAITING_PAYMENT'] },
        },
        data: { status: 'EXPIRED' },
      })

      return tx.cryptoPayment.create({
        data: {
          orderId,
          status: 'AWAITING_PAYMENT',
          arsAmount: (Number(arsAmountCents) / 100).toFixed(2),
          tokenAmount,
          amountUnits: amountUnits.toString(),
          chainId: selected.network.chainId,
          networkKey: selected.network.key,
          tokenSymbol,
          tokenContract: selected.asset.contractAddress,
          tokenDecimals: selected.asset.decimals,
          recipientAddress: RECEIVING_ADDRESS,
          quotePriceArs: price.priceArs,
          quoteSource: price.source,
          quoteObservedAt: price.observedAt,
          expiresAt,
        },
        select: {
          id: true,
          status: true,
          arsAmount: true,
          tokenAmount: true,
          amountUnits: true,
          chainId: true,
          networkKey: true,
          tokenSymbol: true,
          tokenContract: true,
          tokenDecimals: true,
          recipientAddress: true,
          quotePriceArs: true,
          quoteSource: true,
          quoteObservedAt: true,
          expiresAt: true,
        },
      })
    })

    console.info('[checkout.quote.created]', {
      checkout_id: order.id,
      quote_id: payment.id,
      payment_method: 'CRYPTO',
      configurator_slug: null,
      pricing_source: price.source,
      chain_id: selected.network.chainId,
      token_symbol: tokenSymbol,
    })

    return Response.json({
      payment: {
        ...payment,
        arsAmount: payment.arsAmount.toString(),
        tokenAmount: payment.tokenAmount.toString(),
        quotePriceArs: payment.quotePriceArs.toString(),
      },
      marketReference: {
        source: 'CriptoYa',
        method: 'mediana de totalBid de cotizaciones recientes',
        note: 'Referencia de mercado, no una promesa de precio de liquidación.',
      },
    })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return Response.json(
        { error: 'Este pedido ya tiene una cotización o transferencia activa.' },
        { status: 409 }
      )
    }
    console.error('[crypto quote]', error)
    return Response.json(
      { error: 'No se pudo cotizar el pago cripto. Intentá nuevamente.' },
      { status: 502 }
    )
  }
}
