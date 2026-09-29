import { useCallback, useEffect, useRef, useState } from 'react'
import { RequestRow } from '../components/RequestRow'
import { Empty, ErrorBox, ErrorNote, Loading, SectionHeader } from '../components/ui'
import { api } from '../lib/api'
import type { Resident, ServiceRequest } from '../types'

const PAGE_SIZE = 20

type Tab = 'mine' | 'all'

interface PagedState {
  items: ServiceRequest[]
  hasMore: boolean
  loading: boolean
  error: unknown
}

const INITIAL: PagedState = { items: [], hasMore: false, loading: true, error: null }

// requests list; a row opens RequestDetailView
export function RequestsView({ resident, onOpenRequest, changed }: {
  resident: Resident
  onOpenRequest: (id: string) => void
  // The latest request edited in the detail view; replaces its row in place.
  changed: ServiceRequest | null
}) {
  // Without a flat (managers) there are no "own" requests to show.
  const tabs: Tab[] = resident.flat_id === null ? ['all'] : ['mine', 'all']
  const [tab, setTab] = useState<Tab>(tabs[0])
  const [state, setState] = useState<PagedState>(INITIAL)
  const generation = useRef(0)

  const loadPage = useCallback((which: Tab, offset: number) => {
    const current = ++generation.current
    setState(s => ({ ...(offset === 0 ? INITIAL : s), loading: true, error: null }))
    api.listRequests({ mine: which === 'mine', limit: PAGE_SIZE, offset }).then(
      page => {
        if (current !== generation.current) return
        setState(s => ({
          items: offset === 0 ? page : [...s.items, ...page],
          hasMore: page.length === PAGE_SIZE,
          loading: false,
          error: null,
        }))
      },
      (error: unknown) => {
        if (current !== generation.current) return
        setState(s => ({ ...s, loading: false, error }))
      },
    )
  }, [])

  useEffect(() => {
    loadPage(tab, 0)
    return () => { generation.current++ }
  }, [tab, loadPage])

  useEffect(() => {
    if (changed === null) return
    setState(s => ({
      ...s,
      items: s.items.map(r => r.id === changed.id ? { ...changed, photo_url: changed.photo_url ?? r.photo_url } : r),
    }))
  }, [changed])

  const firstLoad = state.items.length === 0

  return (
    <div>
      <SectionHeader title="Заявки" sub="История и статус обращений" />
      {tabs.length > 1 && (
        <div className="flex gap-1 mb-5 bg-white border border-[#D6D3A8] rounded-md p-1 w-fit">
          {tabs.map(t => (
            <button key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${tab === t ? 'bg-[#2C4A1A] text-white' : 'text-[#697050] hover:text-[#1E2A0E]'}`}
            >{t === 'mine' ? 'Мои заявки' : 'Все заявки дома'}</button>
          ))}
        </div>
      )}

      {firstLoad && state.loading && <Loading />}
      {firstLoad && state.error !== null && <ErrorBox error={state.error} onRetry={() => loadPage(tab, 0)} />}
      {firstLoad && !state.loading && state.error === null && (
        <Empty>{tab === 'mine' ? 'Вы ещё не подавали заявок' : 'В доме пока нет заявок'}</Empty>
      )}

      {!firstLoad && (
        <div className="space-y-3">
          {state.items.map(r => <RequestRow key={r.id} r={r} onOpen={onOpenRequest} />)}
          {state.error !== null && <ErrorNote error={state.error} />}
          {(state.hasMore || state.error !== null) && (
            <button
              onClick={() => loadPage(tab, state.items.length)}
              disabled={state.loading}
              className="w-full border border-[#D6D3A8] bg-white hover:border-[#2C4A1A] disabled:opacity-60 rounded-md py-2 text-sm text-[#2C4A1A] font-medium transition-colors"
            >
              {state.loading ? 'Загрузка…' : state.error !== null ? 'Повторить' : 'Загрузить ещё'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
