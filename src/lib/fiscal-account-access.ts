import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { decryptFiscalCredential } from '@/lib/fiscal-credentials'

export async function resolveFiscalAccount(request: NextRequest, allowPausedRead = false) {
  const session = await auth()
  if (!session?.user?.id || !session.user.role) {
    return { response: NextResponse.json({ error: 'Iniciá sesión para continuar.' }, { status: 401 }) } as const
  }

  const isAdmin = session.user.role === 'ADMIN'
  const requestedAccountId = request.nextUrl.searchParams.get('accountId')
  if (isAdmin && !requestedAccountId) {
    return { response: NextResponse.json({ error: 'Seleccioná una cuenta de cliente para operar.' }, { status: 422 }) } as const
  }

  const account = await prisma.fiscalClientAccount.findFirst({
    where: isAdmin ? { id: requestedAccountId! } : { userId: session.user.id },
    select: { id: true, userId: true, tenantId: true, encryptedApiKey: true, status: true },
  })
  if (!account || (account.status !== 'ACTIVE' && !(allowPausedRead && account.status === 'PAUSED'))) {
    return { response: NextResponse.json({ error: 'No hay una cuenta fiscal activa vinculada.' }, { status: 404 }) } as const
  }

  try {
    return { account, apiKey: decryptFiscalCredential(account.encryptedApiKey), isAdmin } as const
  } catch (error) {
    console.error('[fiscal/access] credential decrypt failed', error instanceof Error ? error.name : 'UnknownError')
    return { response: NextResponse.json({ error: 'No se pudo abrir la credencial fiscal protegida.' }, { status: 503 }) } as const
  }
}

export async function fiscalApiRequest(request: NextRequest, path: string, apiKey: string, body?: BodyInit) {
  const baseUrl = process.env.FISCAL_WORKER_URL?.trim()
  if (!baseUrl) return NextResponse.json({ error: 'FISCAL_WORKER_URL no está configurada.' }, { status: 503 })
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : baseUrl + '/')
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    if (key !== 'accountId') url.searchParams.append(key, value)
  }
  const headers = new Headers({ 'X-Api-Key': apiKey, Accept: 'application/json' })
  const contentType = request.headers.get('content-type')
  if (body !== undefined && contentType && !contentType.includes('multipart/form-data')) headers.set('Content-Type', contentType)

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      ...(body !== undefined ? { body } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })
    const text = await response.text()
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[fiscal/access] Worker request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'No se pudo conectar con el servicio fiscal.' }, { status: 502 })
  }
}
