import 'server-only'

import type { PartnerAccount } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const KIOSCO24_BASE_URL = process.env.KIOSCO24_BASE_URL ?? 'http://localhost:3001'
const PARTNER_INTERNAL_SECRET = process.env.PARTNER_INTERNAL_SECRET ?? ''

export type PartnerAuthResult =
  | { ok: true; partnerAccount: PartnerAccount }
  | { ok: false; status: number; error: string }

/**
 * Extrae y valida el Bearer token del header Authorization.
 * Si el PartnerAccount no existe aún, lo crea automáticamente
 * consultando a kiosco24 para obtener el branding del branch.
 */
export async function authenticatePartnerRequest(req: Request): Promise<PartnerAuthResult> {
  const authHeader = req.headers.get('authorization') ?? ''
  const accessKey = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null

  if (!accessKey) {
    return { ok: false, status: 401, error: 'Authorization header requerido (Bearer <accessKey>).' }
  }

  try {
    const partnerAccount = await findOrCreatePartnerAccount(accessKey)
    if (!partnerAccount) {
      return { ok: false, status: 401, error: 'AccessKey inválido o sucursal no encontrada en kiosco24.' }
    }
    if (!partnerAccount.active) {
      return { ok: false, status: 403, error: 'Esta sucursal no tiene acceso activo a los servicios de ZAP Tienda.' }
    }
    return { ok: true, partnerAccount }
  } catch (err) {
    console.error('[partner-auth] Error al autenticar partner:', err)
    return { ok: false, status: 500, error: 'Error interno al verificar la autenticación.' }
  }
}

/**
 * Busca el PartnerAccount por accessKey.
 * Si no existe, consulta a kiosco24 para verificarlo y lo crea (auto-registro).
 */
async function findOrCreatePartnerAccount(accessKey: string) {
  // 1. Buscar en DB local primero (fast path)
  const existing = await prisma.partnerAccount.findUnique({
    where: { kiosco24AccessKey: accessKey },
  })
  if (existing) return existing

  // 2. Auto-registro: verificar con kiosco24
  const branchInfo = await verifyAccessKeyWithKiosco24(accessKey)
  if (!branchInfo) return null

  // 3. Crear el PartnerAccount — upsert por si hay race condition
  return prisma.partnerAccount.upsert({
    where: { kiosco24BranchId: branchInfo.id },
    create: {
      kiosco24BranchId: branchInfo.id,
      kiosco24BranchName: branchInfo.name,
      kiosco24AccessKey: accessKey,
      kiosco24OwnerEmail: branchInfo.ownerEmail ?? null,
      logoUrl: branchInfo.logoUrl ?? null,
      primaryColor: branchInfo.primaryColor ?? null,
      active: true,
    },
    update: {
      // Actualizar branding cacheado si ya existía por branchId
      kiosco24AccessKey: accessKey,
      kiosco24BranchName: branchInfo.name,
      kiosco24OwnerEmail: branchInfo.ownerEmail ?? null,
      logoUrl: branchInfo.logoUrl ?? null,
      primaryColor: branchInfo.primaryColor ?? null,
    },
  })
}

type Kiosco24BranchInfo = {
  id: string
  name: string
  ownerEmail?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
}

/**
 * Llama a kiosco24/api/partner/verify para validar el accessKey.
 * Usa el secret compartido como autenticación interna.
 */
async function verifyAccessKeyWithKiosco24(accessKey: string): Promise<Kiosco24BranchInfo | null> {
  if (!PARTNER_INTERNAL_SECRET) {
    console.error('[partner-auth] PARTNER_INTERNAL_SECRET no configurado.')
    return null
  }

  try {
    const url = new URL('/api/partner/verify', KIOSCO24_BASE_URL)
    url.searchParams.set('key', accessKey)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-partner-secret': PARTNER_INTERNAL_SECRET,
        Accept: 'application/json',
      },
      // Timeout corto — si kiosco24 no responde, fallamos rápido
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return null

    const data = (await response.json()) as { valid: boolean; branch: Kiosco24BranchInfo & { ownerEmail: string } }
    if (!data.valid || !data.branch?.id) return null

    return {
      id: data.branch.id,
      name: data.branch.name,
      ownerEmail: data.branch.ownerEmail,
      logoUrl: data.branch.logoUrl,
      primaryColor: data.branch.primaryColor,
    }
  } catch (err) {
    console.error('[partner-auth] Error al verificar en kiosco24:', err)
    return null
  }
}

/**
 * Actualiza el branding cacheado de un PartnerAccount.
 * Se puede llamar en cada request para mantener el cache fresco.
 */
export async function refreshPartnerBranding(
  partnerAccountId: string,
  branding: { logoUrl?: string | null; primaryColor?: string | null; kiosco24BranchName?: string }
) {
  await prisma.partnerAccount.update({
    where: { id: partnerAccountId },
    data: {
      ...(branding.logoUrl !== undefined && { logoUrl: branding.logoUrl }),
      ...(branding.primaryColor !== undefined && { primaryColor: branding.primaryColor }),
      ...(branding.kiosco24BranchName && { kiosco24BranchName: branding.kiosco24BranchName }),
    },
  })
}
