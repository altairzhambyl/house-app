import { useState, type FormEvent } from 'react'
import { Badge, Card, SectionHeader } from '../components/ui'
import { useLocale, useLocalize, useT } from '../i18n'
import type { Tone } from '../lib/format'
import { MOCK_KASPI, MOCK_PAYMENTS, MOCK_PAYMENT_SUMMARY, type MockPayment, type PaymentItem, type PaymentStatus } from '../mock/data'
import type { Resident } from '../types'
import { m } from './PaymentsView.i18n'

const STATUS_TONE: Record<PaymentStatus, Tone> = { paid: 'green', due: 'amber' }
const ITEMS: readonly PaymentItem[] = ['communal', 'repair', 'security', 'cleaning']

// payments
export function PaymentsView({ resident }: { resident: Resident }) {
  const t = useT(m)
  const { formatDate, formatMonth, formatMoney, locale } = useLocale()
  const [expanded, setExpanded] = useState<number | null>(4)
  const s = MOCK_PAYMENT_SUMMARY
  // 'сентябрь 2026 г.' → 'Сентябрь 2026 г.' when the month heads a row
  const month = (iso: string) => {
    const text = formatMonth(iso)
    return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1)
  }

  const summary = [
    { key: 'due', label: t('toPay'), value: formatMoney(s.dueAmount), sub: month(s.dueMonth), urgent: true },
    { key: 'paid', label: t('paidInYear', { year: s.dueMonth.slice(0, 4) }), value: formatMoney(s.paidThisYear), sub: t('months', { n: s.paidMonths }), urgent: false },
    { key: 'debt', label: t('debt'), value: formatMoney(s.debt), sub: s.debt > 0 ? t('hasOverdue') : t('noOverdue'), urgent: false },
  ]

  return (
    <div>
      <SectionHeader demo title={t('title')}
        sub={resident.flat_number === null ? t('subNoFlat') : t('sub', { flat: resident.flat_number })} />

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {summary.map(c => (
          <Card key={c.key} className={`p-4 ${c.urgent ? 'border-[#A07C12]' : ''}`}>
            <div className={`text-xl font-bold ${c.urgent ? 'text-[#A07C12]' : 'text-[#2C4A1A]'}`}>{c.value}</div>
            <div className="text-xs text-[#697050] mt-0.5">{c.label}</div>
            <div className="text-[10px] font-mono text-[#697050] mt-0.5">{c.sub}</div>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        {MOCK_PAYMENTS.map(p => (
          <Card key={p.id}>
            <button
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#F8F7F4] transition-colors"
              aria-expanded={expanded === p.id}
              onClick={() => setExpanded(expanded === p.id ? null : p.id)}
            >
              <Badge label={t(`status_${p.status}`)} tone={STATUS_TONE[p.status]} />
              <span className="flex-1 text-sm font-medium text-[#1E2A0E]">{month(p.month)}</span>
              <span className="font-mono text-sm font-semibold text-[#2C4A1A]">{formatMoney(p.amount)}</span>
              <time dateTime={p.date} className="text-[#697050] text-xs font-mono">{formatDate(p.date)}</time>
              <span className="text-[#697050] text-xs ml-1" aria-hidden="true">{expanded === p.id ? '▲' : '▼'}</span>
            </button>
            {expanded === p.id && (
              <div className="px-4 pb-4 border-t border-[#F6F5DC]">
                <div className="pt-3 space-y-1.5">
                  {ITEMS.map(k => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-[#697050]">{t(`item_${k}`)}</span>
                      <span className="font-mono font-medium text-[#1E2A0E]">{formatMoney(p.breakdown[k])}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-[#F6F5DC]">
                    <span>{t('total')}</span>
                    <span className="font-mono">{formatMoney(p.amount)}</span>
                  </div>
                </div>
                {p.status === 'due' && <KaspiReceipt payment={p} />}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

// No in-app payment: the resident transfers by Kaspi to the manager's phone and
// attaches the receipt (ITP-42). Nothing is uploaded yet, and the message says so.
const RECEIPT_TYPES = 'image/*,.heic,.heif,application/pdf'

// Some browsers report phone photos (HEIC) with an empty MIME type, so fall
// back to the extension when the type is missing.
const RECEIPT_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|pdf)$/i

function isReceiptType(file: File): boolean {
  if (file.type === '') return RECEIPT_EXTENSIONS.test(file.name)
  return file.type.startsWith('image/') || file.type === 'application/pdf'
}

type ReceiptError = 'file' | 'fileType' | 'amount'

function KaspiReceipt({ payment }: { payment: MockPayment }) {
  const t = useT(m)
  const L = useLocalize()
  const [file, setFile] = useState<File | null>(null)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<ReceiptError | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const id = `receipt-${payment.id}`

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = Number(amount.replace(/\s/g, '').replace(',', '.'))
    let problem: ReceiptError | null = null
    if (file === null) problem = 'file'
    else if (!isReceiptType(file)) problem = 'fileType'
    else if (amount.trim() === '' || !Number.isFinite(value) || value <= 0) problem = 'amount'
    setError(problem)
    if (problem === null) setSubmitted(true)
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="bg-[#F8F7F4] border border-[#D6D3A8] rounded p-3 text-sm">
        <div className="font-semibold text-[#2C4A1A] mb-1">{t('kaspiTitle')}</div>
        <div className="flex justify-between gap-3">
          <span className="text-[#697050]">{t('kaspiPhone')}</span>
          <span className="font-mono font-medium text-[#1E2A0E]">{MOCK_KASPI.phone}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#697050]">{t('kaspiRecipient')}</span>
          <span className="font-medium text-[#1E2A0E] text-right">{L(MOCK_KASPI.recipient)}</span>
        </div>
        <p className="text-[11px] text-[#697050] mt-2">{t('kaspiHint')}</p>
      </div>

      {submitted ? (
        <div role="status" className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900">
          {t('receiptDemo')}
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-3">
          <div>
            <label htmlFor={`${id}-file`} className="text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5">{t('receiptFile')}</label>
            <input id={`${id}-file`} type="file" accept={RECEIPT_TYPES} className="w-full text-sm"
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label htmlFor={`${id}-amount`} className="text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5">{t('receiptAmount')}</label>
            <input id={`${id}-amount`} inputMode="decimal"
              className="w-full border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A]"
              placeholder={String(payment.amount)} value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          {error !== null && <p role="alert" className="text-xs text-red-700">{t(`error_${error}`)}</p>}
          <button type="submit"
            className="w-full bg-[#A07C12] hover:bg-[#836208] text-white font-semibold py-2.5 rounded text-sm transition-colors">
            {t('receiptSubmit')}
          </button>
        </form>
      )}
    </div>
  )
}
