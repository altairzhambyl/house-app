import type { ReactNode } from 'react'
import { errorMessage } from '../lib/api'
import type { LoadState } from '../lib/useApi'

//color palettes
const STATUS_COLORS: Record<string, string> = {
  // request statuses (real data, Russian labels from lib/format.ts)
  'Новая': 'bg-amber-100 text-amber-800',
  'В работе': 'bg-blue-100 text-blue-800',
  'Выполнена': 'bg-emerald-100 text-emerald-800',
  // demo views
  'Pending': 'bg-amber-100 text-amber-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'Done': 'bg-emerald-100 text-emerald-800',
  'Active': 'bg-red-100 text-red-800',
  'Upcoming': 'bg-amber-100 text-amber-800',
  'Open': 'bg-blue-100 text-blue-800',
  'Closed': 'bg-gray-100 text-gray-600',
  'Under review': 'bg-amber-100 text-amber-800',
  'Resolved': 'bg-emerald-100 text-emerald-800',
  'Paid': 'bg-emerald-100 text-emerald-800',
  'Due': 'bg-red-100 text-red-800',
}

export const inputCls =
  'w-full border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A] bg-white'
export const labelCls = 'text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5'

// other small comp.
export function Badge({ label }: { label: string }) {
  const cls = STATUS_COLORS[label] ?? 'bg-gray-100 text-gray-600'
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${cls}`}>{label}</span>
}

// Marks views that still run on mock data so nobody mistakes them for real.
export function DemoBadge() {
  return (
    <span className="inline-block align-middle ml-3 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#A07C12] text-white tracking-normal">
      Демо-данные
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

export function ErrorNote({ error }: { error: unknown }) {
  return <p className="text-red-600 text-xs" role="alert">{errorMessage(error)}</p>
}

export function Loading({ label = 'Загрузка…' }: { label?: string }) {
  return <Card className="p-6 text-center text-sm text-[#697050] font-mono" >{label}</Card>
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4" role="alert">
      <div className="text-sm font-semibold text-red-800 mb-1">Не удалось загрузить данные</div>
      <p className="text-xs text-red-700 mb-3">{errorMessage(error)}</p>
      <button
        onClick={onRetry}
        className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded font-medium transition-colors"
      >
        Повторить
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
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorBox error={state.error} onRetry={onRetry} />
  if (isEmpty?.(state.data)) return <Empty>{empty ?? 'Пока пусто'}</Empty>
  return <>{children(state.data)}</>
}
