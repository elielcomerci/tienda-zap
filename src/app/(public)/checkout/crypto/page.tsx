'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, LoaderCircle, Wallet } from 'lucide-react'

type Payment = {
  id: string; status: string; chainId: number; networkKey: string; tokenSymbol: string
  arsAmount: string; tokenAmount: string; amountUnits: string; tokenContract: string
  tokenDecimals: number; recipientAddress: string; quotePriceArs: string; quoteSource: string
  expiresAt: string; txHash: string | null; explorerUrl: string | null; confirmations: number
}
type Provider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
declare global { interface Window { ethereum?: Provider } }

const chains: Record<number, { name: string; hex: string; currency: { name: string; symbol: string; decimals: number }; rpc: string; explorer: string }> = {
  8453: { name: 'Base', hex: '0x2105', currency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpc: 'https://mainnet.base.org', explorer: 'https://basescan.org' },
  10: { name: 'Optimism', hex: '0xa', currency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpc: 'https://mainnet.optimism.io', explorer: 'https://optimistic.etherscan.io' },
  480: { name: 'World Chain', hex: '0x1e0', currency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpc: 'https://worldchain-mainnet.g.alchemy.com/public', explorer: 'https://worldscan.org' },
}
const money = (n: string) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
const label = (s: string) => ({
  QUOTED: 'Cotización preparada', AWAITING_PAYMENT: 'Esperando transferencia',
  TX_SUBMITTED: 'Transacción enviada; esperando verificación', DETECTED: 'Transferencia detectada',
  CONFIRMING: 'Confirmando en la red', VERIFIED: 'Pago verificado', EXPIRED: 'Cotización vencida',
  REVIEW: 'Revisión manual necesaria', CANCELLED: 'Pago cancelado',
}[s] ?? 'Estado en revisión')

export default function CryptoCheckoutPage() {
  return <Suspense fallback={<main className="mx-auto max-w-3xl px-4 py-16 text-sm text-gray-500">Preparando el pago...</main>}><Content /></Suspense>
}

function Content() {
  const q = useSearchParams()
  const orderId = q.get('orderId') ?? ''
  const accessToken = q.get('accessToken') ?? ''
  const paymentId = q.get('paymentId') ?? ''
  const chainId = Number(q.get('chainId') ?? 8453)
  const tokenSymbol = (q.get('tokenSymbol') ?? 'USDC').toUpperCase()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [txHash, setTxHash] = useState('')
  const [copied, setCopied] = useState(false)

  const refresh = useCallback(async (id: string) => {
    const r = await fetch('/api/checkout/crypto/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: id, accessToken }), cache: 'no-store' })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || 'No pudimos consultar el estado del pago.')
    setPayment(data.payment)
    if (data.payment.txHash) setTxHash(data.payment.txHash)
  }, [accessToken])

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true); setError('')
      try {
        if (!accessToken) throw new Error('Falta el acceso al pedido. Volvé al checkout y generá el pago nuevamente.')
        if (paymentId) { await refresh(paymentId); return }
        if (!orderId || ![8453, 10, 480].includes(chainId) || !((chainId === 480 && tokenSymbol === 'WLD') || (chainId !== 480 && tokenSymbol === 'USDC'))) throw new Error('El pedido, la red o la moneda no son válidos.')
        const r = await fetch('/api/checkout/crypto/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, accessToken, chainId, tokenSymbol }), cache: 'no-store' })
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'No pudimos preparar la cotización.')
        if (cancelled) return
        setPayment(data.payment)
        const url = new URL(window.location.href)
        for (const key of ['orderId', 'chainId', 'tokenSymbol']) url.searchParams.delete(key)
        url.searchParams.set('paymentId', data.payment.id)
        window.history.replaceState(null, '', url.toString())
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'No pudimos preparar el pago.') }
      finally { if (!cancelled) setLoading(false) }
    }
    void init()
    return () => { cancelled = true }
  }, [accessToken, chainId, orderId, paymentId, refresh, tokenSymbol])

  const registerHash = async (id: string, hash: string) => {
    const r = await fetch('/api/checkout/crypto/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: id, accessToken, txHash: hash }) })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || 'No pudimos registrar el hash.')
    setNotice(data.message || 'Hash recibido; el pago todavía debe ser verificado.')
    await refresh(id)
  }

  const pay = async () => {
    if (!payment) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (payment.status !== 'AWAITING_PAYMENT' || Date.parse(payment.expiresAt) <= Date.now()) throw new Error('La cotización venció o ya tiene una transferencia en seguimiento.')
      const wallet = window.ethereum
      if (!wallet) throw new Error('No encontramos una wallet compatible. Abrí esta página desde tu wallet o una extensión compatible.')
      const accounts = await wallet.request({ method: 'eth_requestAccounts' }) as string[]
      if (!accounts?.[0]) throw new Error('No se seleccionó una cuenta.')
      const chain = chains[payment.chainId]
      let active = await wallet.request({ method: 'eth_chainId' }) as string
      if (active.toLowerCase() !== chain.hex) {
        try { await wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chain.hex }] }) }
        catch (e) {
          const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code?: number }).code : undefined
          if (code !== 4902) throw e
          await wallet.request({ method: 'wallet_addEthereumChain', params: [{ chainId: chain.hex, chainName: chain.name, nativeCurrency: chain.currency, rpcUrls: [chain.rpc], blockExplorerUrls: [chain.explorer] }] })
        }
        active = await wallet.request({ method: 'eth_chainId' }) as string
      }
      if (active.toLowerCase() !== chain.hex) throw new Error('La wallet sigue conectada a otra red.')
      const recipient = payment.recipientAddress.replace(/^0x/i, '').toLowerCase().padStart(64, '0')
      const amount = BigInt(payment.amountUnits).toString(16).padStart(64, '0')
      const hash = await wallet.request({ method: 'eth_sendTransaction', params: [{ from: accounts[0], to: payment.tokenContract, data: '0xa9059cbb' + recipient + amount, value: '0x0' }] }) as string
      if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new Error('La wallet no devolvió un hash válido.')
      setTxHash(hash)
      await registerHash(payment.id, hash)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo enviar la transferencia.') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-10 sm:py-16">
    <div className="mx-auto max-w-3xl rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ED164F]">Checkout ZAP · Cripto</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">Tu pago, paso a paso.</h1>
      <p className="mt-3 text-sm leading-7 text-gray-600">La cotización es una referencia de mercado. El pedido queda pendiente hasta verificar la transferencia en la red.</p>
      {loading && <p className="mt-8 flex items-center gap-2 text-sm text-gray-600"><LoaderCircle className="animate-spin" size={18} /> Preparando el pago...</p>}
      {error && <div role="alert" className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle size={18} />{error}</div>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">{notice}</p>}
      {payment && !loading && <div className="mt-8 space-y-5">
        <section className="rounded-2xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-gray-500">Total del pedido</p><p className="text-2xl font-black">{money(payment.arsAmount)}</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">{chains[payment.chainId]?.name ?? payment.networkKey} · {payment.tokenSymbol}</span></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase text-gray-500">Cantidad exacta</p><p className="mt-1 break-all text-xl font-bold">{payment.tokenAmount} {payment.tokenSymbol}</p></div><div><p className="text-xs font-semibold uppercase text-gray-500">Referencia de precio</p><p className="mt-1 text-sm">1 {payment.tokenSymbol} = {money(payment.quotePriceArs)}</p><p className="text-xs text-gray-500">{payment.quoteSource}</p></div></div>
          <p className="mt-5 text-xs font-semibold uppercase text-gray-500">Dirección receptora</p><div className="mt-2 flex flex-wrap gap-2"><code className="min-w-0 flex-1 break-all rounded-xl bg-gray-50 p-3 text-xs">{payment.recipientAddress}</code><button type="button" onClick={() => navigator.clipboard.writeText(payment.recipientAddress).then(() => setCopied(true)).catch(() => setError('Copiá la dirección manualmente.'))} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><Copy size={15} />{copied ? 'Copiada' : 'Copiar'}</button></div>
          <p className="mt-4 text-xs text-gray-500">Vence: {new Date(payment.expiresAt).toLocaleString('es-AR')}. No envíes otra moneda ni uses otra red.</p>
        </section>
        <section className="rounded-2xl border border-gray-200 p-5"><div className="flex items-start gap-3">{payment.status === 'VERIFIED' ? <CheckCircle2 className="text-emerald-600" size={20} /> : <LoaderCircle className="text-violet-600" size={20} />}<div className="min-w-0 flex-1"><p className="font-bold">{label(payment.status)}</p><p className="mt-1 text-sm leading-6 text-gray-600">{payment.status === 'VERIFIED' ? 'La transferencia fue verificada.' : payment.status === 'REVIEW' ? 'No hagas otra transferencia; este pago requiere revisión.' : 'No consideres el pedido pagado hasta que el estado indique “Pago verificado”.'}</p></div><button type="button" disabled={busy} onClick={() => { setBusy(true); void refresh(payment.id).catch(e => setError(e instanceof Error ? e.message : 'No pudimos actualizar.')).finally(() => setBusy(false)) }} className="rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50">Actualizar</button></div>
          {txHash && <p className="mt-4 break-all text-xs text-gray-600">Hash: <code>{txHash}</code></p>}
          {payment.explorerUrl && <a href={payment.explorerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-violet-700">Ver transacción <ExternalLink size={14} /></a>}
        </section>
        {payment.status === 'AWAITING_PAYMENT' && !txHash && <button type="button" onClick={() => void pay()} disabled={busy || Date.parse(payment.expiresAt) <= Date.now()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ED164F] px-5 py-4 text-sm font-bold text-white hover:bg-[#c2103f] disabled:opacity-50">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <Wallet size={18} />}{busy ? 'Procesando wallet...' : `Pagar ${payment.tokenAmount} ${payment.tokenSymbol}`}</button>}
        {(payment.status === 'TX_SUBMITTED' || (payment.status === 'AWAITING_PAYMENT' && Boolean(txHash))) && txHash && <button type="button" onClick={() => void registerHash(payment.id, txHash).catch(e => setError(e instanceof Error ? e.message : 'No pudimos registrar el hash.'))} className="w-full rounded-2xl border px-5 py-3 text-sm font-semibold">Reintentar registro del hash</button>}
      </div>}
    </div>
  </main>
}
