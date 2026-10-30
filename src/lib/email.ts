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
  idempotencyKey,
}: {
  to: string
  subject: string
  html: string
  idempotencyKey?: string
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
    }, idempotencyKey ? { idempotencyKey } : undefined)
  } catch (error) {
    console.error('[email] Error enviando email:', error)
  }
}

/**
 * Fire-and-forget email — never blocks the caller.
 */
export function sendEmailAsync(params: { to: string; subject: string; html: string; idempotencyKey?: string }) {
  sendEmail(params).catch(() => {})
}


export async function sendProposalEmailVerification({ to, verificationUrl }: { to: string; verificationUrl: string }) {
  const resend = getResendClient()
  if (!resend) throw new Error('EMAIL_NOT_CONFIGURED')
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Confirmá tu email para ver la propuesta — ZAP',
    html: `<!doctype html><html lang="es"><body style="margin:0;padding:32px 16px;background:#f7f7f7;font-family:Arial,sans-serif;color:#111"><main style="max-width:560px;margin:auto;padding:32px;background:#fff;border-radius:16px"><p style="font-size:12px;letter-spacing:.16em;font-weight:700;color:#315c9b">ZAP · PROPUESTA PRIVADA</p><h1 style="font-size:24px">Confirmemos que sos vos.</h1><p style="font-size:15px;line-height:1.6;color:#555">Para abrir la propuesta, necesitamos comprobar que tenés acceso a esta dirección de email.</p><p style="margin:28px 0"><a href="${verificationUrl}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#111;color:#fff;text-decoration:none;font-weight:700">Confirmar email y continuar</a></p><p style="font-size:12px;line-height:1.6;color:#888">El enlace vence en una hora y solo puede utilizarse una vez. Si no solicitaste esta confirmación, podés ignorar este mensaje.</p></main></body></html>`,
  })
  if (result.error) throw new Error('EMAIL_SEND_FAILED')
}
