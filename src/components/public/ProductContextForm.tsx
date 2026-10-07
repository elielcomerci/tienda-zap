'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Check, LoaderCircle } from 'lucide-react'
import { PRODUCT_INQUIRY_CONFIGS, type ProductInquiryQuestion } from '@/lib/product-inquiry-config'

type AnswerValue = string | string[]

function normalizeAnswer(value: AnswerValue | undefined) {
  return Array.isArray(value) ? value.filter(Boolean).join(', ') : value?.trim() || ''
}

function otherSelected(value: AnswerValue | undefined) {
  return Array.isArray(value) ? value.includes('Otro') : value === 'Otro'
}

export default function ProductContextForm({
  product,
  businessTypeId,
}: {
  product: { id: string; slug: string; name: string; catalogType: string; modality: string }
  businessTypeId?: string | null
}) {
  const config = PRODUCT_INQUIRY_CONFIGS[product.slug]
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [otherValues, setOtherValues] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const requiredComplete = useMemo(() => {
    if (!config) return false
    return config.questions.every((question) => {
      if (!question.required) return true
      const value = answers[question.id]
      if (question.type === 'text') return normalizeAnswer(value).length > 0
      if (!normalizeAnswer(value)) return false
      return !otherSelected(value) || Boolean(otherValues[question.id]?.trim())
    })
  }, [answers, config, otherValues])

  if (!config) return null

  const setSingle = (question: ProductInquiryQuestion, value: string) => {
    setAnswers((current) => ({ ...current, [question.id]: value }))
    if (value !== 'Otro') setOtherValues((current) => ({ ...current, [question.id]: '' }))
  }

  const toggleMultiple = (question: ProductInquiryQuestion, value: string) => {
    const current = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : []
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    setAnswers((previous) => ({ ...previous, [question.id]: next }))
    if (!next.includes('Otro')) setOtherValues((current) => ({ ...current, [question.id]: '' }))
  }

  const answerPayload = config.questions.reduce<Record<string, unknown>>((result, question) => {
    const value = answers[question.id]
    if (question.type === 'text') {
      result[question.id] = normalizeAnswer(value)
      return result
    }
    const values = Array.isArray(value) ? value : value ? [value] : []
    result[question.id] = values.filter((item) => item !== 'Otro')
    if (otherSelected(value)) result[question.id + '_otro'] = otherValues[question.id]?.trim() || ''
    return result
  }, {})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!requiredComplete || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/product-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          businessTypeId: businessTypeId || null,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim(),
          answers: answerPayload,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No pudimos enviar la consulta.')
      setSubmitted(true)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'No pudimos enviar la consulta.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <section className="rounded-[28px] bg-gray-950 p-6 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.7)] sm:p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ED164F]"><Check size={24} /></div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Consulta recibida</p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">Ya tenemos el contexto.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-gray-300">Te contactamos para terminar de definirlo y pasarte una propuesta.</p>
      </section>
    )
  }

  return (
    <section className="rounded-[28px] bg-gray-950 p-5 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.7)] sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Precio</p>
      <h2 className="mt-3 text-2xl font-black sm:text-3xl">A definir según alcance</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">{config.intro}</p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-6">
        {config.questions.map((question) => {
          const value = answers[question.id]
          const isOther = otherSelected(value)
          const options = (question.options || []).concat(question.allowOther ? ['Otro'] : [])

          return (
            <fieldset key={question.id}>
              <legend className="text-base font-bold text-white">
                {question.label}{question.required && <span className="ml-1 text-[#F7638B]">*</span>}
              </legend>

              {question.type === 'text' ? (
                <textarea
                  value={typeof value === 'string' ? value : ''}
                  onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                  placeholder={question.placeholder}
                  rows={3}
                  className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-[#ED164F]"
                />
              ) : (
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {options.map((option) => {
                    const selected = Array.isArray(value) ? value.includes(option) : value === option
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => question.type === 'multiple' ? toggleMultiple(question, option) : setSingle(question, option)}
                        className={'flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ' + (
                          selected
                            ? 'border-[#ED164F] bg-[#ED164F]/15 text-white ring-1 ring-[#ED164F]'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10'
                        )}
                      >
                        <span>{option}</span>
                        {selected && <Check size={17} className="shrink-0 text-[#F7638B]" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {question.type !== 'text' && isOther && (
                <div className="mt-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400" htmlFor={'other-' + question.id}>
                    Contanos un poco más
                  </label>
                  <textarea
                    id={'other-' + question.id}
                    value={otherValues[question.id] || ''}
                    onChange={(event) => setOtherValues((current) => ({ ...current, [question.id]: event.target.value }))}
                    placeholder="¿Qué tenés en mente?"
                    rows={2}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-[#ED164F]"
                  />
                </div>
              )}
            </fieldset>
          )
        })}

        <div className="border-t border-white/10 pt-6">
          <p className="text-base font-bold text-white">¿Dónde te pasamos la propuesta?</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Nombre" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-[#ED164F]" />
            <input value={phone} onChange={(event) => setPhone(event.target.value)} required placeholder="WhatsApp" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-[#ED164F]" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email (opcional)" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-[#ED164F] sm:col-span-2" />
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-500">Usamos estos datos para responderte sobre esta consulta.</p>
        </div>

        {error && <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={!requiredComplete || !name.trim() || !phone.trim() || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#ED164F] px-8 py-4 font-bold text-white shadow-lg shadow-[#ED164F]/30 transition-all hover:-translate-y-0.5 hover:bg-[#F7638B] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500 disabled:shadow-none"
        >
          {submitting ? <LoaderCircle size={19} className="animate-spin" /> : <ArrowRight size={19} />}
          {submitting ? 'Enviando…' : 'Consultar precio'}
        </button>
      </form>
    </section>
  )
}
