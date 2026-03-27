export function normalizeWhatsappNumber(value?: string | null) {
  return (value || '').replace(/\D/g, '')
}

export function buildWhatsappUrl(number: string | undefined | null, text: string) {
  const normalized = normalizeWhatsappNumber(number)
  if (!normalized) return null

  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
}
