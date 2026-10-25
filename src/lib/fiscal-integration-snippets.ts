export type FiscalIntegrationStack = 'node-typescript' | 'python'
export type FiscalIntegrationSnippet = 'connection' | 'contributors' | 'invoice'

type IntegrationFile = { name: string; content: string }

export function getIntegrationSource(stack: FiscalIntegrationStack): IntegrationFile {
  if (stack === 'node-typescript') {
    return {
      name: 'src/zap-fiscal.ts',
      content: `const baseUrl = process.env.ZAP_FISCAL_BASE_URL
const apiKey = process.env.ZAP_FISCAL_API_KEY
const environment = process.env.ZAP_FISCAL_ENVIRONMENT

function configuration() {
  if (!baseUrl || !apiKey || !environment) throw new Error('Configurá las variables ZAP_FISCAL_*')
  return { baseUrl, apiKey, environment }
}

async function request(path: string, init: RequestInit = {}) {
  const { baseUrl, apiKey } = configuration()
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers: { Accept: 'application/json', 'X-Api-Key': apiKey, ...init.headers },
  })
  const payload = await response.json() as { error?: { code?: string; message?: string } }
  if (!response.ok) throw new Error('ZAP Fiscal ' + response.status + ' ' + (payload.error?.code ?? 'ERROR') + ': ' + (payload.error?.message ?? 'Solicitud fallida'))
  return payload
}

export async function testConnection() {
  return request('/v1/connection-check')
}

export async function listContributors() {
  const { environment, baseUrl, apiKey } = configuration()
  const url = new URL('/v1/contributors', baseUrl)
  url.searchParams.set('environment', environment)
  const response = await fetch(url, { headers: { 'X-Api-Key': apiKey, Accept: 'application/json' } })
  const payload = await response.json() as { contributors?: unknown[]; error?: { code?: string; message?: string } }
  if (!response.ok) throw new Error('ZAP Fiscal ' + response.status + ' ' + (payload.error?.code ?? 'ERROR') + ': ' + (payload.error?.message ?? 'Solicitud fallida'))
  return payload.contributors ?? []
}

export async function emitTestInvoice() {
  const { environment } = configuration()
  if (environment !== 'TEST') throw new Error('La emisión de prueba solo se habilita con ZAP_FISCAL_ENVIRONMENT=TEST')
  const cuit = process.env.ZAP_FISCAL_TEST_CUIT ?? ''
  const pointOfSale = Number(process.env.ZAP_FISCAL_TEST_POINT_OF_SALE)
  const externalId = process.env.ZAP_FISCAL_TEST_EXTERNAL_ID ?? ''
  if (!/^\\d{11}$/.test(cuit) || !Number.isInteger(pointOfSale) || pointOfSale < 1 || !/^[A-Za-z0-9_-]{1,80}$/.test(externalId)) {
    throw new Error('Configurá ZAP_FISCAL_TEST_CUIT, ZAP_FISCAL_TEST_POINT_OF_SALE y ZAP_FISCAL_TEST_EXTERNAL_ID')
  }
  const dateParts = new Intl.DateTimeFormat('en', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const date = ['year', 'month', 'day'].map(type => dateParts.find(part => part.type === type)?.value ?? '').join('')
  return request('/v1/invoices/emit?sync=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      externalId,
      idempotencyKey: 'nodo-test-' + externalId,
      contributor: { cuit, pointOfSale, environment: 'TEST' },
      voucher: { type: 'B', concept: 1, date },
      amounts: { total: 121, net: 100, vat: 21, vatBreakdown: [{ rate: 21, base: 100, amount: 21 }] },
      customer: { docType: 99, docNumber: '0', name: 'Consumidor Final', vatCondition: 5 },
    }),
  })
}
`,
    }
  }

  return {
    name: 'zap_fiscal.py',
    content: `import json
import os
import re
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

# Load the downloaded .env for this example; production systems should inject secrets.
env_file = Path('.env')
if env_file.exists():
    for line in env_file.read_text(encoding='utf-8').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            name, value = line.split('=', 1)
            os.environ.setdefault(name.strip(), value.strip())

BASE_URL = os.environ.get('ZAP_FISCAL_BASE_URL', '').rstrip('/')
API_KEY = os.environ.get('ZAP_FISCAL_API_KEY', '')
ENVIRONMENT = os.environ.get('ZAP_FISCAL_ENVIRONMENT', '')

def request_json(path, method='GET', body=None):
    if not BASE_URL or not API_KEY:
        raise RuntimeError('Configurá ZAP_FISCAL_BASE_URL y ZAP_FISCAL_API_KEY')
    data = json.dumps(body).encode('utf-8') if body is not None else None
    headers = {'X-Api-Key': API_KEY, 'Accept': 'application/json'}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    request = Request(BASE_URL + path, data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=25) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as error:
        payload = json.loads(error.read().decode('utf-8'))
        detail = payload.get('error', {})
        raise RuntimeError(f"ZAP Fiscal {error.code} {detail.get('code', 'ERROR')}: {detail.get('message', 'Solicitud fallida')}") from error
    except URLError as error:
        raise RuntimeError(f'No se pudo conectar con ZAP Fiscal: {error.reason}') from error

def test_connection():
    return request_json('/v1/connection-check')

def list_contributors():
    if ENVIRONMENT not in ('TEST', 'PROD'):
        raise RuntimeError('ZAP_FISCAL_ENVIRONMENT debe ser TEST o PROD')
    return request_json('/v1/contributors?' + urlencode({'environment': ENVIRONMENT})).get('contributors', [])

def emit_test_invoice():
    if ENVIRONMENT != 'TEST':
        raise RuntimeError('La emisión de prueba solo se habilita con ZAP_FISCAL_ENVIRONMENT=TEST')
    cuit = os.environ.get('ZAP_FISCAL_TEST_CUIT', '')
    point_of_sale = os.environ.get('ZAP_FISCAL_TEST_POINT_OF_SALE', '')
    external_id = os.environ.get('ZAP_FISCAL_TEST_EXTERNAL_ID', '')
    if not re.fullmatch(r'\\d{11}', cuit) or not point_of_sale.isdigit() or int(point_of_sale) < 1 or not re.fullmatch(r'[A-Za-z0-9_-]{1,80}', external_id):
        raise RuntimeError('Configurá ZAP_FISCAL_TEST_CUIT, ZAP_FISCAL_TEST_POINT_OF_SALE y ZAP_FISCAL_TEST_EXTERNAL_ID')
    date = datetime.now(ZoneInfo('America/Argentina/Buenos_Aires')).strftime('%Y%m%d')
    body = {
        'externalId': external_id,
        'idempotencyKey': 'nodo-test-' + external_id,
        'contributor': {'cuit': cuit, 'pointOfSale': int(point_of_sale), 'environment': 'TEST'},
        'voucher': {'type': 'B', 'concept': 1, 'date': date},
        'amounts': {'total': 121, 'net': 100, 'vat': 21, 'vatBreakdown': [{'rate': 21, 'base': 100, 'amount': 21}]},
        'customer': {'docType': 99, 'docNumber': '0', 'name': 'Consumidor Final', 'vatCondition': 5},
    }
    return request_json('/v1/invoices/emit?sync=true', method='POST', body=body)
`,
  }
}

export function getIntegrationExample(stack: FiscalIntegrationStack, snippet: FiscalIntegrationSnippet): IntegrationFile {
  if (stack === 'node-typescript') {
    if (snippet === 'connection') return { name: 'examples/test-connection.ts', content: `import { testConnection } from '../src/zap-fiscal.ts'

const result = await testConnection() as { tenant?: { name?: string; slug?: string }; connection?: { baseUrl?: string; sourceIp?: string | null; country?: string | null; colo?: string | null }; checkedAt?: string }
console.log('Conexión con ZAP Fiscal: OK')
console.log('Cuenta:', result.tenant?.name ?? result.tenant?.slug ?? 'validada')
console.log('API:', result.connection?.baseUrl)
console.log('IP pública de salida observada por ZAP:', result.connection?.sourceIp ?? 'no informada')
console.log('País / punto de presencia:', [result.connection?.country, result.connection?.colo].filter(Boolean).join(' / ') || 'no informado')
console.log('Verificada:', result.checkedAt)
` }
    if (snippet === 'invoice') return { name: 'examples/emit-test-invoice.ts', content: `import { emitTestInvoice } from '../src/zap-fiscal.ts'

const result = await emitTestInvoice()
console.log(JSON.stringify(result, null, 2))
console.log('El mismo ZAP_FISCAL_TEST_EXTERNAL_ID reutiliza la misma idempotencia; cambialo solo para solicitar otra factura TEST.')
` }
    return { name: 'examples/list-contributors.ts', content: `import { listContributors } from '../src/zap-fiscal.ts'

const contributors = await listContributors()
console.log(JSON.stringify(contributors, null, 2))
` }
  }

  if (snippet === 'connection') return { name: 'examples/test_connection.py', content: `import json
from zap_fiscal import test_connection

result = test_connection()
connection = result.get('connection', {})
tenant = result.get('tenant', {})
print('Conexión con ZAP Fiscal: OK')
print('Cuenta:', tenant.get('name') or tenant.get('slug') or 'validada')
print('API:', connection.get('baseUrl'))
print('IP pública de salida observada por ZAP:', connection.get('sourceIp') or 'no informada')
print('País / punto de presencia:', ' / '.join(filter(None, [connection.get('country'), connection.get('colo')])) or 'no informado')
print('Verificada:', result.get('checkedAt'))
` }
  if (snippet === 'invoice') return { name: 'examples/emit_test_invoice.py', content: `import json
from zap_fiscal import emit_test_invoice

result = emit_test_invoice()
print(json.dumps(result, ensure_ascii=False, indent=2))
print('El mismo ZAP_FISCAL_TEST_EXTERNAL_ID reutiliza la misma idempotencia; cambialo solo para solicitar otra factura TEST.')
` }
  return { name: 'examples/list_contributors.py', content: `import json
from zap_fiscal import list_contributors

print(json.dumps(list_contributors(), ensure_ascii=False, indent=2))
` }
}

export function getIntegrationPackageExamples(stack: FiscalIntegrationStack): IntegrationFile[] {
  return [getIntegrationExample(stack, 'connection'), getIntegrationExample(stack, 'invoice')]
}
