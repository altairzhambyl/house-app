import { useCallback, useEffect, useState } from 'react'
import { Card, ErrorNote, Loaded, SectionHeader } from '../components/ui'
import { useLocale, useT } from '../i18n'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import type { Flat, FlatResident } from '../types'
import { m } from './FlatsView.i18n'

// manager only: flat join codes that residents use to link their accounts,
// and the residents of each flat (ITP-23: remove one, which also rotates the code)
export function FlatsView() {
  const t = useT(m)
  const { state, reload, setData } = useApi(useCallback(() => api.listFlats(), []))

  return (
    <div>
      <SectionHeader title={t('title')} sub={t('sub')} />
      <Loaded state={state} onRetry={reload} isEmpty={d => d.length === 0} empty={t('empty')}>
        {flats => (
          <Card>
            <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-3 px-4 py-2 border-b border-[#D6D3A8] text-[10px] font-mono uppercase tracking-wider text-[#697050]">
              <span>{t('colFlat')}</span><span>{t('colCode')}</span><span>{t('colResidents')}</span><span />
            </div>
            {flats.map((f, i) => (
              <FlatRow key={f.id} flat={f} last={i === flats.length - 1}
                onChanged={next => setData(list => list.map(x => (x.id === next.id ? next : x)))} />
            ))}
          </Card>
        )}
      </Loaded>
    </div>
  )
}

function FlatRow({ flat, last, onChanged }: { flat: Flat; last: boolean; onChanged: (f: Flat) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [copied, setCopied] = useState(false)
  // Kept as a flag, not text, so the message follows a language switch.
  const [copyFailed, setCopyFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const t = useT(m)

  async function rotate() {
    if (!window.confirm(t('confirmRotate', { flat: flat.number }))) return
    setBusy(true)
    setError(null)
    setCopyFailed(false)
    try {
      onChanged(await api.rotateFlatCode(flat.id))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    setCopyFailed(false)
    try {
      await navigator.clipboard.writeText(flat.join_code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.warn('Clipboard write failed', err)
      setCopyFailed(true)
    }
  }

  return (
    <div className={`px-4 py-3 ${last ? '' : 'border-b border-[#F6F5DC]'}`}>
      <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-3 items-center">
        <span className="font-semibold text-[#2C4A1A]">{t('flat', { flat: flat.number })}</span>
        <button onClick={() => void copy()} title={t('copy')} aria-label={`${t('copy')}: ${flat.join_code}`}
          className="font-mono text-sm tracking-widest text-[#1E2A0E] text-left hover:text-[#A07C12] transition-colors">
          {flat.join_code} <span className="text-[10px] text-[#697050] tracking-normal">{copied ? t('copied') : '⧉'}</span>
        </button>
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} title={t('showResidents')}
          aria-label={`${t('showResidents')}: ${flat.resident_count}`}
          className="font-mono text-sm text-[#697050] text-left hover:text-[#A07C12] transition-colors">
          {flat.resident_count} {open ? '▴' : '▾'}
        </button>
        <button onClick={() => void rotate()} disabled={busy}
          className="text-xs border border-[#D6D3A8] hover:border-[#2C4A1A] disabled:opacity-60 text-[#2C4A1A] px-3 py-1 rounded font-medium transition-colors">
          {busy ? '…' : t('newCode')}
        </button>
      </div>
      {error !== null && <div className="mt-1"><ErrorNote error={error} /></div>}
      {copyFailed && <p className="mt-1 text-red-600 text-xs" role="alert">{t('copyFailed')}</p>}
      {open && <FlatResidents flat={flat} onChanged={onChanged} />}
    </div>
  )
}

type ResidentsState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; residents: FlatResident[] }

// Residents of one flat, loaded when the manager expands the row.
function FlatResidents({ flat, onChanged }: { flat: Flat; onChanged: (f: Flat) => void }) {
  const t = useT(m)
  const { formatDate } = useLocale()
  const [state, setState] = useState<ResidentsState>({ status: 'loading' })
  const [confirming, setConfirming] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<unknown>(null)

  const load = useCallback(async () => {
    try {
      setState({ status: 'ready', residents: await api.listFlatResidents(flat.id) })
    } catch (err) {
      setState({ status: 'error', error: err })
    }
  }, [flat.id])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(resident: FlatResident) {
    setRemoving(resident.id)
    setRemoveError(null)
    try {
      // The response carries the flat's new join code (removal rotates it).
      onChanged(await api.removeFlatResident(flat.id, resident.id))
      setConfirming(null)
      await load()
    } catch (err) {
      setRemoveError(err)
    } finally {
      setRemoving(null)
    }
  }

  if (state.status === 'loading') {
    return <p className="mt-2 text-xs font-mono text-[#697050]">{t('loading')}</p>
  }
  if (state.status === 'error') {
    return (
      <div className="mt-2 flex items-center gap-3">
        <ErrorNote error={state.error} />
        <button onClick={() => { setState({ status: 'loading' }); void load() }}
          className="text-xs text-[#2C4A1A] underline">{t('retry')}</button>
      </div>
    )
  }
  if (state.residents.length === 0) {
    return <p className="mt-2 text-xs text-[#697050]">{t('noResidents')}</p>
  }

  return (
    <div className="mt-2 border-t border-[#F6F5DC] pt-2">
      <ul className="space-y-1">
        {state.residents.map(r => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-[#1E2A0E]">{r.full_name}</span>
            <span className="text-[10px] font-mono text-[#697050]">{t('since', { date: formatDate(r.created_at) })}</span>
            <span className="ml-auto flex items-center gap-2">
              {confirming === r.id ? (
                <>
                  <span className="text-xs text-[#697050]">{t('confirmRemove', { flat: flat.number })}</span>
                  <button onClick={() => void remove(r)} disabled={removing !== null}
                    className="text-xs border border-red-300 hover:border-red-600 disabled:opacity-60 text-red-700 px-3 py-1 rounded font-medium transition-colors">
                    {removing === r.id ? '…' : t('yesRemove')}
                  </button>
                  <button onClick={() => setConfirming(null)} disabled={removing !== null}
                    className="text-xs border border-[#D6D3A8] hover:border-[#2C4A1A] disabled:opacity-60 text-[#2C4A1A] px-3 py-1 rounded font-medium transition-colors">
                    {t('cancel')}
                  </button>
                </>
              ) : (
                <button onClick={() => { setConfirming(r.id); setRemoveError(null) }} disabled={removing !== null}
                  className="text-xs border border-[#D6D3A8] hover:border-[#2C4A1A] disabled:opacity-60 text-[#2C4A1A] px-3 py-1 rounded font-medium transition-colors">
                  {t('remove')}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-[#697050]">{t('removeNote')}</p>
      {removeError !== null && <div className="mt-1"><ErrorNote error={removeError} /></div>}
    </div>
  )
}
