/**
 * POST /api/admin/ads/sync
 * 
 * Endpoint administrador (Tienda ZAP) para sincronizar manualmente o 
 * automáticamente las campañas activas hacia kiosco24 mediante Webhook.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
// Si existe protección de admin, importarla aquí. Por ahora sin auth estricto para facilitar pruebas,
// pero en producción debe ser protegida.

export const runtime = 'nodejs'

export async function POST() {
  const KIOSCO24_BASE_URL = process.env.KIOSCO24_BASE_URL ?? 'http://localhost:3001'
  const PARTNER_INTERNAL_SECRET = process.env.PARTNER_INTERNAL_SECRET ?? ''

  if (!PARTNER_INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Falta PARTNER_INTERNAL_SECRET' }, { status: 500 })
  }

  try {
    // 1. Obtener todas las campañas de Tienda ZAP
    const campaigns = await prisma.partnerCampaign.findMany()

    // 2. Disparar Webhook hacia Kiosco24
    const url = new URL('/api/webhooks/zap/campaigns', KIOSCO24_BASE_URL)
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-partner-secret': PARTNER_INTERNAL_SECRET,
      },
      body: JSON.stringify({ campaigns }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Kiosco24 respondió ${response.status}: ${errText}`)
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Sincronización exitosa con Kiosco24.',
      kioscoResponse: result,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[admin/ads/sync] Error:', errorMsg)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
