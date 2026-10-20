import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { hashOrderPublicAccessToken } from '@/lib/order-access'

const TX_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const paymentId = typeof body?.paymentId === 'string' ? body.paymentId.trim() : ''
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken : ''
    const txHash = typeof body?.txHash === 'string' ? body.txHash.trim().toLowerCase() : ''

    if (!paymentId || !TX_HASH_PATTERN.test(txHash)) {
      return Response.json({ error: 'Pago o hash de transacción inválido.' }, { status: 400 })
    }

    const payment = await prisma.cryptoPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        orderId: true,
        chainId: true,
        status: true,
        txHash: true,
        expiresAt: true,
        order: {
          select: {
            userId: true,
            status: true,
            paymentType: true,
            publicAccessTokenHash: true,
          },
        },
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

    if (payment.order.paymentType !== 'CRYPTO' || payment.order.status !== 'PENDING') {
      return Response.json({ error: 'El pedido ya no admite pagos cripto.' }, { status: 409 })
    }

    if (payment.txHash && payment.txHash === txHash) {
      return Response.json({ accepted: true, status: payment.status, txHash })
    }

    if (payment.status !== 'AWAITING_PAYMENT' || payment.txHash) {
      return Response.json({ error: 'Este pago ya tiene una transacción en seguimiento.' }, { status: 409 })
    }

    if (payment.expiresAt.getTime() <= Date.now()) {
      await prisma.cryptoPayment.update({
        where: { id: payment.id },
        data: { status: 'EXPIRED' },
      })
      return Response.json({ error: 'La cotización venció. Generá una nueva antes de pagar.' }, { status: 409 })
    }

    const reusedHash = await prisma.cryptoPayment.findFirst({
      where: { chainId: payment.chainId, txHash },
      select: { id: true },
    })
    if (reusedHash) {
      return Response.json({ error: 'Ese hash ya está asociado a otro pago.' }, { status: 409 })
    }

    const submittedAt = new Date()
    const claim = await prisma.cryptoPayment.updateMany({
      where: {
        id: payment.id,
        status: 'AWAITING_PAYMENT',
        txHash: null,
        expiresAt: { gt: submittedAt },
      },
      data: {
        txHash,
        submittedAt,
        status: 'TX_SUBMITTED',
      },
    })

    if (claim.count !== 1) {
      const current = await prisma.cryptoPayment.findUnique({
        where: { id: payment.id },
        select: { status: true, txHash: true, submittedAt: true },
      })

      // A repeated request with the same hash is idempotent, even if it raced
      // with the request that first claimed the payment.
      if (current?.txHash === txHash) {
        return Response.json({ accepted: true, status: current.status, txHash, submittedAt: current.submittedAt })
      }

      return Response.json(
        { error: 'Este pago ya tiene una transacción en seguimiento o la cotización venció.' },
        { status: 409 }
      )
    }

    return Response.json({
      accepted: true,
      status: 'TX_SUBMITTED',
      txHash,
      submittedAt,
      message: 'Hash recibido. El pago todavía no está confirmado; estamos verificando la red.',
    })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return Response.json({ error: 'Ese hash ya está asociado a otro pago.' }, { status: 409 })
    }
    console.error('[crypto submit]', error)
    return Response.json({ error: 'No se pudo registrar la transacción. Intentá nuevamente.' }, { status: 500 })
  }
}
