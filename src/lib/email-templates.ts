// ──────────────────────────────────────────────────────────────────
// ZAP Tienda — Email Templates (HTML inline, no framework needed)
// ──────────────────────────────────────────────────────────────────

const LOGO_URL = 'https://res.cloudinary.com/dip14vkem/image/upload/v1756568241/logo_t37blz.png'

function baseUrl() {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

function wrapTemplate(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Open Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#ED2C71,#4576B9);padding:28px 32px;text-align:center;">
  <img src="${LOGO_URL}" alt="ZAP" width="48" height="48" style="display:block;margin:0 auto 8px;">
  <p style="color:#fff;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;margin:0;">Tienda ZAP</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px;">
  ${body}
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
  <p style="color:#999;font-size:11px;margin:0;">© ${new Date().getFullYear()} ZAP Agencia Creativa · Mar del Plata</p>
  <p style="color:#bbb;font-size:11px;margin:4px 0 0;">Este email fue enviado automáticamente, no respondas a esta dirección.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#ED2C71,#4576B9);color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:999px;text-decoration:none;margin-top:16px;">${label}</a>`
}

function heading(text: string) {
  return `<h1 style="color:#111;font-size:22px;font-weight:800;margin:0 0 12px;">${text}</h1>`
}

function paragraph(text: string) {
  return `<p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 12px;">${text}</p>`
}

function divider() {
  return '<hr style="border:none;border-top:1px solid #eee;margin:20px 0;">'
}

// ──────── Templates ────────

export function orderConfirmationEmail(data: {
  customerName: string
  orderCode: string
  total: number
  itemCount: number
  paymentType: string
}) {
  const paymentLabels: Record<string, string> = {
    MERCADOPAGO: 'MercadoPago',
    TRANSFER: 'Transferencia',
    CASH: 'Efectivo',
    ZAP_CREDIT: 'Crédito ZAP',
  }

  const body = `
    ${heading(`¡Gracias por tu pedido, ${data.customerName}!`)}
    ${paragraph(`Tu orden <strong>#${data.orderCode}</strong> fue recibida correctamente.`)}
    ${divider()}
    <table width="100%" cellpadding="8" style="font-size:14px;">
      <tr><td style="color:#888;">Productos</td><td style="text-align:right;font-weight:700;color:#111;">${data.itemCount} item${data.itemCount > 1 ? 's' : ''}</td></tr>
      <tr><td style="color:#888;">Total</td><td style="text-align:right;font-weight:700;color:#ED2C71;">$${data.total.toLocaleString('es-AR')}</td></tr>
      <tr><td style="color:#888;">Medio de pago</td><td style="text-align:right;font-weight:700;color:#111;">${paymentLabels[data.paymentType] || data.paymentType}</td></tr>
    </table>
    ${divider()}
    ${paragraph('Te avisaremos cuando confirmemos tu pago y cuando tu pedido avance.')}
    <div style="text-align:center;">${btn(`${baseUrl()}/perfil/ordenes`, 'Ver mis pedidos')}</div>
  `

  return {
    subject: `Pedido #${data.orderCode} recibido — ZAP Tienda`,
    html: wrapTemplate('Pedido recibido', body),
  }
}

export function paymentConfirmedEmail(data: {
  customerName: string
  orderCode: string
}) {
  const body = `
    ${heading('Tu pago fue confirmado')}
    ${paragraph(`Hola ${data.customerName}, confirmamos el pago de tu pedido <strong>#${data.orderCode}</strong>.`)}
    ${paragraph('Ya estamos trabajando en tu pedido. Te avisaremos cuando tengamos una prueba de diseño o cuando esté listo.')}
    <div style="text-align:center;">${btn(`${baseUrl()}/perfil/ordenes`, 'Ver mi pedido')}</div>
  `

  return {
    subject: `Pago confirmado — Pedido #${data.orderCode}`,
    html: wrapTemplate('Pago confirmado', body),
  }
}

export function proofReadyEmail(data: {
  customerName: string
  orderCode: string
  proofNote?: string | null
  reviewUrl: string
}) {
  const body = `
    ${heading('Tu prueba de diseño está lista')}
    ${paragraph(`Hola ${data.customerName}, preparamos una prueba para tu pedido <strong>#${data.orderCode}</strong>.`)}
    ${data.proofNote ? paragraph(`<em>Nota del diseñador:</em> ${data.proofNote}`) : ''}
    ${paragraph('Revisala y confirmá si está todo bien para arrancar producción.')}
    <div style="text-align:center;">${btn(data.reviewUrl, 'Revisar prueba de diseño')}</div>
    ${divider()}
    ${paragraph('<small>Si necesitás cambios, podés indicarlo desde el mismo link.</small>')}
  `

  return {
    subject: `Prueba de diseño lista — Pedido #${data.orderCode}`,
    html: wrapTemplate('Prueba de diseño', body),
  }
}

export function proofApprovedEmail(data: {
  customerName: string
  orderCode: string
}) {
  const body = `
    ${heading('¡Diseño aprobado, arrancamos producción!')}
    ${paragraph(`Hola ${data.customerName}, confirmaste el diseño del pedido <strong>#${data.orderCode}</strong>.`)}
    ${paragraph('Ya estamos produciendo tu pedido. Te avisaremos cuando esté listo para retiro o envío.')}
    <div style="text-align:center;">${btn(`${baseUrl()}/perfil/ordenes`, 'Ver mi pedido')}</div>
  `

  return {
    subject: `Diseño aprobado — Pedido #${data.orderCode}`,
    html: wrapTemplate('En producción', body),
  }
}

export function orderReadyEmail(data: {
  customerName: string
  orderCode: string
}) {
  const body = `
    ${heading('¡Tu pedido está listo!')}
    ${paragraph(`Hola ${data.customerName}, tu pedido <strong>#${data.orderCode}</strong> está terminado y listo.`)}
    ${paragraph('Coordiná el retiro o esperá el envío según lo acordado.')}
    <div style="text-align:center;">${btn(`${baseUrl()}/perfil/ordenes`, 'Ver detalle')}</div>
  `

  return {
    subject: `Pedido #${data.orderCode} listo — ZAP Tienda`,
    html: wrapTemplate('Pedido listo', body),
  }
}

export function passwordResetEmail(data: {
  resetLink: string
}) {
  const body = `
    ${heading('Recuperá tu contraseña')}
    ${paragraph('Recibimos un pedido para restablecer la contraseña de tu cuenta.')}
    <div style="text-align:center;">${btn(data.resetLink, 'Crear nueva contraseña')}</div>
    ${divider()}
    ${paragraph('<small>Este enlace expira en 1 hora. Si no solicitaste este cambio, ignorá este email.</small>')}
  `

  return {
    subject: 'Recuperar contraseña — ZAP Tienda',
    html: wrapTemplate('Recuperar contraseña', body),
  }
}
