import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function answerText(value: unknown) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.trim()).join(', ')
  return clean(value)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const productId = clean(body.productId)
    const customerName = clean(body.customerName)
    const customerPhone = clean(body.customerPhone)
    const customerEmail = clean(body.customerEmail).toLowerCase()
    const businessTypeId = clean(body.businessTypeId) || null
    const rawContext = body.context && typeof body.context === 'object' ? body.context as Record<string, unknown> : null
    const context = rawContext
      ? {
          businessTypeSlug: clean(rawContext.businessTypeSlug) || undefined,
          situationSlug: clean(rawContext.situationSlug) || undefined,
          needSlug: clean(rawContext.needSlug) || undefined,
        }
      : null
    const hasContext = Boolean(context?.businessTypeSlug || context?.situationSlug || context?.needSlug)
    const answers = (body.answers || {}) as Record<string, unknown>

    if (!productId || !customerName || !customerPhone) {
      return Response.json({ error: 'Completá tus datos de contacto.' }, { status: 400 })
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return Response.json({ error: 'Revisá el email.' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, slug: true, modality: true, catalogType: true },
    })

    if (!product) return Response.json({ error: 'No encontramos este producto.' }, { status: 404 })

    if (product.modality !== 'CONSULTAR' && product.catalogType !== 'DESARROLLO') {
      return Response.json({ error: 'Este producto no requiere una consulta previa.' }, { status: 400 })
    }

    const snapshot = {
      source: 'product-context-form',
      product: { id: product.id, name: product.name, slug: product.slug },
      context: hasContext ? JSON.parse(JSON.stringify(context)) : null,
      answers: JSON.parse(JSON.stringify(answers)),
      submittedAt: new Date().toISOString(),
    }

    const lines = Object.entries(answers)
      .filter(([, value]) => answerText(value))
      .map(([key, value]) => (key.endsWith('_otro') ? 'Aclaración' : key) + ': ' + answerText(value))

    const contextLine = hasContext
      ? 'Contexto: ' + [context?.businessTypeSlug, context?.situationSlug, context?.needSlug].filter(Boolean).join(' · ')
      : null
    const message = ['Consulta de ' + product.name, contextLine, '', ...lines].filter((line) => line !== null).join('\n')

    const requestRecord = await prisma.consultRequest.create({
      data: {
        productId: product.id,
        businessTypeId,
        snapshot,
        customerName,
        customerEmail: customerEmail || '',
        customerPhone,
        message,
      },
    })

    return Response.json({ ok: true, id: requestRecord.id })
  } catch (error) {
    console.error('Product consultation error:', error)
    return Response.json({ error: 'No pudimos enviar la consulta. Probá de nuevo.' }, { status: 500 })
  }
}
