import { useCallback } from 'react'
import { RequestRow } from '../components/RequestRow'
import { Card, Loaded, SectionHeader } from '../components/ui'
import { PAGE_LIMIT, api, listAllRequests } from '../lib/api'
import { useApi } from '../lib/useApi'
import type { Resident, View } from '../types'
import { useLocale, useT } from '../i18n'
import { m } from './DashboardView.i18n'
import { NewsAuthorBadge } from './NewsView'

const LATEST_NEWS = 3
const OPEN_SHOWN = 5

// dashboard
export function DashboardView({ resident, onNav, onOpenRequest }: {
  resident: Resident
  onNav: (v: View) => void
  onOpenRequest: (id: string) => void
}) {
  const t = useT(m)
  const { formatDate, formatNumber } = useLocale()
  const isManager = resident.role === 'manager'
  // Residents see their own requests; the manager sees the whole building's.
  const requests = useApi(useCallback(() => listAllRequests(!isManager), [isManager]))
  // Published only: posts awaiting review are not building news yet (ITP-51).
  // One page: the card shows 3 and the counter caps at "100+".
  const news = useApi(useCallback(() => api.listAnnouncements({ status: 'published', limit: PAGE_LIMIT }), []))

  const open = requests.state.status === 'ready' ? requests.state.data.filter(r => r.status !== 'done') : []
  const countOf = (s: 'pending' | 'in_progress') =>
    requests.state.status === 'ready' ? open.filter(r => r.status === s).length : null
  const shown = (n: number | null) => n === null ? '…' : formatNumber(n)
  const newsCount = news.state.status === 'ready'
    ? news.state.data.length >= PAGE_LIMIT ? `${formatNumber(PAGE_LIMIT)}+` : formatNumber(news.state.data.length)
    : '…'
  const inProgress = countOf('in_progress')

  const sub = [resident.building_name, resident.flat_number ? t('flat', { flat: resident.flat_number }) : t('manager')]
    .join(' · ')

  return (
    <div>
      <SectionHeader title={t('title')} sub={sub} />

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { id: 'pending', label: isManager ? t('newRequests') : t('myNewRequests'), value: shown(countOf('pending')), sub: t('awaitingReply'), action: 'requests' as View },
          { id: 'in_progress', label: t('inProgress'), value: shown(inProgress), sub: t('requestsUnit', inProgress === null ? undefined : { n: inProgress }), action: 'requests' as View },
          { id: 'news', label: t('news'), value: newsCount, sub: t('fromManager'), action: 'news' as View },
          { id: 'channel', label: t('chat'), value: '💬', sub: t('chatSub'), action: 'channel' as View },
        ].map(s => (
          <button key={s.id} onClick={() => onNav(s.action)}
            className="bg-white border border-[#D6D3A8] rounded-md p-4 text-left hover:border-[#2C4A1A] transition-colors group">
            <div className="text-xl font-bold text-[#2C4A1A] group-hover:text-[#A07C12] transition-colors">{s.value}</div>
            <div className="text-xs text-[#697050] mt-0.5">{s.label}</div>
            <div className="text-[10px] text-[#697050] font-mono mt-1">{s.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent news; min-w-0 lets long words wrap instead of widening the grid track */}
        <div className="lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#2C4A1A]">{t('latestNews')}</h2>
            <button onClick={() => onNav('news')} className="text-xs text-[#A07C12] hover:underline">{t('seeAll')}</button>
          </div>
          <Loaded state={news.state} onRetry={news.reload} isEmpty={d => d.length === 0} empty={t('noNews')}>
            {items => (
              <Card>
                {items.slice(0, LATEST_NEWS).map((n, i, arr) => (
                  <div key={n.id} className={`px-4 py-3 ${i < arr.length - 1 ? 'border-b border-[#F6F5DC]' : ''}`}>
                    <div className="mb-1"><NewsAuthorBadge n={n} /></div>
                    <div className="font-medium text-sm text-[#1E2A0E] leading-snug break-words">{n.title}</div>
                    <div className="text-xs text-[#697050] mt-0.5 line-clamp-2 break-words">{n.body}</div>
                    <div className="text-[11px] text-[#697050] font-mono mt-1">{formatDate(n.created_at)}</div>
                  </div>
                ))}
              </Card>
            )}
          </Loaded>
        </div>

        {/* Open requests */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#2C4A1A]">{isManager ? t('openRequests') : t('myRequests')}</h2>
            <button onClick={() => onNav('requests')} className="text-xs text-[#A07C12] hover:underline">{t('seeAll')}</button>
          </div>
          <Loaded state={requests.state} onRetry={requests.reload}
            isEmpty={() => open.length === 0} empty={t('noOpenRequests')}>
            {() => (
              <Card>
                {open.slice(0, OPEN_SHOWN).map((r, i, arr) => (
                  <div key={r.id} className={i < arr.length - 1 ? 'border-b border-[#F6F5DC]' : ''}>
                    <RequestRow r={r} onOpen={onOpenRequest} compact />
                  </div>
                ))}
                {open.length > OPEN_SHOWN && (
                  <button onClick={() => onNav('requests')} className="w-full px-4 py-2 text-xs text-[#A07C12] hover:underline border-t border-[#F6F5DC]">
                    {t('showMore', { n: open.length - OPEN_SHOWN })}
                  </button>
                )}
              </Card>
            )}
          </Loaded>

          {resident.flat_id !== null && (
            <button
              onClick={() => onNav('report')}
              className="w-full mt-3 bg-[#A07C12] hover:bg-[#836208] text-white font-semibold rounded-md py-2 text-sm transition-colors"
            >
              {t('newRequest')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
