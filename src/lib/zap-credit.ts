export function isZapCreditEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ZAP_CREDIT_ENABLED !== 'false'
}
