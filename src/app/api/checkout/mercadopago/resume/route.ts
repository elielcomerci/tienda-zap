import { MercadoPagoConfig, Preference } from 'mercadopago'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findAccessibleOrder } from '@/lib/order-access'
import { buildOrderAccessQuery } from '@/lib/order-access'

function getMPClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN no configurado.')
  return new MercadoPagoConfig({ accessToken })
}

/**
 * POST /api/checkout/mercadopago/resume
 *
 * Recupera el link de pago de una orden MercadoPago pendiente.
 * - Si la preferencia existente sigue activa, devuelve su initPoint directamente.
 * - Si la preferencia expiró o no existe, crea una nueva y actualiza la orden.
 *
 * Body: { orderId: string, token?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, token } = await req.json()

    if (!orderId) {
      return Response.json({ error: 'orderId requerido' }, { status: 400 })
    }

    // Validar acceso a la orden (funciona tanto para usuarios autenticados como con token público)
    const order = await findAccessibleOrder(orderId, token, {
      select: {
        id: true,
        status: true,
        paymentType: true,
        mpPreferenceId: true,
        guestEmail: true,
        total: true,
        publicAccessTokenHash: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    })

    if (!order) {
      return Response.json({ error: 'Orden no encontrada o acceso denegado' }, { status: 404 })
    }

    if (order.paymentType !== 'MERCADOPAGO') {
      return Response.json({ error: 'Esta orden no usa MercadoPago' }, { status: 400 })
    }

    if (order.status !== 'PENDING') {
      return Response.json(
        { error: 'El pago ya fue procesado para esta orden' },
        { status: 409 }
      )
    }

    const client = getMPClient()
    const preferenceApi = new Preference(client)

    const baseUrl = req.nextUrl.origin
    const publicAccessToken = token // El token ya fue validado por findAccessibleOrder

    // Construir URLs de retorno (las mismas que en el checkout original)
    const successQuery = buildOrderAccessQuery(order.id, publicAccessToken ?? '')
    const successUrl = new URL('/checkout/success', baseUrl)
    successUrl.search = successQuery
    const failureUrl = new URL('/checkout', baseUrl)
    failureUrl.searchParams.set('error', 'pago_fallido')
    const pendingUrl = new URL('/checkout/success', baseUrl)
    pendingUrl.search = `${successQuery}&pending=true`
    const notificationUrl = new URL('/api/checkout/webhook', baseUrl)

    // Intentar reutilizar la preferencia existente
    if (order.mpPreferenceId) {
      try {
        const existingPreference = await preferenceApi.get({ preferenceId: order.mpPreferenceId })
        if (existingPreference?.init_point) {
          return Response.json({ initPoint: existingPreference.init_point })
        }
      } catch {
        // Preferencia expirada o inválida — crear una nueva
      }
    }

    // Crear nueva preferencia (con los mismos items de la orden original)
    const newPreference = await preferenceApi.create({
      body: {
        items: order.items.map((item) => ({
          id: item.productId,
          title: 'Producto ZAP',
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: 'ARS',
        })),
        payer: { email: order.guestEmail ?? undefined },
        external_reference: order.id,
        back_urls: {
          success: successUrl.toString(),
          failure: failureUrl.toString(),
          pending: pendingUrl.toString(),
        },
        notification_url: notificationUrl.toString(),
        auto_return: 'approved',
      },
    })

    // Actualizar la orden con la nueva preferencia
    await prisma.order.update({
      where: { id: order.id },
      data: { mpPreferenceId: newPreference.id },
    })

    return Response.json({ initPoint: newPreference.init_point })
  } catch (error: any) {
    console.error('Resume payment error:', error)
    return Response.json(
      { error: error.message || 'Error al recuperar el pago' },
      { status: 500 }
    )
  }
}
