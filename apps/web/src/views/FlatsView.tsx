import { useCallback, useState } from 'react'
import { Card, ErrorNote, Loaded, SectionHeader } from '../components/ui'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import type { Flat } from '../types'

// manager only: flat join codes that residents use to link their accounts
export function FlatsView() {
  const { state, reload, setData } = useApi(useCallback(() => api.listFlats(), []))

  return (
    <div>
      <SectionHeader title="Квартиры и коды" sub="Передайте код жильцу — он введёт его после регистрации" />
      <Loaded state={state} onRetry={reload} isEmpty={d => d.length === 0} empty="В доме нет квартир">
        {flats => (
          <Card>
            <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-3 px-4 py-2 border-b border-[#D6D3A8] text-[10px] font-mono uppercase tracking-wider text-[#697050]">
              <span>Квартира</span><span>Код</span><span>Жильцов</span><span />
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

  async function rotate() {
    if (!window.confirm(`Выдать новый код для кв. ${flat.number}? Старый код перестанет работать.`)) return
    setBusy(true)
    setError(null)
    try {
      onRotated(await api.rotateFlatCode(flat.id))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(flat.join_code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      setError(new Error(`Не удалось скопировать: ${err instanceof Error ? err.message : String(err)}`))
    }
  }

  return (
    <div className={`px-4 py-3 ${last ? '' : 'border-b border-[#F6F5DC]'}`}>
      <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-3 items-center">
        <span className="font-semibold text-[#2C4A1A]">Кв. {flat.number}</span>
        <button onClick={() => void copy()} title="Скопировать"
          className="font-mono text-sm tracking-widest text-[#1E2A0E] text-left hover:text-[#A07C12] transition-colors">
          {flat.join_code} <span className="text-[10px] text-[#697050] tracking-normal">{copied ? '✓ скопировано' : '⧉'}</span>
        </button>
        <span className="font-mono text-sm text-[#697050]">{flat.resident_count}</span>
        <button onClick={() => void rotate()} disabled={busy}
          className="text-xs border border-[#D6D3A8] hover:border-[#2C4A1A] disabled:opacity-60 text-[#2C4A1A] px-3 py-1 rounded font-medium transition-colors">
          {busy ? '…' : 'Новый код'}
        </button>
      </div>
      {error !== null && <div className="mt-1"><ErrorNote error={error} /></div>}
    </div>
  )
}
