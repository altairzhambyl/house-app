import { useCallback, useState } from 'react'
import { Badge, Card, ErrorNote, Loaded, SectionHeader } from '../components/ui'
import { api } from '../lib/api'
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_ORDER, formatDateTime, requestCode } from '../lib/format'
import { useApi } from '../lib/useApi'
import type { RequestStatus, Resident, ServiceRequest } from '../types'

export function RequestDetailView({ id, resident, onBack, onChanged }: {
  id: string
  resident: Resident
  onBack: () => void
  // Lets the (still mounted) list show the new status without a reload.
  onChanged: (r: ServiceRequest) => void
}) {
  const { state, reload, setData } = useApi(useCallback(() => api.getRequest(id), [id]))

  return (
    <div>
      <button onClick={onBack} className="text-xs text-[#A07C12] hover:underline mb-3">← К списку заявок</button>
      <Loaded state={state} onRetry={reload}>
        {r => (
          <RequestDetail
            r={r}
            canChangeStatus={resident.role === 'manager'}
            onUpdated={next => {
              setData(prev => ({
                ...next,
                // PATCH may omit the signed URL; keep the one we already have.
                photo_url: next.photo_url ?? prev.photo_url,
              }))
              onChanged(next)
            }}
          />
        )}
      </Loaded>
    </div>
  )
}

function RequestDetail({ r, canChangeStatus, onUpdated }: {
  r: ServiceRequest
  canChangeStatus: boolean
  onUpdated: (r: ServiceRequest) => void
}) {
  const history = r.history ?? []
  const reached = STATUS_ORDER.indexOf(r.status)

  return (
    <div>
      <SectionHeader title={`Заявка ${requestCode(r.number)}`} sub={`${CATEGORY_LABELS[r.category]} · Кв. ${r.flat_number} · ${r.author_name}`} />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Badge label={STATUS_LABELS[r.status]} />
              <span className="text-[11px] text-[#697050] font-mono">создана {formatDateTime(r.created_at)}</span>
            </div>
            <p className="text-sm text-[#1E2A0E] whitespace-pre-line break-words">{r.description}</p>
            {r.location && <p className="text-xs text-[#697050] mt-2">📍 {r.location}</p>}

            {/* Status timeline */}
            <div className="mt-4 pt-4 border-t border-[#F6F5DC] flex items-center gap-0 flex-wrap">
              {STATUS_ORDER.map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= reached ? 'bg-[#2C4A1A] text-white' : 'bg-[#E2DFB8] text-[#697050]'}`}>{i + 1}</div>
                  <div className="text-[10px] font-mono ml-1 mr-3 text-[#697050]">{STATUS_LABELS[s]}</div>
                  {i < STATUS_ORDER.length - 1 && <div className={`h-px w-8 mr-3 ${i < reached ? 'bg-[#2C4A1A]' : 'bg-[#E2DFB8]'}`} />}
                </div>
              ))}
            </div>
          </Card>

          {r.has_photo && (
            <Card className="p-3">
              {r.photo_url
                ? <a href={r.photo_url} target="_blank" rel="noreferrer">
                    <img src={r.photo_url} alt={`Фото к заявке ${requestCode(r.number)}`} className="w-full max-h-[480px] object-contain rounded" />
                  </a>
                : <p className="text-xs text-[#697050] p-2">Фото прикреплено, но сейчас недоступно.</p>}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {canChangeStatus && <StatusChanger r={r} onUpdated={onUpdated} />}
          <Card className="p-4">
            <h2 className="font-semibold text-[#2C4A1A] text-sm mb-3">История</h2>
            {history.length === 0
              ? <p className="text-xs text-[#697050]">История недоступна</p>
              : (
                <ol className="space-y-3">
                  {history.map((h, i) => (
                    <li key={`${h.at}-${i}`} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#2C4A1A] mt-1.5 shrink-0" />
                      <div>
                        <div className="text-sm text-[#1E2A0E]">
                          {i === 0 ? 'Заявка создана' : `Статус: ${STATUS_LABELS[h.status]}`}
                        </div>
                        <div className="text-[11px] text-[#697050] font-mono">{formatDateTime(h.at)} · {h.actor_name}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatusChanger({ r, onUpdated }: { r: ServiceRequest; onUpdated: (r: ServiceRequest) => void }) {
  const [busy, setBusy] = useState<RequestStatus | null>(null)
  const [error, setError] = useState<unknown>(null)

  async function change(status: RequestStatus) {
    setBusy(status)
    setError(null)
    try {
      onUpdated(await api.setRequestStatus(r.id, status))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="p-4">
      <h2 className="font-semibold text-[#2C4A1A] text-sm mb-3">Изменить статус</h2>
      <div className="flex flex-col gap-2">
        {STATUS_ORDER.map(s => (
          <button key={s}
            onClick={() => change(s)}
            disabled={busy !== null || s === r.status}
            className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors disabled:cursor-default ${
              s === r.status
                ? 'bg-[#2C4A1A] text-white border-[#2C4A1A]'
                : 'bg-white text-[#2C4A1A] border-[#D6D3A8] hover:border-[#2C4A1A] disabled:opacity-60'
            }`}
          >{busy === s ? 'Сохранение…' : STATUS_LABELS[s]}</button>
        ))}
      </div>
      {error !== null && <div className="mt-2"><ErrorNote error={error} /></div>}
    </Card>
  )
}
