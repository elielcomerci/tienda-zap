'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { registerSchema, updateProfileSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function registerUser(formData: FormData): Promise<void> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || 'Datos inválidos'
    redirect(`/registro?error=${encodeURIComponent(msg)}`)
  }

  if (parsed.data.documentId) {
    const isBannedDoc = await prisma.user.findFirst({
      where: { documentId: parsed.data.documentId, isBanned: true },
    })
    if (isBannedDoc) {
      redirect('/registro?error=No+puedes+registrarte+con+este+documento')
    }
  }

  const exists = await prisma.user.findFirst({ 
    where: { 
      OR: [
        { email: parsed.data.email },
        ...(parsed.data.documentId ? [{ documentId: parsed.data.documentId }] : []),
      ]
    } 
  })
  if (exists) {
    if (exists.isBanned) {
      redirect('/registro?error=Cuenta+bloqueada')
    }
    redirect('/registro?error=Email+o+documento+ya+registrado')
  }

  const hash = await bcrypt.hash(parsed.data.password, 12)
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      documentId: parsed.data.documentId || null,
      businessTypeId: parsed.data.businessTypeId || null,
      password: hash,
      role: 'CUSTOMER',
      sellerId: (await cookies()).get('zap_seller_ref')?.value || null,
    },
  })

  redirect('/login?registered=1')
}

export async function registerSeller(formData: FormData): Promise<void> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || 'Datos inválidos'
    redirect(`/seller/registro?error=${encodeURIComponent(msg)}`)
  }

  if (parsed.data.documentId) {
    const isBannedDoc = await prisma.user.findFirst({
      where: { documentId: parsed.data.documentId, isBanned: true },
    })
    if (isBannedDoc) {
      redirect('/seller/registro?error=No+puedes+registrarte+con+este+documento')
    }
  }

  const exists = await prisma.user.findFirst({ 
    where: { 
      OR: [
        { email: parsed.data.email },
        ...(parsed.data.documentId ? [{ documentId: parsed.data.documentId }] : []),
      ]
    } 
  })
  
  if (exists) {
    if (exists.isBanned) {
      redirect('/seller/registro?error=Cuenta+bloqueada')
    }
    redirect('/seller/registro?error=Email+o+documento+ya+registrado')
  }

  const hash = await bcrypt.hash(parsed.data.password, 12)
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      documentId: parsed.data.documentId || null,
      businessTypeId: parsed.data.businessTypeId || null,
      password: hash,
      role: 'SELLER',
      sellerProfile: {
        create: {
          active: false,
          defaultCommissionRate: 20.0,
        }
      }
    },
  })

  redirect('/login?registered=1&sellerPending=1')
}

export async function updateProfile(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect('/perfil?error=Datos+inválidos')
  }

  const { name, phone, currentPassword, newPassword } = parsed.data

  if (currentPassword && newPassword) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) redirect('/login')
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) redirect('/perfil?error=Contraseña+actual+incorrecta')
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone: phone || null,
      ...(newPassword ? { password: await bcrypt.hash(newPassword, 12) } : {}),
    },
  })

  revalidatePath('/perfil')
  redirect('/perfil?saved=1')
}

export async function updateClientNote(clientId: string, note: string | null) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('No autorizado')
  
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { sellerId: true }
  })
  
  if (client?.sellerId !== session.user.id && session.user.role !== 'ADMIN') {
    throw new Error('No autorizado para modificar este cliente')
  }

  await prisma.user.update({
    where: { id: clientId },
    data: { sellerNote: note }
  })

  revalidatePath('/seller/clientes')
}
