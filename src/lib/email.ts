import { Resend } from 'resend'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ZAP Tienda <onboarding@resend.dev>'

let resendClient: Resend | null = null

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

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
    const resend = getResendClient()
    if (!resend) return

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
