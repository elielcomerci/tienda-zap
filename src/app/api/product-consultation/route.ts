import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
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
    const answers = (body.answers || {}) as Record<string, unknown>

    if (!productId || !customerName || !customerPhone || !customerEmail) {
      return Response.json({ error: 'Completá tus datos de contacto.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
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

    const snapshot: Prisma.InputJsonValue = {
      source: 'product-context-form',
      product: { id: product.id, name: product.name, slug: product.slug },
      answers,
      submittedAt: new Date().toISOString(),
    }

    const lines = Object.entries(answers)
      .filter(([, value]) => answerText(value))
      .map(([key, value]) => (key.endsWith('_otro') ? 'Aclaración' : key) + ': ' + answerText(value))

    const message = ['Consulta de ' + product.name, '', ...lines].join('\n')

    const requestRecord = await prisma.consultRequest.create({
      data: {
        productId: product.id,
        businessTypeId,
        snapshot,
        customerName,
        customerEmail,
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
