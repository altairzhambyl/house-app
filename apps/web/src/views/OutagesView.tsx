import { Badge, Card, SectionHeader } from '../components/ui'
import { useLocale, useLocalize, useT } from '../i18n'
import type { Tone } from '../lib/format'
import { MOCK_OUTAGES, type OutageKind, type OutageStatus } from '../mock/data'
import { m } from './OutagesView.i18n'

const KIND_ICON: Record<OutageKind, string> = { water: '💧', electricity: '⚡', heating: '🔥', elevator: '🛗' }
const STATUS_TONE: Record<OutageStatus, Tone> = { active: 'red', upcoming: 'amber', done: 'gray' }

// outages
export function OutagesView() {
  const t = useT(m)
  const L = useLocalize()
  const { formatDateTime } = useLocale()

  return (
    <div>
      <SectionHeader demo title={t('title')} sub={t('sub')} />
      <div className="space-y-3">
        {MOCK_OUTAGES.map(o => (
          <Card key={o.id} className={`p-4 ${o.status === 'active' ? 'border-red-200 bg-red-50' : ''}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">{KIND_ICON[o.kind]}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-[#1E2A0E]">{t(`kind_${o.kind}`)}</span>
                  <Badge label={t(`status_${o.status}`)} tone={STATUS_TONE[o.status]} />
                </div>
                <p className="text-xs text-[#697050] mb-1">{L(o.reason)}</p>
                <div className="flex flex-wrap gap-4 text-[11px] font-mono text-[#697050]">
                  <span>{t('from', { date: formatDateTime(o.start) })}</span>
                  <span>{t('to', { date: formatDateTime(o.end) })}</span>
                  <span>{t('zone', { zone: L(o.zone) })}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
