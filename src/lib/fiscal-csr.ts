const encoder = new TextEncoder()

function concat(...parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) { output.set(part, offset); offset += part.length }
  return output
}

function der(tag: number, value: Uint8Array): Uint8Array {
  const length = value.length
  let encodedLength: Uint8Array
  if (length < 128) encodedLength = new Uint8Array([length])
  else {
    const bytes: number[] = []
    let remaining = length
    while (remaining > 0) { bytes.unshift(remaining & 0xff); remaining >>>= 8 }
    encodedLength = new Uint8Array([0x80 | bytes.length, ...bytes])
  }
  return concat(new Uint8Array([tag]), encodedLength, value)
}

function sequence(...values: Uint8Array[]): Uint8Array { return der(0x30, concat(...values)) }

function oid(value: string): Uint8Array {
  const arcs = value.split('.').map(Number)
  const bytes: number[] = [arcs[0] * 40 + arcs[1]]
  for (const arc of arcs.slice(2)) {
    const encoded = [arc & 0x7f]
    let remaining = Math.floor(arc / 128)
    while (remaining > 0) { encoded.unshift(0x80 | (remaining & 0x7f)); remaining = Math.floor(remaining / 128) }
    bytes.push(...encoded)
  }
  return der(0x06, new Uint8Array(bytes))
}

function attribute(id: string, value: string, tag = 0x0c): Uint8Array {
  return der(0x31, sequence(oid(id), der(tag, encoder.encode(value))))
}

function base64(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return btoa(binary)
}

function pem(label: string, bytes: Uint8Array): string {
  const encoded = base64(bytes).match(/.{1,64}/g)?.join('\n') ?? ''
  return '-----BEGIN ' + label + '-----\n' + encoded + '\n-----END ' + label + '-----\n'
}

export async function createArcaCsr(input: { organization: string; commonName: string; cuit: string }): Promise<{ csr: string; privateKey: string }> {
  if (!/^\d{11}$/.test(input.cuit)) throw new Error('La CUIT debe tener 11 digitos.')
  if (!input.organization.trim() || !input.commonName.trim()) throw new Error('Completá organizacion y nombre de sistema.')
  if (/[\/\r\n]/.test(input.organization) || /[\/\r\n]/.test(input.commonName)) throw new Error('Quitá barras y saltos de linea de los nombres.')

  const pair = await crypto.subtle.generateKey({
    name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256',
  }, true, ['sign', 'verify'])
  const [spki, pkcs8] = await Promise.all([
    crypto.subtle.exportKey('spki', pair.publicKey), crypto.subtle.exportKey('pkcs8', pair.privateKey),
  ])

  // ARCA's OpenSSL example uses C=AR, O, CN and serialNumber="CUIT nnnnn".
  const subject = sequence(
    attribute('2.5.4.6', 'AR', 0x13),
    attribute('2.5.4.10', input.organization.trim()),
    attribute('2.5.4.3', input.commonName.trim()),
    attribute('2.5.4.5', 'CUIT ' + input.cuit, 0x13),
  )
  const requestInfo = sequence(new Uint8Array([0x02, 0x01, 0x00]), subject, new Uint8Array(spki), new Uint8Array([0xa0, 0x00]))
  const requestInfoBuffer = new Uint8Array(requestInfo).buffer as ArrayBuffer
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, requestInfoBuffer))
  const signatureValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pair.publicKey, signature, requestInfoBuffer)
  if (!signatureValid) throw new Error('No se pudo verificar la firma del CSR generado.')
  const sha256WithRsa = sequence(oid('1.2.840.113549.1.1.11'), new Uint8Array([0x05, 0x00]))
  const csrDer = sequence(requestInfo, sha256WithRsa, der(0x03, concat(new Uint8Array([0]), signature)))
  return { csr: pem('CERTIFICATE REQUEST', csrDer), privateKey: pem('PRIVATE KEY', new Uint8Array(pkcs8)) }
}