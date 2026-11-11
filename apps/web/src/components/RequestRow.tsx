import { defineMessages, useLocale, useT } from '../i18n'
import { STATUS_TONE, requestCode } from '../lib/format'
import type { ServiceRequest } from '../types'
import { Badge } from './ui'

const m = defineMessages({
  ru: { flat: 'Кв. {flat}', hasPhoto: 'Есть фото' },
  kk: { flat: '{flat}-пәтер', hasPhoto: 'Фото бар' },
  en: { flat: 'Flat {flat}', hasPhoto: 'Photo attached' },
})

// One request in a list; the whole row opens the detail view.
export function RequestRow({ r, onOpen, compact = false }: {
  r: ServiceRequest
  onOpen: (id: string) => void
  compact?: boolean
}) {
  const t = useT(m)
  const { formatDate, statusLabel, categoryLabel } = useLocale()
  const badge = <Badge label={statusLabel(r.status)} tone={STATUS_TONE[r.status]} />

  if (compact) {
    return (
      <button onClick={() => onOpen(r.id)} className="w-full text-left px-4 py-3 hover:bg-[#F8F7F4] transition-colors">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[11px] text-[#697050]">{requestCode(r.number)}</span>
          {badge}
        </div>
        <div className="text-sm text-[#1E2A0E] leading-snug line-clamp-2">{r.description}</div>
        <div className="text-[11px] text-[#697050] font-mono mt-1">{formatDate(r.created_at)} · {categoryLabel(r.category)}</div>
      </button>
    )
  }
  return (
    <button onClick={() => onOpen(r.id)}
      className="w-full text-left bg-white border border-[#D6D3A8] rounded-md p-4 hover:border-[#2C4A1A] transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[11px] text-[#697050]">{requestCode(r.number)}</span>
        {badge}
        <span className="text-[11px] text-[#697050] font-mono">{categoryLabel(r.category)}</span>
        {r.has_photo && <span className="text-[11px] text-[#697050]" role="img" aria-label={t('hasPhoto')} title={t('hasPhoto')}>📷</span>}
      </div>
      <p className="text-sm font-medium text-[#1E2A0E] break-words">{r.description}</p>
      <div className="flex flex-wrap items-center gap-3 mt-1.5">
        <span className="text-[11px] text-[#697050] font-mono">{formatDate(r.created_at)}</span>
        <span className="text-[11px] text-[#697050]">{t('flat', { flat: r.flat_number })}</span>
        <span className="text-[11px] text-[#697050]">{r.author_name}</span>
        {r.location && <span className="text-[11px] text-[#697050]">📍 {r.location}</span>}
      </div>
    </button>
  )
}
