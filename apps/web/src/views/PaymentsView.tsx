import { useState } from 'react'
import { Badge, Card, SectionHeader } from '../components/ui'
import { useLocale, useT } from '../i18n'
import type { Tone } from '../lib/format'
import { MOCK_PAYMENTS, MOCK_PAYMENT_SUMMARY, type PaymentItem, type PaymentStatus } from '../mock/data'
import { m } from './PaymentsView.i18n'

const STATUS_TONE: Record<PaymentStatus, Tone> = { paid: 'green', due: 'amber' }
const ITEMS: readonly PaymentItem[] = ['communal', 'repair', 'security', 'cleaning']

// payments
export function PaymentsView() {
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
      <SectionHeader demo title={t('title')} sub={t('sub', { flat: s.flat })} />

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
                {p.status === 'due' && (
                  <button className="mt-4 w-full bg-[#A07C12] hover:bg-[#836208] text-white font-semibold py-2.5 rounded text-sm transition-colors">
                    {t('payOnline')}
                  </button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
