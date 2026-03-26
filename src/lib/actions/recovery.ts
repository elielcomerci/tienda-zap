'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations'

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect('/recuperar?error=Email+inválido')
  }

  const { email } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    // Generar un token único seguro
    const token = crypto.randomUUID()
    const expires = new Date(Date.now() + 1000 * 60 * 60) // Expira en 1 hora

    // Guardarlo en la base de datos usando el modelo VerificationToken
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    })

    // TODO: Integrar Resend u otro servicio de mailing para enviar este enlace
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/recuperar/${token}`
    console.log(`\n\n=== ENLACE DE RECUPERACIÓN ===\nPara el usuario ${email}:\n${resetLink}\n==============================\n`)
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
    // Si expiró, borramos el token y mostramos error
    await prisma.verificationToken.delete({ where: { token } })
    redirect('/login?error=El+enlace+ha+expirado')
  }

  const hash = await bcrypt.hash(parsed.data.password, 12)

  // Actualizar la contraseña del usuario
  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { password: hash },
  })

  // Eliminar el token para que no pueda volver a usarse
  await prisma.verificationToken.delete({ where: { token } })

  redirect('/login?passwordReset=1')
}
