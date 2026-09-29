import { CATEGORY_LABELS, STATUS_LABELS, formatDate, requestCode } from '../lib/format'
import type { ServiceRequest } from '../types'
import { Badge } from './ui'

// One request in a list; the whole row opens the detail view.
export function RequestRow({ r, onOpen, compact = false }: {
  r: ServiceRequest
  onOpen: (id: string) => void
  compact?: boolean
}) {
  if (compact) {
    return (
      <button onClick={() => onOpen(r.id)} className="w-full text-left px-4 py-3 hover:bg-[#F8F7F4] transition-colors">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[11px] text-[#697050]">{requestCode(r.number)}</span>
          <Badge label={STATUS_LABELS[r.status]} />
        </div>
        <div className="text-sm text-[#1E2A0E] leading-snug line-clamp-2">{r.description}</div>
        <div className="text-[11px] text-[#697050] font-mono mt-1">{formatDate(r.created_at)} · {CATEGORY_LABELS[r.category]}</div>
      </button>
    )
  }
  return (
    <button onClick={() => onOpen(r.id)}
      className="w-full text-left bg-white border border-[#D6D3A8] rounded-md p-4 hover:border-[#2C4A1A] transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[11px] text-[#697050]">{requestCode(r.number)}</span>
        <Badge label={STATUS_LABELS[r.status]} />
        <span className="text-[11px] text-[#697050] font-mono">{CATEGORY_LABELS[r.category]}</span>
        {r.has_photo && <span className="text-[11px] text-[#697050]" title="Есть фото">📷</span>}
      </div>
      <p className="text-sm font-medium text-[#1E2A0E] break-words">{r.description}</p>
      <div className="flex flex-wrap items-center gap-3 mt-1.5">
        <span className="text-[11px] text-[#697050] font-mono">{formatDate(r.created_at)}</span>
        <span className="text-[11px] text-[#697050]">Кв. {r.flat_number}</span>
        <span className="text-[11px] text-[#697050]">{r.author_name}</span>
        {r.location && <span className="text-[11px] text-[#697050]">📍 {r.location}</span>}
      </div>
    </button>
  )
}
