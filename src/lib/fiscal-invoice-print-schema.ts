import { z } from 'zod'
import type { FiscalPdfInvoice } from '@/lib/fiscal-invoice-pdf'

const invoicePayloadSchema = z.object({
  voucher: z.object({
    type: z.string().optional(), concept: z.number().optional(), date: z.string().optional(),
    serviceFrom: z.string().optional(), serviceTo: z.string().optional(), paymentDueDate: z.string().optional(), saleCondition: z.string().optional(),
  }).passthrough().nullable().optional(),
  amounts: z.object({
    total: z.number().optional(), net: z.number().optional(), vat: z.number().optional(), exempt: z.number().optional(),
    nonTaxable: z.number().optional(), otherNationalIndirectTaxes: z.number().optional(),
    vatBreakdown: z.array(z.object({ rate: z.number(), base: z.number(), amount: z.number() })).optional(),
  }).passthrough().nullable().optional(),
  items: z.array(z.object({
    description: z.string(), quantity: z.number(), unit: z.string().optional(), unitPrice: z.number(), discountAmount: z.number().optional(),
    netAmount: z.number(), vatRate: z.number().nullable().optional(), vatAmount: z.number(), exemptAmount: z.number().optional(),
    nonTaxableAmount: z.number().optional(), totalAmount: z.number(),
  }).passthrough()).nullable().optional(),
  customer: z.object({
    docType: z.number().optional(), docNumber: z.string().optional(), name: z.string().nullable().optional(),
    address: z.string().nullable().optional(), vatCondition: z.number().optional(),
  }).passthrough().nullable().optional(),
}).passthrough()

const snapshotSchema = z.object({
  emitter: z.object({
    cuit: z.string().optional(), razonSocial: z.string().nullable().optional(), domicilioFiscal: z.string().nullable().optional(),
    condicionIva: z.string().nullable().optional(), inicioActividad: z.string().nullable().optional(), grossIncomeRegistration: z.string().nullable().optional(),
  }).passthrough().nullable().optional(),
  recipient: invoicePayloadSchema.shape.customer,
  items: invoicePayloadSchema.shape.items,
  amounts: invoicePayloadSchema.shape.amounts,
  invoice: invoicePayloadSchema.shape.voucher,
}).passthrough()

const templateSchema = z.object({
  legalName: z.string().optional(), issuerCuit: z.string().optional(), ivaCondition: z.string().optional(),
  grossIncomeRegistration: z.string().optional(), startActivity: z.string().optional(), taxAddress: z.string().optional(),
  commercialName: z.string().optional(), address: z.string().optional(), locality: z.string().optional(), province: z.string().optional(),
  phone: z.string().optional(), whatsapp: z.string().optional(), website: z.string().optional(), logoUrl: z.string().optional(),
  primaryColor: z.string().optional(), showWebsite: z.boolean().optional(), showWhatsapp: z.boolean().optional(), footerText: z.string().optional(),
  arcaSource: z.enum(['ARCA_CONSTANCIA', 'ARCA_A13', '']).optional(), arcaConsultedAt: z.string().optional(), activities: z.string().optional(),
  designVariant: z.enum(['classic', 'modern', 'editorial']).optional(),
}).passthrough()

const fiscalPdfInvoiceSchema = z.object({
  id: z.string(), environment: z.string(), cuit: z.string(), pointOfSale: z.number().int(), voucherType: z.number().int(),
  voucherNumber: z.number().int().nullable(), result: z.string().nullable(), cae: z.string().nullable(), caeExpiresAt: z.string().nullable(),
  amount: z.union([z.string(), z.number().transform(value => String(value))]).nullable(), currency: z.string().nullable().optional(),
  createdAt: z.string(), payload: invoicePayloadSchema.extend({
    documentSnapshot: snapshotSchema.nullable().optional(), pdfTemplateSnapshot: templateSchema.nullable().optional(), status: z.string().optional(),
  }).nullable().optional(),
  documentSnapshot: snapshotSchema.nullable().optional(), pdfTemplateSnapshot: templateSchema.nullable().optional(),
}).passthrough()

export function parseFiscalPdfInvoice(value: unknown): FiscalPdfInvoice | null {
  const parsed = fiscalPdfInvoiceSchema.safeParse(value)
  if (!parsed.success) return null
  const documentSnapshot = parsed.data.documentSnapshot ?? parsed.data.payload?.documentSnapshot ?? null
  const pdfTemplateSnapshot = parsed.data.pdfTemplateSnapshot ?? parsed.data.payload?.pdfTemplateSnapshot ?? null
  return {
    ...parsed.data,
    voucherNumber: parsed.data.voucherNumber ?? null,
    result: parsed.data.result ?? null,
    cae: parsed.data.cae ?? null,
    caeExpiresAt: parsed.data.caeExpiresAt ?? null,
    amount: parsed.data.amount ?? null,
    ...(documentSnapshot ? { documentSnapshot } : {}),
    ...(pdfTemplateSnapshot ? { pdfTemplateSnapshot } : {}),
  }
}
