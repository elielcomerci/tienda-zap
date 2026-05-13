import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ZAP Tienda <onboarding@resend.dev>'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY no configurado, email omitido:', subject)
    return
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error('[email] Error enviando email:', error)
  }
}

/**
 * Fire-and-forget email — never blocks the caller.
 */
export function sendEmailAsync(params: { to: string; subject: string; html: string }) {
  sendEmail(params).catch(() => {})
}
