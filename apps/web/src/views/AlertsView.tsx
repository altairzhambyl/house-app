import { SectionHeader } from '../components/ui'
import { useLocale, useLocalize, useT } from '../i18n'
import { MOCK_ALERTS, type AlertLevel } from '../mock/data'
import { m } from './AlertsView.i18n'

const COLOR: Record<AlertLevel, string> = { warning: 'border-amber-300 bg-amber-50', danger: 'border-red-300 bg-red-50', info: 'border-blue-200 bg-blue-50' }
const ICON: Record<AlertLevel, string> = { warning: '⚠️', danger: '🚨', info: 'ℹ️' }

// ALERTS
export function AlertsView() {
  const t = useT(m)
  const L = useLocalize()
  const { formatDateTime } = useLocale()

  return (
    <div>
      <SectionHeader demo title={t('title')} sub={t('sub')} />
      <div className="space-y-3">
        {MOCK_ALERTS.map(a => (
          <div key={a.id} className={`border rounded-md p-4 ${COLOR[a.level]}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl" role="img" aria-label={t(`level_${a.level}`)}>{ICON[a.level]}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-[#1E2A0E]">{L(a.title)}</span>
                  <time dateTime={a.time} className="text-[10px] font-mono text-[#697050]">{formatDateTime(a.time)}</time>
                </div>
                <p className="text-sm text-[#697050] leading-relaxed">{L(a.body)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
