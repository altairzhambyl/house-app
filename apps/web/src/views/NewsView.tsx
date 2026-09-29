import { useCallback, useState, type FormEvent } from 'react'
import { Card, ErrorNote, Loaded, SectionHeader, inputCls, labelCls } from '../components/ui'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { useApi } from '../lib/useApi'
import type { Announcement, Resident } from '../types'

const MAX_TITLE = 200
const MAX_BODY = 5000

// news
export function NewsView({ resident }: { resident: Resident }) {
  const { state, reload, setData } = useApi(useCallback(() => api.listAnnouncements(), []))

  return (
    <div>
      <SectionHeader title="Новости дома" sub="Официальный канал управляющей компании" />
      {resident.role === 'manager' && (
        <ComposeNews onPosted={a => setData(list => [a, ...list])} />
      )}
      <Loaded state={state} onRetry={reload} isEmpty={d => d.length === 0} empty="Новостей пока нет">
        {items => (
          <div className="space-y-3">
            {items.map(n => (
              <Card key={n.id} className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-[#697050] font-mono">{formatDateTime(n.created_at)}</span>
                </div>
                <h3 className="font-semibold text-[#2C4A1A] mb-1 break-words">{n.title}</h3>
                <p className="text-sm text-[#697050] leading-relaxed whitespace-pre-line break-words">{n.body}</p>
              </Card>
            ))}
          </div>
        )}
      </Loaded>
    </div>
  )
}

function ComposeNews({ onPosted }: { onPosted: (a: Announcement) => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const t = title.trim()
    const b = body.trim()
    if (!t || !b) { setError(new Error('Заполните заголовок и текст')); return }
    setBusy(true)
    setError(null)
    try {
      onPosted(await api.createAnnouncement({ title: t, body: b }))
      setTitle('')
      setBody('')
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5 mb-5 max-w-lg">
      <h3 className="font-semibold text-[#2C4A1A] mb-4">Новая публикация для всего дома</h3>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="news-title" className={labelCls}>Заголовок</label>
          <input id="news-title" className={inputCls} maxLength={MAX_TITLE}
            placeholder="Напр. Отключение воды в пятницу" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label htmlFor="news-body" className={labelCls}>Текст</label>
          <textarea id="news-body" className={`${inputCls} resize-none h-24`} maxLength={MAX_BODY}
            value={body} onChange={e => setBody(e.target.value)} />
        </div>
        {error !== null && <ErrorNote error={error} />}
        <button type="submit" disabled={busy}
          className="w-full bg-[#2C4A1A] hover:bg-[#3A6022] disabled:opacity-60 text-white text-sm font-semibold py-2 rounded transition-colors">
          {busy ? 'Публикация…' : 'Опубликовать'}
        </button>
      </form>
    </Card>
  )
}
