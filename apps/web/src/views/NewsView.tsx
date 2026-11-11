import { useCallback, useState, type FormEvent } from 'react'
import { Card, ErrorNote, Loaded, SectionHeader, inputCls, labelCls } from '../components/ui'
import { useLocale, useT } from '../i18n'
import { api } from '../lib/api'
import { m } from './NewsView.i18n'
import { useApi } from '../lib/useApi'
import type { Announcement, Resident } from '../types'

const MAX_TITLE = 200
const MAX_BODY = 5000

// news
export function NewsView({ resident }: { resident: Resident }) {
  const t = useT(m)
  const { formatDateTime } = useLocale()
  const { state, reload, setData } = useApi(useCallback(() => api.listAnnouncements(), []))

  return (
    <div>
      <SectionHeader title={t('title')} sub={t('sub')} />
      {resident.role === 'manager' && (
        <ComposeNews onPosted={a => setData(list => [a, ...list])} />
      )}
      <Loaded state={state} onRetry={reload} isEmpty={d => d.length === 0} empty={t('empty')}>
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
  // Validation is kept as a key so the message follows a language switch.
  const [invalid, setInvalid] = useState<keyof (typeof m)['ru'] | null>(null)
  const t = useT(m)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const titleText = title.trim()
    const bodyText = body.trim()
    setError(null)
    if (!titleText || !bodyText) { setInvalid('required'); return }
    setInvalid(null)
    setBusy(true)
    try {
      onPosted(await api.createAnnouncement({ title: titleText, body: bodyText }))
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
      <h3 className="font-semibold text-[#2C4A1A] mb-4">{t('composeTitle')}</h3>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="news-title" className={labelCls}>{t('titleLabel')}</label>
          <input id="news-title" className={inputCls} maxLength={MAX_TITLE}
            placeholder={t('titlePlaceholder')} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label htmlFor="news-body" className={labelCls}>{t('bodyLabel')}</label>
          <textarea id="news-body" className={`${inputCls} resize-none h-24`} maxLength={MAX_BODY}
            value={body} onChange={e => setBody(e.target.value)} />
        </div>
        {invalid !== null && <p className="text-red-600 text-xs" role="alert">{t(invalid)}</p>}
        {error !== null && <ErrorNote error={error} />}
        <button type="submit" disabled={busy}
          className="w-full bg-[#2C4A1A] hover:bg-[#3A6022] disabled:opacity-60 text-white text-sm font-semibold py-2 rounded transition-colors">
          {busy ? t('publishing') : t('publish')}
        </button>
      </form>
    </Card>
  )
}
