import { NextRequest, NextResponse } from 'next/server'
import { resolveFiscalAccount } from '@/lib/fiscal-account-access'
import { getFiscalFeatureFlags } from '@/lib/fiscal-feature-flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await resolveFiscalAccount(request, true)
  if ('response' in access) return access.response
  return NextResponse.json({ flags: await getFiscalFeatureFlags() }, { headers: { 'Cache-Control': 'no-store' } })
}
