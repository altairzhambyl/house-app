import { useCallback } from 'react'
import { RequestRow } from '../components/RequestRow'
import { Card, Loaded, SectionHeader } from '../components/ui'
import { api, listAllRequests } from '../lib/api'
import { formatDate } from '../lib/format'
import { useApi } from '../lib/useApi'
import type { Resident, View } from '../types'

const LATEST_NEWS = 3
const OPEN_SHOWN = 5

// dashboard
export function DashboardView({ resident, onNav, onOpenRequest }: {
  resident: Resident
  onNav: (v: View) => void
  onOpenRequest: (id: string) => void
}) {
  const isManager = resident.role === 'manager'
  // Residents see their own requests; the manager sees the whole building's.
  const requests = useApi(useCallback(() => listAllRequests(!isManager), [isManager]))
  const news = useApi(useCallback(() => api.listAnnouncements(), []))

  const open = requests.state.status === 'ready' ? requests.state.data.filter(r => r.status !== 'done') : []
  const count = (s: 'pending' | 'in_progress') =>
    requests.state.status === 'ready' ? String(open.filter(r => r.status === s).length) : '…'

  const sub = [resident.building_name, resident.flat_number ? `Квартира ${resident.flat_number}` : 'Управляющий']
    .join(' · ')

  return (
    <div>
      <SectionHeader title="Главная" sub={sub} />

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: isManager ? 'Новые заявки' : 'Мои новые заявки', value: count('pending'), sub: 'ждут ответа', action: 'requests' as View },
          { label: 'В работе', value: count('in_progress'), sub: 'заявок', action: 'requests' as View },
          { label: 'Новости', value: news.state.status === 'ready' ? String(news.state.data.length) : '…', sub: 'от управляющего', action: 'news' as View },
          { label: 'Чат дома', value: '💬', sub: 'соседи и УК', action: 'channel' as View },
        ].map(s => (
          <button key={s.label} onClick={() => onNav(s.action)}
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
            <h2 className="font-semibold text-[#2C4A1A]">Последние новости</h2>
            <button onClick={() => onNav('news')} className="text-xs text-[#A07C12] hover:underline">Все →</button>
          </div>
          <Loaded state={news.state} onRetry={news.reload} isEmpty={d => d.length === 0} empty="Новостей пока нет">
            {items => (
              <Card>
                {items.slice(0, LATEST_NEWS).map((n, i, arr) => (
                  <div key={n.id} className={`px-4 py-3 ${i < arr.length - 1 ? 'border-b border-[#F6F5DC]' : ''}`}>
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
            <h2 className="font-semibold text-[#2C4A1A]">{isManager ? 'Открытые заявки' : 'Мои заявки'}</h2>
            <button onClick={() => onNav('requests')} className="text-xs text-[#A07C12] hover:underline">Все →</button>
          </div>
          <Loaded state={requests.state} onRetry={requests.reload}
            isEmpty={() => open.length === 0} empty="Открытых заявок нет">
            {() => (
              <Card>
                {open.slice(0, OPEN_SHOWN).map((r, i, arr) => (
                  <div key={r.id} className={i < arr.length - 1 ? 'border-b border-[#F6F5DC]' : ''}>
                    <RequestRow r={r} onOpen={onOpenRequest} compact />
                  </div>
                ))}
                {open.length > OPEN_SHOWN && (
                  <button onClick={() => onNav('requests')} className="w-full px-4 py-2 text-xs text-[#A07C12] hover:underline border-t border-[#F6F5DC]">
                    Ещё {open.length - OPEN_SHOWN} →
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
              + Новая заявка
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
