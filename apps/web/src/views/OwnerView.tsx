import { Badge, Card, SectionHeader } from '../components/ui'
import { useLocale, useLocalize, useT } from '../i18n'
import { MOCK_RENTED_FLATS } from '../mock/data'
import { m } from './OwnerView.i18n'

// owner profile
export function OwnerView() {
  const t = useT(m)
  const L = useLocalize()
  const { formatMonth, formatNumber } = useLocale()
  return (
    <div>
      <SectionHeader demo title={t('title')} sub={t('sub')} />
      <div className="space-y-4">
        {MOCK_RENTED_FLATS.map(f => (
          <Card key={f.flat} className={`p-5 ${!f.paid ? 'border-red-200' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-lg font-bold text-[#2C4A1A]">{t('flat', { flat: f.flat })}</div>
                <div className="text-sm text-[#697050]">{t('tenant', { name: L(f.tenant) })}</div>
                <div className="text-xs font-mono text-[#697050] mt-0.5">{t('since', { month: formatMonth(f.since) })}</div>
              </div>
              <Badge label={f.paid ? t('paid') : t('due')} tone={f.paid ? 'green' : 'red'} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-[#F6F5DC]">
              <div>
                <div className="text-xs text-[#697050] mb-0.5">{t('nextPayment')}</div>
                <div className="text-sm font-semibold text-[#1E2A0E] font-mono">{formatMonth(f.nextDue)}</div>
              </div>
              <div>
                <div className="text-xs text-[#697050] mb-0.5">{t('activeRequests')}</div>
                <div className={`text-sm font-semibold font-mono ${f.requests > 0 ? 'text-[#A07C12]' : 'text-[#1E2A0E]'}`}>{formatNumber(f.requests)}</div>
              </div>
              <div>
                <div className="text-xs text-[#697050] mb-0.5">{t('status')}</div>
                <div className="text-sm font-semibold text-emerald-700 break-words">{f.paid ? t('noDebt') : t('overdue')}</div>
              </div>
            </div>
            {!f.paid && (
              <div className="mt-3 pt-3 border-t border-red-100">
                <p className="text-xs text-red-700 mb-2">{t('paymentMissing', { month: formatMonth(f.nextDue) })}</p>
                <button className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded font-medium transition-colors">
                  {t('sendReminder')}
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
