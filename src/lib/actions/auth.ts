'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { registerSchema, updateProfileSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function registerUser(formData: FormData): Promise<void> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || 'Datos inválidos'
    redirect(`/registro?error=${encodeURIComponent(msg)}`)
  }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (exists) {
    redirect('/registro?error=Este+email+ya+está+registrado')
  }

  const hash = await bcrypt.hash(parsed.data.password, 12)
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      password: hash,
      role: 'CUSTOMER',
    },
  })

  redirect('/login?registered=1')
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
