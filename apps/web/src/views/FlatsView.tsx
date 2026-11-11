import { useCallback, useState } from 'react'
import { Card, ErrorNote, Loaded, SectionHeader } from '../components/ui'
import { useT } from '../i18n'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import type { Flat } from '../types'
import { m } from './FlatsView.i18n'

// manager only: flat join codes that residents use to link their accounts
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
                onRotated={next => setData(list => list.map(x => (x.id === next.id ? next : x)))} />
            ))}
          </Card>
        )}
      </Loaded>
    </div>
  )
}

function FlatRow({ flat, last, onRotated }: { flat: Flat; last: boolean; onRotated: (f: Flat) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [copied, setCopied] = useState(false)
  // Kept as a flag, not text, so the message follows a language switch.
  const [copyFailed, setCopyFailed] = useState(false)
  const t = useT(m)

  async function rotate() {
    if (!window.confirm(t('confirmRotate', { flat: flat.number }))) return
    setBusy(true)
    setError(null)
    setCopyFailed(false)
    try {
      onRotated(await api.rotateFlatCode(flat.id))
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
        <span className="font-mono text-sm text-[#697050]">{flat.resident_count}</span>
        <button onClick={() => void rotate()} disabled={busy}
          className="text-xs border border-[#D6D3A8] hover:border-[#2C4A1A] disabled:opacity-60 text-[#2C4A1A] px-3 py-1 rounded font-medium transition-colors">
          {busy ? '…' : t('newCode')}
        </button>
      </div>
      {error !== null && <div className="mt-1"><ErrorNote error={error} /></div>}
      {copyFailed && <p className="mt-1 text-red-600 text-xs" role="alert">{t('copyFailed')}</p>}
    </div>
  )
}
