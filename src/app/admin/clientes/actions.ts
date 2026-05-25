'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
  return session
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeTags(value?: string | null) {
  return (value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function normalizeDate(value?: string | null) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

function toAuditJson(value: unknown) {
  return value == null ? Prisma.JsonNull : JSON.parse(JSON.stringify(value))
}

async function writeAudit(input: {
  actor: Awaited<ReturnType<typeof requireAdmin>>
  action: string
  entityType: string
  entityId?: string | null
  description?: string
  before?: unknown
  after?: unknown
  metadata?: unknown
}) {
  await prisma.adminAuditLog.create({
    data: {
      actorId: input.actor.user?.id ?? null,
      actorEmail: input.actor.user?.email ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      description: input.description,
      before: toAuditJson(input.before),
      after: toAuditJson(input.after),
      metadata: toAuditJson(input.metadata),
    },
  })
}

export async function saveBusinessAccount(formData: FormData) {
  const actor = await requireAdmin()
  const id = normalizeText(formData.get('id') as string)
  const name = normalizeText(formData.get('name') as string)

  if (!name) {
    throw new Error('El nombre del negocio es requerido.')
  }

  const data = {
    name,
    legalName: normalizeText(formData.get('legalName') as string),
    taxId: normalizeText(formData.get('taxId') as string),
    businessTypeId: normalizeText(formData.get('businessTypeId') as string),
    status: ((formData.get('status') as string) || 'PROSPECT') as 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'LOST',
    source: normalizeText(formData.get('source') as string),
    tags: normalizeTags(formData.get('tags') as string),
    notes: normalizeText(formData.get('notes') as string),
    nextActionAt: normalizeDate(formData.get('nextActionAt') as string),
    assignedSellerId: normalizeText(formData.get('assignedSellerId') as string),
    operationalSellerId: normalizeText(formData.get('operationalSellerId') as string),
    userId: normalizeText(formData.get('userId') as string),
  }

  const before = id
    ? await prisma.businessAccount.findUnique({ where: { id }, include: { contacts: true } })
    : null

  const account = id
    ? await prisma.businessAccount.update({ where: { id }, data })
    : await prisma.businessAccount.create({ data })

  await writeAudit({
    actor,
    action: id ? 'businessAccount.update' : 'businessAccount.create',
    entityType: 'BusinessAccount',
    entityId: account.id,
    description: id ? `Cuenta comercial actualizada: ${account.name}` : `Cuenta comercial creada: ${account.name}`,
    before,
    after: account,
  })

  revalidatePath('/admin/clientes')
}

export async function saveBusinessContact(formData: FormData) {
  const actor = await requireAdmin()
  const id = normalizeText(formData.get('id') as string)
  const accountId = normalizeText(formData.get('accountId') as string)
  const firstName = normalizeText(formData.get('firstName') as string)

  if (!accountId) throw new Error('Selecciona una cuenta comercial.')
  if (!firstName) throw new Error('El nombre del contacto es requerido.')

  const isPrimary = formData.get('isPrimary') === 'on'
  const data = {
    accountId,
    firstName,
    lastName: normalizeText(formData.get('lastName') as string),
    role: normalizeText(formData.get('role') as string),
    email: normalizeText(formData.get('email') as string),
    phone: normalizeText(formData.get('phone') as string),
    whatsapp: normalizeText(formData.get('whatsapp') as string),
    isPrimary,
    notes: normalizeText(formData.get('notes') as string),
  }

  const before = id ? await prisma.businessContact.findUnique({ where: { id } }) : null

  const contact = await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.businessContact.updateMany({
        where: { accountId, ...(id ? { NOT: { id } } : {}) },
        data: { isPrimary: false },
      })
    }

    return id
      ? tx.businessContact.update({ where: { id }, data })
      : tx.businessContact.create({ data })
  })

  await writeAudit({
    actor,
    action: id ? 'businessContact.update' : 'businessContact.create',
    entityType: 'BusinessContact',
    entityId: contact.id,
    description: id
      ? `Contacto comercial actualizado: ${contact.firstName}`
      : `Contacto comercial creado: ${contact.firstName}`,
    before,
    after: contact,
  })

  revalidatePath('/admin/clientes')
}
