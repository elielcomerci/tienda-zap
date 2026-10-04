import { NextResponse } from 'next/server'
import { getPublicSituations } from '@/lib/discovery'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rubro = searchParams.get('rubro') ?? undefined

  const situations = await getPublicSituations(rubro)

  return NextResponse.json(
    situations.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      icon: s.icon,
    }))
  )
}
