import 'server-only'
import { NextResponse } from 'next/server'
import { authenticatePartnerRequest } from '@/lib/partner-auth'

export type AdFormat = 'text_only' | 'banner_small' | 'banner_large'

export interface AdPayload {
  id: string
  zone: string
  format: AdFormat
  content: {
    title: string
    description?: string
    ctaText?: string
    imageUrl?: string
    backgroundColor?: string
    textColor?: string
  }
  action?: {
    type: 'open_url' | 'one_click_order' | 'informational'
    url?: string
    productId?: string
  }
}

/**
 * GET /api/partner/ads?zone=xxx
 *
 * AdSense B2B para Kiosco24.
 * Recibe la zona y devuelve un slot publicitario o null si no hay nada para esa zona.
 */
export async function GET(req: Request) {
  const auth = await authenticatePartnerRequest(req)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const zone = searchParams.get('zone')

  // Mapeo básico estático temporal. 
  // TODO: Migrar a base de datos (Ej: tabla PartnerCampaigns).
  
  let ad: AdPayload | null = null

  if (zone === 'resumen') {
    // Zona Resumen: impacto alto visual
    ad = {
      id: 'promo-primavera-26',
      zone: 'resumen',
      format: 'banner_small',
      content: {
        title: '¡Vestí tu Kiosco para Primavera! 🌸',
        description: 'Impresión de cenefa superior y 2 vinilos promocionales con 50% OFF.',
        ctaText: 'Ver promo en ZAP',
        backgroundColor: '#fdf4ff',
        textColor: '#86198f', // fuchsia-800
      },
      action: {
        type: 'open_url',
        url: 'https://tienda.zap.com.ar', // TODO: URL directa al carrito o producto
      },
    }
  } else if (zone === 'stats') {
    // Zona Stats: texto sutil orientado a métricas
    ad = {
      id: 'flyers-boost',
      zone: 'stats',
      format: 'text_only',
      content: {
        title: '¿Las ventas están estancadas?',
        description: 'Probá imprimir 1000 flyers B&N para repartir en el barrio por solo $5000.',
        ctaText: 'Solicitar impresión',
      },
      action: {
        type: 'open_url',
        url: 'https://tienda.zap.com.ar',
      },
    }
  } else {
    // Para zonas sin campañas activas, devolvemos success pero data null
    return NextResponse.json({ data: null })
  }

  return NextResponse.json({ data: ad })
}
