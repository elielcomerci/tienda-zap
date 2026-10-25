import { createHmac, timingSafeEqual } from 'node:crypto'

export type FiscalPadronProof = {
  userId: string
  cuit: string
  razonSocial: string
  estadoRegistral?: string
  expiresAt: number
}

function signingSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ''
}

function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function signFiscalPadronResult(input: Omit<FiscalPadronProof, 'expiresAt'>): string | null {
  const secret = signingSecret()
  if (!secret) return null
  const payload = Buffer.from(JSON.stringify({ ...input, expiresAt: Date.now() + 10 * 60 * 1000 })).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}

export function verifyFiscalPadronResult(token: string, userId: string, cuit: string): FiscalPadronProof | null {
  const secret = signingSecret()
  const [payload, suppliedSignature, extra] = token.split('.')
  if (!secret || !payload || !suppliedSignature || extra !== undefined) return null
  const expected = signature(payload, secret)
  const suppliedBuffer = Buffer.from(suppliedSignature)
  const expectedBuffer = Buffer.from(expected)
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null

  try {
    const proof = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as FiscalPadronProof
    if (proof.userId !== userId || proof.cuit !== cuit || !/^\d{11}$/.test(proof.cuit) ||
        typeof proof.razonSocial !== 'string' || !proof.razonSocial.trim() || proof.razonSocial.length > 180 ||
        !Number.isSafeInteger(proof.expiresAt) || proof.expiresAt < Date.now()) return null
    return proof
  } catch {
    return null
  }
}
