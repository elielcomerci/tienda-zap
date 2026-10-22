import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey() {
  const configured = process.env.FISCAL_CREDENTIALS_ENCRYPTION_KEY?.trim()
  if (!configured) throw new Error('FISCAL_CREDENTIALS_ENCRYPTION_KEY is not configured')

  const key = Buffer.from(configured, 'base64')
  if (key.length !== 32) {
    throw new Error('FISCAL_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  }
  return key
}

/** Encrypts tenant API credentials for server-side support workflows only. */
export function encryptFiscalCredential(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.')
}

/** Decrypts credentials only inside authenticated server-side routes. */
export function decryptFiscalCredential(value: string) {
  const [version, ivText, tagText, ciphertextText, extra] = value.split('.')
  if (version !== 'v1' || !ivText || !tagText || !ciphertextText || extra !== undefined) {
    throw new Error('Invalid encrypted fiscal credential format')
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivText, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
