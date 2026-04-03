import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/products-selector
 * Devuelve id+name+slug+price de todos los productos activos para el selector del formulario de campañas.
 */
export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const products = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true, price: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ products })
}
