'use server'

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations'
import { sendEmailAsync } from '@/lib/email'
import { passwordResetEmail } from '@/lib/email-templates'

function getAppBaseUrl() {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null)

  if (!baseUrl) {
    throw new Error('NEXTAUTH_URL no está configurado.')
  }

  return baseUrl
}

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect('/recuperar?error=Email+inválido')
  }

  const { email } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    const token = crypto.randomUUID()
    const expires = new Date(Date.now() + 1000 * 60 * 60)

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    })

    const resetLink = `${getAppBaseUrl()}/recuperar/${token}`

    const template = passwordResetEmail({ resetLink })
    sendEmailAsync({ to: email, ...template })

    if (process.env.NODE_ENV === 'development') {
      console.log(`Enlace de recuperación para ${email}: ${resetLink}`)
    }
  }

  // Siempre redirigimos a success incluso si el email no existe (para no filtrar emails registrados a un atacante)
  redirect('/recuperar?success=1')
}

export async function resetPassword(formData: FormData): Promise<void> {
  const token = formData.get('token') as string
  if (!token) redirect('/login?error=Token+inválido')

  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || 'Datos inválidos'
    redirect(`/recuperar/${token}?error=${encodeURIComponent(msg)}`)
  }

  const verificationToken = await prisma.verificationToken.findFirst({
    where: { token },
  })

  if (!verificationToken) {
    redirect('/login?error=El+enlace+es+inválido+o+ya+fue+usado')
  }

  if (new Date() > verificationToken.expires) {
    await prisma.verificationToken.delete({ where: { token } })
    redirect('/login?error=El+enlace+ha+expirado')
  }

  const hash = await bcrypt.hash(parsed.data.password, 12)

  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { password: hash },
  })

  await prisma.verificationToken.delete({ where: { token } })

  redirect('/login?passwordReset=1')
}
