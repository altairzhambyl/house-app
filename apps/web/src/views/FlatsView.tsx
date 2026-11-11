import { useCallback, useEffect, useState } from 'react'
import { Card, ErrorNote, Loaded, SectionHeader } from '../components/ui'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import { formatDate } from '../lib/format'
import type { Flat, FlatResident } from '../types'

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
  const [open, setOpen] = useState(false)

  async function rotate() {
    if (!window.confirm(`Выдать новый код для кв. ${flat.number}? Старый код перестанет работать.`)) return
    setBusy(true)
    setError(null)
    try {
      onChanged(await api.rotateFlatCode(flat.id))
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
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} title="Показать жильцов"
          className="font-mono text-sm text-[#697050] text-left hover:text-[#A07C12] transition-colors">
          {flat.resident_count} {open ? '▴' : '▾'}
        </button>
        <button onClick={() => void rotate()} disabled={busy}
          className="text-xs border border-[#D6D3A8] hover:border-[#2C4A1A] disabled:opacity-60 text-[#2C4A1A] px-3 py-1 rounded font-medium transition-colors">
          {busy ? '…' : 'Новый код'}
        </button>
      </div>
      {error !== null && <div className="mt-1"><ErrorNote error={error} /></div>}
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
    return <p className="mt-2 text-xs font-mono text-[#697050]">Загрузка…</p>
  }
  if (state.status === 'error') {
    return (
      <div className="mt-2 flex items-center gap-3">
        <ErrorNote error={state.error} />
        <button onClick={() => { setState({ status: 'loading' }); void load() }}
          className="text-xs text-[#2C4A1A] underline">Повторить</button>
      </div>
    )
  }
  if (state.residents.length === 0) {
    return <p className="mt-2 text-xs text-[#697050]">Жильцов нет</p>
  }

  return (
    <div className="mt-2 border-t border-[#F6F5DC] pt-2">
      <ul className="space-y-1">
        {state.residents.map(r => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-[#1E2A0E]">{r.full_name}</span>
            <span className="text-[10px] font-mono text-[#697050]">с {formatDate(r.created_at)}</span>
            <span className="ml-auto flex items-center gap-2">
              {confirming === r.id ? (
                <>
                  <span className="text-xs text-[#697050]">Удалить из кв. {flat.number}? Заявки и сообщения останутся, код квартиры сменится.</span>
                  <button onClick={() => void remove(r)} disabled={removing !== null}
                    className="text-xs border border-red-300 hover:border-red-600 disabled:opacity-60 text-red-700 px-3 py-1 rounded font-medium transition-colors">
                    {removing === r.id ? '…' : 'Да, удалить'}
                  </button>
                  <button onClick={() => setConfirming(null)} disabled={removing !== null}
                    className="text-xs border border-[#D6D3A8] hover:border-[#2C4A1A] disabled:opacity-60 text-[#2C4A1A] px-3 py-1 rounded font-medium transition-colors">
                    Отмена
                  </button>
                </>
              ) : (
                <button onClick={() => { setConfirming(r.id); setRemoveError(null) }} disabled={removing !== null}
                  className="text-xs border border-[#D6D3A8] hover:border-[#2C4A1A] disabled:opacity-60 text-[#2C4A1A] px-3 py-1 rounded font-medium transition-colors">
                  Удалить
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-[#697050]">
        Удалённый жилец сразу теряет доступ к дому. Код квартиры при этом меняется автоматически — передайте новый код остальным будущим жильцам.
      </p>
      {removeError !== null && <div className="mt-1"><ErrorNote error={removeError} /></div>}
    </div>
  )
}
