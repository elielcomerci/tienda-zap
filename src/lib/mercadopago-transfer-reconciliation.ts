import { z } from 'zod'

const paymentSearchSchema = z.object({
  paging: z.object({ total: z.number().int().nonnegative() }),
  results: z.array(z.unknown()),
})

const paymentSchema = z.object({
  id: z.union([z.string(), z.number()]),
  collector_id: z.union([z.string(), z.number()]),
  status: z.string(),
  status_detail: z.string().optional(),
  payment_type_id: z.string(),
  payment_method_id: z.string(),
  operation_type: z.string(),
  transaction_amount: z.union([z.string(), z.number()]),
  currency_id: z.string(),
  date_created: z.string(),
  payer: z.object({
    identification: z.object({ type: z.string().optional(), number: z.string().optional() }).optional(),
  }).optional(),
  transaction_details: z.object({ transaction_id: z.string().optional() }).optional(),
}).passthrough()

export type MatchedMercadoPagoTransfer = {
  paymentId: string
  transactionId: string
  amount: number
  payerDocument: string
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function localDateRange(date: string) {
  const start = new Date(`${date}T00:00:00-03:00`)
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date) {
    throw new Error('La fecha de transferencia no es válida.')
  }
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

async function getJson<T>(url: URL, token: string, schema: z.ZodType<T>) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Mercado Pago respondió HTTP ${response.status}.`)
  return schema.parse(await response.json())
}

export async function findMatchingMercadoPagoTransfer(input: {
  date: string
  referenceSuffix: string
  amount: number
  customerDocument: string
  minDate: Date
  maxDate: Date
}): Promise<MatchedMercadoPagoTransfer | null> {
  const token = process.env.MP_ACCESS_TOKEN?.trim()
  if (!token) throw new Error('Mercado Pago no está configurado para verificar transferencias.')
  if (!/^\d{5,6}$/.test(input.referenceSuffix)) throw new Error('Ingresá los últimos 5 o 6 dígitos de la operación.')

  const dateRange = localDateRange(input.date)
  if (Number.isNaN(dateRange.start.getTime())) throw new Error('La fecha de transferencia no es válida.')

  const accountUrl = new URL('https://api.mercadopago.com/users/me')
  const account = await getJson(accountUrl, token, z.object({ id: z.union([z.string(), z.number()]) }).passthrough())
  const matches: MatchedMercadoPagoTransfer[] = []

  for (let offset = 0; offset < 1000; offset += 100) {
    const searchUrl = new URL('https://api.mercadopago.com/v1/payments/search')
    searchUrl.searchParams.set('sort', 'date_created')
    searchUrl.searchParams.set('criteria', 'desc')
    searchUrl.searchParams.set('range', 'date_created')
    searchUrl.searchParams.set('begin_date', dateRange.start.toISOString())
    searchUrl.searchParams.set('end_date', dateRange.end.toISOString())
    searchUrl.searchParams.set('limit', '100')
    searchUrl.searchParams.set('offset', String(offset))

    const result = await getJson(searchUrl, token, paymentSearchSchema)
    for (const rawPayment of result.results) {
      const parsed = paymentSchema.safeParse(rawPayment)
      if (!parsed.success) continue
      const payment = parsed.data
      const transactionId = payment.transaction_details?.transaction_id || ''
      const payerDocument = normalizeDigits(payment.payer?.identification?.number || '')
      const paymentDate = new Date(payment.date_created)
      const amount = Number(payment.transaction_amount)
      if (
        String(payment.collector_id) === String(account.id) &&
        payment.status === 'approved' &&
        payment.status_detail === 'accredited' &&
        payment.payment_type_id === 'bank_transfer' &&
        payment.payment_method_id === 'cvu' &&
        payment.operation_type === 'account_fund' &&
        payment.currency_id === 'ARS' &&
        Number.isFinite(amount) && Math.round(amount * 100) === Math.round(input.amount * 100) &&
        payerDocument === normalizeDigits(input.customerDocument) &&
        transactionId.endsWith(input.referenceSuffix) &&
        paymentDate >= dateRange.start && paymentDate < dateRange.end &&
        paymentDate >= input.minDate && paymentDate <= input.maxDate
      ) {
        matches.push({ paymentId: String(payment.id), transactionId, amount, payerDocument })
      }
    }

    if (offset + 100 >= result.paging.total) break
    if (offset === 900 && result.paging.total > 1000) {
      throw new Error('Hay demasiados movimientos para validar esta fecha automáticamente.')
    }
  }

  return matches.length === 1 ? matches[0] : null
}
