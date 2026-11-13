import { useCallback, useState } from 'react'
import { Badge, Card, ErrorNote, Loaded, SectionHeader } from '../components/ui'
import { ApiError, api } from '../lib/api'
import { STATUS_ORDER, STATUS_TONE, canWithdraw, requestCode, statusSteps, type ManagerStatus } from '../lib/format'
import { useApi } from '../lib/useApi'
import type { Resident, ServiceRequest } from '../types'
import { useLocale, useT } from '../i18n'
import { m } from './RequestDetailView.i18n'

export function RequestDetailView({ id, resident, onBack, onChanged }: {
  id: string
  resident: Resident
  onBack: () => void
  // Lets the (still mounted) list show the new status without a reload.
  onChanged: (r: ServiceRequest) => void
}) {
  const t = useT(m)
  const { state, reload, setData } = useApi(useCallback(() => api.getRequest(id), [id]))

  return (
    <div>
      <button onClick={onBack} className="text-xs text-[#A07C12] hover:underline mb-3">{t('back')}</button>
      <Loaded state={state} onRetry={reload}>
        {r => (
          <RequestDetail
            r={r}
            canChangeStatus={resident.role === 'manager'}
            withdrawable={canWithdraw(r, resident.id)}
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

function RequestDetail({ r, canChangeStatus, withdrawable, onUpdated }: {
  r: ServiceRequest
  canChangeStatus: boolean
  withdrawable: boolean
  onUpdated: (r: ServiceRequest) => void
}) {
  const t = useT(m)
  const { formatDateTime, statusLabel, categoryLabel } = useLocale()
  // Set after a withdraw attempt hit 409. The panel unmounts once the reloaded
  // request is no longer pending, so the message has to live here.
  const [withdrawNotice, setWithdrawNotice] = useState<'withdrawAlready' | 'withdrawTooLate' | null>(null)
  const history = r.history ?? []
  const code = requestCode(r.number)
  const steps = statusSteps(r.status)
  const reached = steps.indexOf(r.status)

  return (
    <div>
      <SectionHeader title={t('title', { code })} sub={`${categoryLabel(r.category)} · ${t('flat', { flat: r.flat_number })} · ${r.author_name}`} />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Badge label={statusLabel(r.status)} tone={STATUS_TONE[r.status]} />
              <span className="text-[11px] text-[#697050] font-mono">{t('created', { date: formatDateTime(r.created_at) })}</span>
            </div>
            <p className="text-sm text-[#1E2A0E] whitespace-pre-line break-words">{r.description}</p>
            {r.location && <p className="text-xs text-[#697050] mt-2"><span aria-label={t('locationLabel')}>📍</span> {r.location}</p>}

            {/* Status timeline */}
            <div className="mt-4 pt-4 border-t border-[#F6F5DC] flex items-center gap-0 flex-wrap">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= reached ? 'bg-[#2C4A1A] text-white' : 'bg-[#E2DFB8] text-[#697050]'}`}>{i + 1}</div>
                  <div className="text-[10px] font-mono ml-1 mr-3 text-[#697050]">{statusLabel(s)}</div>
                  {i < steps.length - 1 && <div className={`h-px w-8 mr-3 ${i < reached ? 'bg-[#2C4A1A]' : 'bg-[#E2DFB8]'}`} />}
                </div>
              ))}
            </div>
          </Card>

          {r.has_photo && (
            <Card className="p-3">
              {r.photo_url
                ? <a href={r.photo_url} target="_blank" rel="noreferrer">
                    <img src={r.photo_url} alt={t('photoAlt', { code })} className="w-full max-h-[480px] object-contain rounded" />
                  </a>
                : <p className="text-xs text-[#697050] p-2">{t('photoUnavailable')}</p>}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {canChangeStatus && <StatusChanger r={r} onUpdated={onUpdated} />}
          {withdrawable && (
            <WithdrawPanel r={r} onUpdated={onUpdated}
              onConflict={fresh => setWithdrawNotice(fresh.status === 'withdrawn' ? 'withdrawAlready' : 'withdrawTooLate')} />
          )}
          {withdrawNotice !== null && !withdrawable && (
            <Card className="p-4"><p className="text-xs text-[#697050]" role="status">{t(withdrawNotice)}</p></Card>
          )}
          <Card className="p-4">
            <h2 className="font-semibold text-[#2C4A1A] text-sm mb-3">{t('history')}</h2>
            {history.length === 0
              ? <p className="text-xs text-[#697050]">{t('historyUnavailable')}</p>
              : (
                <ol className="space-y-3">
                  {history.map((h, i) => (
                    <li key={`${h.at}-${i}`} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#2C4A1A] mt-1.5 shrink-0" />
                      <div>
                        <div className="text-sm text-[#1E2A0E]">
                          {i === 0 ? t('historyCreated') : t('historyStatus', { status: statusLabel(h.status) })}
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
  const t = useT(m)
  const { statusLabel } = useLocale()
  const [busy, setBusy] = useState<ManagerStatus | null>(null)
  const [error, setError] = useState<unknown>(null)

  async function change(status: ManagerStatus) {
    setBusy(status)
    setError(null)
    try {
      onUpdated(await api.setRequestStatus(r.id, status))
    } catch (err) {
      // 409: the resident withdrew it meanwhile. Reload so the badge, stepper
      // and this card (which then shows withdrawnFinal, no buttons) match the server.
      const fresh = isConflict(err) ? await refetch(r.id) : null
      if (fresh) onUpdated(fresh)
      else setError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="p-4">
      <h2 className="font-semibold text-[#2C4A1A] text-sm mb-3">{t('changeStatus')}</h2>
      {r.status === 'withdrawn'
        ? <p className="text-xs text-[#697050]">{t('withdrawnFinal')}</p>
        : <div className="flex flex-col gap-2">
        {STATUS_ORDER.map(s => (
          <button key={s}
            onClick={() => change(s)}
            disabled={busy !== null || s === r.status}
            className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors disabled:cursor-default ${
              s === r.status
                ? 'bg-[#2C4A1A] text-white border-[#2C4A1A]'
                : 'bg-white text-[#2C4A1A] border-[#D6D3A8] hover:border-[#2C4A1A] disabled:opacity-60'
            }`}
          >{busy === s ? t('saving') : statusLabel(s)}</button>
        ))}
      </div>}
      {error !== null && <div className="mt-2"><ErrorNote error={error} overrides={{ 404: t('requestGone'), 403: t('managerOnly'), 409: t('withdrawnFinal') }} /></div>}
    </Card>
  )
}

function isConflict(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409
}

// Best-effort reload after a 409; null means the caller shows the original error.
async function refetch(id: string): Promise<ServiceRequest | null> {
  try {
    return await api.getRequest(id)
  } catch {
    return null
  }
}

// The author takes back a request that is still new (ITP-53). Two steps, both
// inline: a window.confirm dialog would block the page and cannot be styled.
function WithdrawPanel({ r, onUpdated, onConflict }: {
  r: ServiceRequest
  onUpdated: (r: ServiceRequest) => void
  onConflict: (fresh: ServiceRequest) => void
}) {
  const t = useT(m)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function withdraw() {
    setBusy(true)
    setError(null)
    try {
      onUpdated(await api.withdrawRequest(r.id))
    } catch (err) {
      // 409: no longer pending (taken into work, done, or withdrawn in another
      // tab). Reload so the view matches the server; the panel then unmounts
      // and RequestDetail shows a message chosen from the fresh status.
      const fresh = isConflict(err) ? await refetch(r.id) : null
      if (fresh && fresh.status !== 'pending') {
        onConflict(fresh)
        onUpdated(fresh)
        return
      }
      setError(err)
      setConfirming(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-4">
      {confirming
        ? (
          <div role="group" aria-label={t('withdrawConfirmTitle')}>
            <p className="text-sm text-[#1E2A0E] mb-1 font-medium">{t('withdrawConfirmTitle')}</p>
            <p className="text-xs text-[#697050] mb-3">{t('withdrawConfirmBody')}</p>
            <div className="flex gap-2">
              <button onClick={withdraw} disabled={busy}
                className="px-3 py-1.5 rounded text-sm font-medium border bg-red-700 text-white border-red-700 hover:bg-red-800 disabled:opacity-60 disabled:cursor-default"
              >{busy ? t('withdrawing') : t('withdrawConfirm')}</button>
              <button onClick={() => setConfirming(false)} disabled={busy}
                className="px-3 py-1.5 rounded text-sm font-medium border bg-white text-[#2C4A1A] border-[#D6D3A8] hover:border-[#2C4A1A] disabled:opacity-60 disabled:cursor-default"
              >{t('withdrawCancel')}</button>
            </div>
          </div>
        )
        : (
          <>
            <button onClick={() => { setConfirming(true); setError(null) }}
              className="w-full px-3 py-1.5 rounded text-sm font-medium border bg-white text-red-700 border-[#D6D3A8] hover:border-red-700"
            >{t('withdraw')}</button>
            <p className="text-[11px] text-[#697050] mt-2">{t('withdrawHint')}</p>
          </>
        )}
      {error !== null && <div className="mt-2"><ErrorNote error={error} overrides={{ 404: t('requestGone'), 409: t('withdrawTooLate') }} /></div>}
    </Card>
  )
}
