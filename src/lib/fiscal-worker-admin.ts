import { NextResponse } from 'next/server'
import { auth } from '@/auth'

type WorkerSecret = 'internal' | 'provisioning'

export async function requireFiscalAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return null
}

export async function fiscalWorkerRequest(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE'
    secret: WorkerSecret
    body?: unknown
  }
) {
  const baseUrl = process.env.FISCAL_WORKER_URL?.trim()
  const secret = options.secret === 'internal'
    ? process.env.FISCAL_WORKER_INTERNAL_SECRET
    : process.env.FISCAL_WORKER_PROVISIONING_SECRET

  if (!baseUrl || !secret) {
    return NextResponse.json({
      error: 'La integración fiscal no está configurada en el servidor.',
      code: 'FISCAL_WORKER_NOT_CONFIGURED',
    }, { status: 503 })
  }

  let url: URL
  try {
    url = new URL(path, baseUrl.endsWith('/') ? baseUrl : baseUrl + '/')
  } catch {
    return NextResponse.json({
      error: 'FISCAL_WORKER_URL no es una URL válida.',
      code: 'FISCAL_WORKER_INVALID_URL',
    }, { status: 500 })
  }

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        [options.secret === 'internal' ? 'X-Internal-Secret' : 'X-Provisioning-Secret']: secret,
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })

    const text = await response.text()
    let payload: unknown = null
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = { error: 'El Worker devolvió una respuesta no JSON.' }
      }
    }

    return NextResponse.json(payload, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[admin/fiscal] Worker request failed', {
      path,
      error: error instanceof Error ? error.name : 'UnknownError',
    })
    return NextResponse.json({
      error: 'No se pudo conectar con el servicio fiscal.',
      code: 'FISCAL_WORKER_UNREACHABLE',
    }, { status: 502 })
  }
}
