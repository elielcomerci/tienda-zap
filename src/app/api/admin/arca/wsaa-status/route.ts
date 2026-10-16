import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return Response.json({ error: 'No autorizado.' }, {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const baseUrl = (process.env.FISCAL_WORKER_URL || 'https://arca.zap.com.ar').replace(/\/+$/, '')
  const internalSecret = process.env.FISCAL_WORKER_INTERNAL_SECRET
  if (!internalSecret) {
    return Response.json({ error: 'El estado operativo fiscal no está configurado.' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${baseUrl}/internal/wsaa/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Internal-Secret': internalSecret,
      },
      cache: 'no-store',
    })
  } catch {
    return Response.json({ error: 'No se pudo conectar con el servicio fiscal.' }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  if (!upstream.ok) {
    return Response.json({
      error: upstream.status === 401 || upstream.status === 403
        ? 'El servicio fiscal rechazó la autenticación interna.'
        : 'El servicio fiscal no pudo entregar el estado operativo.',
    }, {
      status: upstream.status === 401 || upstream.status === 403 ? 502 : 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  let payload: unknown
  try {
    payload = await upstream.json()
  } catch {
    return Response.json({ error: 'El servicio fiscal devolvió una respuesta inválida.' }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    !Array.isArray((payload as { tickets?: unknown }).tickets) ||
    !Array.isArray((payload as { blocks?: unknown }).blocks) ||
    typeof (payload as { checkedAt?: unknown }).checkedAt !== 'string'
  ) {
    return Response.json({ error: 'El servicio fiscal devolvió un formato de estado incompatible.' }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  return Response.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
