/**
 * Cálculo fiscal puro a partir del snapshot del pedido.
 * Los precios de OrderItem representan el importe comercial cobrado.
 */
const VAT_RATES = new Set([0, 2.5, 5, 10.5, 21, 27])
const cents = (value: number) => Math.round((value + Number.EPSILON) * 100)
const pesos = (value: number) => value / 100
const sameMoney = (a: number, b: number) => cents(a) === cents(b)

export type FiscalInvoiceLine = {
  description: string
  quantity: number
  unitPrice: number
  discountAmount: number
  netAmount: number
  vatRate: number | null
  vatAmount: number
  exemptAmount: number
  nonTaxableAmount: number
  totalAmount: number
}

export type FiscalInvoiceAmounts = {
  total: number
  net: number
  vat: number
  exempt: number
  nonTaxable: number
}

export type InvoiceRecipient = {
  name: string
  docType: number
  docNumber: string
  vatCondition: number
  address: string
  city: string
  province: string
}

export function getFiscalWorkerConfig() {
  const baseUrl = (process.env.FISCAL_WORKER_URL || 'https://arca.zap.com.ar').replace(/\/+$/, '')
  const apiKey = process.env.FISCAL_WORKER_API_KEY
  const cuit = process.env.ARCA_EMITTER_CUIT
  const pointOfSale = Number(process.env.ARCA_POINT_OF_SALE || 0)
  const environment = process.env.ARCA_FISCAL_ENVIRONMENT
  const issuerVatCondition = process.env.ARCA_ISSUER_VAT_CONDITION
  const issuerIibb = process.env.ARCA_ISSUER_IIBB

  const validIssuerConditions = ['MONOTRIBUTO', 'RESP_INSCRIPTO', 'EXENTO', 'NO_RESPONSABLE']
  if (!apiKey || !cuit || !/^\d{11}$/.test(cuit) || !Number.isInteger(pointOfSale) || pointOfSale < 1 ||
      (environment !== 'TEST' && environment !== 'PROD') ||
      !issuerVatCondition || !validIssuerConditions.includes(issuerVatCondition) || !issuerIibb?.trim()) {
    throw new Error('Falta configurar la conexión fiscal de Tienda ZAP (API key, CUIT, punto de venta, entorno, condición fiscal e Ingresos Brutos del emisor).')
  }

  return {
    baseUrl, apiKey, cuit, pointOfSale,
    environment: environment as 'TEST' | 'PROD',
    issuerVatCondition: issuerVatCondition as 'MONOTRIBUTO' | 'RESP_INSCRIPTO' | 'EXENTO' | 'NO_RESPONSABLE',
    issuerIibb: issuerIibb.trim(),
  }
}

export function deriveVoucherType(issuerVatCondition: string, recipientVatCondition: number) {
  if (issuerVatCondition === 'MONOTRIBUTO' || issuerVatCondition === 'EXENTO') return 'C'
  if (issuerVatCondition === 'RESP_INSCRIPTO') return recipientVatCondition === 1 ? 'A' : 'B'
  throw new Error('La condición fiscal configurada para el emisor necesita una regla de comprobante revisada antes de habilitar la emisión automática.')
}

export function buildInvoiceDetails(order: any): { items: FiscalInvoiceLine[]; amounts: FiscalInvoiceAmounts } {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('El pedido no tiene artículos facturables.')
  }
  if (order.items.some((item: any) => !['VAT', 'EXEMPT', 'NON_TAXABLE'].includes(item.fiscalTaxTreatment || ''))) {
    throw new Error('Hay artículos sin clasificación fiscal guardada en el pedido. No se puede inferir el IVA; hace falta una revisión.')
  }

  const grossCents = order.items.map((item: any) => cents(item.unitPrice * item.quantity))
  const grossSubtotalCents = grossCents.reduce((sum: number, value: number) => sum + value, 0)
  const discountCents = cents(Number(order.discountTotal || 0))
  if (discountCents < 0 || discountCents > grossSubtotalCents) {
    throw new Error('El descuento del pedido no puede distribuirse de forma fiscalmente consistente.')
  }

  const allocatedDiscounts = grossCents.map((lineCents: number, index: number) => {
    if (index === grossCents.length - 1) {
      return discountCents - grossCents.slice(0, index).reduce((sum: number, value: number, i: number) => {
        return sum + Math.floor(value * discountCents / Math.max(grossSubtotalCents, 1))
      }, 0)
    }
    return Math.floor(lineCents * discountCents / Math.max(grossSubtotalCents, 1))
  })

  const items: FiscalInvoiceLine[] = order.items.map((item: any, index: number) => {
    const grossAfterDiscountCents = grossCents[index] - allocatedDiscounts[index]
    if (grossAfterDiscountCents < 0) throw new Error('El descuento supera el importe de una línea.')

    let netCents = 0
    let vatCents = 0
    let exemptCents = 0
    let nonTaxableCents = 0
    let vatRate: number | null = null

    if (item.fiscalTaxTreatment === 'VAT') {
      vatRate = Number(item.fiscalVatRate)
      if (!VAT_RATES.has(vatRate)) throw new Error(`Falta una alícuota válida para ${item.productName || item.product?.name || 'un artículo'}.`)
      netCents = vatRate === 0
        ? grossAfterDiscountCents
        : Math.round(grossAfterDiscountCents / (1 + vatRate / 100))
      vatCents = grossAfterDiscountCents - netCents
      if (vatCents !== Math.round(netCents * vatRate / 100)) {
        throw new Error(`El redondeo del IVA de «${item.productName || item.product?.name || 'un artículo'}» requiere revisión antes de emitir.`)
      }
    } else if (item.fiscalTaxTreatment === 'EXEMPT') {
      exemptCents = grossAfterDiscountCents
    } else {
      nonTaxableCents = grossAfterDiscountCents
    }

    const totalCents = netCents + vatCents + exemptCents + nonTaxableCents
    const quantity = Number(item.quantity)
    const unitPrice = pesos(cents(item.unitPrice))
    const discountAmount = pesos(allocatedDiscounts[index])
    const totalAmount = pesos(totalCents)

    return {
      description: String(item.productName || item.product?.name || 'Artículo').trim().slice(0, 250),
      quantity,
      unitPrice,
      discountAmount,
      netAmount: pesos(netCents),
      vatRate,
      vatAmount: pesos(vatCents),
      exemptAmount: pesos(exemptCents),
      nonTaxableAmount: pesos(nonTaxableCents),
      totalAmount,
    }
  })

  const amounts = {
    total: pesos(items.reduce((sum, item) => sum + cents(item.totalAmount), 0)),
    net: pesos(items.reduce((sum, item) => sum + cents(item.netAmount), 0)),
    vat: pesos(items.reduce((sum, item) => sum + cents(item.vatAmount), 0)),
    exempt: pesos(items.reduce((sum, item) => sum + cents(item.exemptAmount || 0), 0)),
    nonTaxable: pesos(items.reduce((sum, item) => sum + cents(item.nonTaxableAmount || 0), 0)),
  }

  if (!sameMoney(amounts.total, Number(order.total))) {
    throw new Error('El total de las líneas no coincide con el total cobrado. El pedido necesita una revisión antes de facturarse.')
  }

  const groupedVat = new Map<number, { baseCents: number; amountCents: number }>()
  for (const item of items) {
    if (item.netAmount <= 0 || typeof item.vatRate !== 'number') continue
    const group = groupedVat.get(item.vatRate) || { baseCents: 0, amountCents: 0 }
    group.baseCents += cents(item.netAmount)
    group.amountCents += cents(item.vatAmount)
    groupedVat.set(item.vatRate, group)
  }
  for (const [rate, group] of groupedVat) {
    if (group.amountCents !== Math.round(group.baseCents * rate / 100)) {
      throw new Error('El redondeo agrupado del IVA no coincide con el detalle por artículo. Se requiere revisión antes de emitir.')
    }
  }

  return { items, amounts }
}

