import type { ReactNode } from 'react'
import { defineMessages, useT } from '../i18n'
import { useDescribeError, type ErrorOverrides } from '../lib/api'
import type { Tone } from '../lib/format'
import type { LoadState } from '../lib/useApi'

const m = defineMessages({
  ru: {
    demo: 'Демо-данные',
    loading: 'Загрузка…',
    loadFailed: 'Не удалось загрузить данные',
    retry: 'Повторить',
    empty: 'Пока пусто',
    details: 'Подробности',
  },
  kk: {
    demo: 'Демо деректер',
    loading: 'Жүктелуде…',
    loadFailed: 'Деректерді жүктеу мүмкін болмады',
    retry: 'Қайталау',
    empty: 'Әзірге бос',
    details: 'Толығырақ',
  },
  en: {
    demo: 'Demo data',
    loading: 'Loading…',
    loadFailed: 'Couldn’t load the data',
    retry: 'Try again',
    empty: 'Nothing here yet',
    details: 'Details',
  },
})

const TONE_CLS: Record<Tone, string> = {
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-600',
}

export const inputCls =
  'w-full border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A] bg-white'
export const labelCls = 'text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5'

// other small comp.
/** Status pill. Pass a translated `label` and a `tone` (see STATUS_TONE in lib/format). */
export function Badge({ label, tone }: { label: string; tone: Tone }) {
  const cls = TONE_CLS[tone]
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${cls}`}>{label}</span>
}

// Marks views that still run on mock data so nobody mistakes them for real.
export function DemoBadge() {
  const t = useT(m)
  return (
    <span className="inline-block align-middle ml-3 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#A07C12] text-white tracking-normal">
      {t('demo')}
    </span>
  )
}

export function SectionHeader({ title, sub, demo = false }: { title: string; sub?: string; demo?: boolean }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-[#2C4A1A] tracking-tight">
        {title}
        {demo && <DemoBadge />}
      </h1>
      {sub && <p className="text-sm text-[#697050] mt-0.5">{sub}</p>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#D6D3A8] rounded-md ${className}`}>
      {children}
    </div>
  )
}

// Server/library detail is usually English: shown smaller, marked lang="en".
function ErrorDetail({ detail, className }: { detail: string | null; className: string }) {
  const t = useT(m)
  if (!detail) return null
  return <span className={`block font-mono opacity-75 break-words ${className}`}>{t('details')}: <span lang="en">{detail}</span></span>
}

/** Inline error for a failed action. Store the caught error itself, not a string. */
export function ErrorNote({ error, overrides }: { error: unknown; overrides?: ErrorOverrides }) {
  const describe = useDescribeError()
  const { message, detail } = describe(error, overrides)
  return (
    <p className="text-red-600 text-xs" role="alert">
      {message}
      <ErrorDetail detail={detail} className="text-[10px] mt-0.5" />
    </p>
  )
}

export function Loading({ label }: { label?: string }) {
  const t = useT(m)
  return <Card className="p-6 text-center text-sm text-[#697050] font-mono" >{label ?? t('loading')}</Card>
}

export function ErrorBox({ error, onRetry, title, overrides }: {
  error: unknown
  onRetry: () => void
  title?: string
  overrides?: ErrorOverrides
}) {
  const t = useT(m)
  const describe = useDescribeError()
  const { message, detail } = describe(error, overrides)
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4" role="alert">
      <div className="text-sm font-semibold text-red-800 mb-1">{title ?? t('loadFailed')}</div>
      <p className="text-xs text-red-700 mb-3">
        {message}
        <ErrorDetail detail={detail} className="text-[10px] mt-1" />
      </p>
      <button
        onClick={onRetry}
        className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded font-medium transition-colors"
      >
        {t('retry')}
      </button>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <Card className="p-6 text-center text-sm text-[#697050]">{children}</Card>
}

/** Renders loading / error / empty states and hands ready data to `children`. */
export function Loaded<T>({
  state,
  onRetry,
  isEmpty,
  empty,
  children,
}: {
  state: LoadState<T>
  onRetry: () => void
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
  children: (data: T) => ReactNode
}) {
  const t = useT(m)
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorBox error={state.error} onRetry={onRetry} />
  if (isEmpty?.(state.data)) return <Empty>{empty ?? t('empty')}</Empty>
  return <>{children(state.data)}</>
}
