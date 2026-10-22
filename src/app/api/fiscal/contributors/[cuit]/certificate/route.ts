import { NextRequest, NextResponse } from 'next/server'
import { resolveFiscalAccount, fiscalApiRequest } from '@/lib/fiscal-account-access'
import { isFiscalFeatureEnabled } from '@/lib/fiscal-feature-flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ cuit: string }> }

export async function GET(request: NextRequest, context: Context) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  const { cuit } = await context.params
  if (!/^\d{11}$/.test(cuit)) return NextResponse.json({ error: 'CUIT inválida.' }, { status: 422 })
  return fiscalApiRequest(request, `/v1/contributors/${encodeURIComponent(cuit)}/certificate`, access.apiKey)
}

export async function POST(request: NextRequest, context: Context) {
  if (!(await isFiscalFeatureEnabled('certificateManagement'))) return NextResponse.json({ error: 'La gestión de certificados está desactivada por el administrador.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  const { cuit } = await context.params
  if (!/^\d{11}$/.test(cuit)) return NextResponse.json({ error: 'CUIT inválida.' }, { status: 422 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Subí los archivos de certificado y clave privada.' }, { status: 400 })
  }
  const cert = form.get('cert')
  const key = form.get('key')
  const environment = form.get('environment')
  if (!(cert instanceof File) || !(key instanceof File) || !['TEST', 'PROD'].includes(String(environment))) {
    return NextResponse.json({ error: 'Se requieren certificado, clave privada y ambiente TEST o PROD.' }, { status: 422 })
  }
  if (cert.size <= 0 || key.size <= 0 || cert.size > 2 * 1024 * 1024 || key.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'Cada archivo debe pesar hasta 2 MB.' }, { status: 422 })
  }
  const outgoing = new FormData()
  outgoing.append('cert', cert, cert.name)
  outgoing.append('key', key, key.name)
  outgoing.append('environment', String(environment))
  return fiscalApiRequest(request, `/v1/contributors/${encodeURIComponent(cuit)}/certificate`, access.apiKey, outgoing)
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!(await isFiscalFeatureEnabled('certificateManagement'))) return NextResponse.json({ error: 'La gestión de certificados está desactivada por el administrador.', code: 'FISCAL_FEATURE_DISABLED' }, { status: 423 })
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  const { cuit } = await context.params
  if (!/^\d{11}$/.test(cuit)) return NextResponse.json({ error: 'CUIT inválida.' }, { status: 422 })
  return fiscalApiRequest(request, `/v1/contributors/${encodeURIComponent(cuit)}/certificate`, access.apiKey)
}
