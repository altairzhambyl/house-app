import { useCallback, useState, type FormEvent, type ReactNode } from 'react'
import { Badge, Card, ErrorNote, Loaded, SectionHeader, inputCls, labelCls } from '../components/ui'
import { useLocale, useT } from '../i18n'
import { ApiError, api, listAllAnnouncements } from '../lib/api'
import { replaceNews, splitNews } from '../lib/news'
import { m } from './NewsView.i18n'
import { useApi } from '../lib/useApi'
import type { Announcement, Resident } from '../types'

const MAX_TITLE = 200
const MAX_BODY = 5000
const MAX_REASON = 500

// news. ITP-51: residents suggest news, managers review it before it is published.
export function NewsView({ resident }: { resident: Resident }) {
  const t = useT(m)
  const isManager = resident.role === 'manager'
  const { state, reload, setData } = useApi(useCallback(() => listAllAnnouncements(), []))
  // setData is a no-op unless the list is loaded; fetch again then, so a new post never looks lost.
  const listReady = state.status === 'ready'
  const posted = useCallback((a: Announcement) => {
    if (listReady) setData(list => [a, ...list])
    else reload()
  }, [listReady, setData, reload])
  const onReviewed = useCallback((a: Announcement) => setData(list => replaceNews(list, a)), [setData])

  return (
    <div>
      <SectionHeader title={t('title')} sub={t('sub')} />
      <ComposeNews isManager={isManager} onPosted={posted} />
      <Loaded state={state} onRetry={reload} isEmpty={d => d.length === 0} empty={t('empty')}>
        {items => {
          const { review, feed } = splitNews(items, resident.role)
          return (
            <>
              {review.length > 0 && (
                <section className="mb-6" aria-labelledby="news-review">
                  <h2 id="news-review" className="font-semibold text-[#2C4A1A]">
                    {isManager ? t('queueTitle') : t('mineTitle')}
                  </h2>
                  <p className="text-xs text-[#697050] mb-3">{isManager ? t('queueSub') : t('mineSub')}</p>
                  <div className="space-y-3">
                    {review.map(n => (
                      <NewsCard key={n.id} n={n}>
                        {isManager && n.status === 'pending' && <ReviewActions n={n} onReviewed={onReviewed} onStale={reload} />}
                      </NewsCard>
                    ))}
                  </div>
                </section>
              )}
              {feed.length === 0
                ? <p className="text-sm text-[#697050]">{t('empty')}</p>
                : (
                  <div className="space-y-3">
                    {feed.map(n => <NewsCard key={n.id} n={n} />)}
                  </div>
                )}
            </>
          )
        }}
      </Loaded>
    </div>
  )
}

/** «УК» for a manager's post, «От жильца, кв. X» for a resident's (flat only, no name). */
export function NewsAuthorBadge({ n }: { n: Pick<Announcement, 'is_official' | 'author_flat_number'> }) {
  const t = useT(m)
  const author = n.is_official
    ? t('official')
    : n.author_flat_number ? t('fromResident', { flat: n.author_flat_number }) : t('fromResidentNoFlat')
  return <Badge label={author} tone={n.is_official ? 'green' : 'blue'} />
}

function NewsCard({ n, children }: { n: Announcement; children?: ReactNode }) {
  const t = useT(m)
  const { formatDateTime } = useLocale()
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <NewsAuthorBadge n={n} />
        {n.status === 'pending' && <Badge label={t('statusPending')} tone="amber" />}
        {n.status === 'rejected' && <Badge label={t('statusRejected')} tone="red" />}
        <span className="text-xs text-[#697050] font-mono">{formatDateTime(n.created_at)}</span>
      </div>
      <h3 className="font-semibold text-[#2C4A1A] mb-1 break-words">{n.title}</h3>
      <p className="text-sm text-[#697050] leading-relaxed whitespace-pre-line break-words">{n.body}</p>
      {n.status === 'rejected' && n.reject_reason && (
        <p className="text-sm text-red-700 mt-2 whitespace-pre-line break-words">
          {t('rejectReason', { reason: n.reject_reason })}
        </p>
      )}
      {children}
    </Card>
  )
}

function ReviewActions({ n, onReviewed, onStale }: {
  n: Announcement
  onReviewed: (a: Announcement) => void
  // Another manager already reviewed it: refetch so the queue matches the server.
  onStale: () => void
}) {
  const t = useT(m)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function run(action: () => Promise<Announcement>) {
    setError(null)
    setBusy(true)
    try {
      onReviewed(await action())
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) { onStale(); return }
      setError(err)
      setBusy(false)
    }
  }

  const reasonId = `reject-reason-${n.id}`
  return (
    <div className="mt-4 border-t border-[#F6F5DC] pt-3">
      {rejecting ? (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            void run(() => api.rejectAnnouncement(n.id, reason.trim() || null))
          }}
          className="space-y-2"
        >
          <label htmlFor={reasonId} className={labelCls}>{t('rejectReasonLabel')}</label>
          <textarea id={reasonId} className={`${inputCls} resize-none h-16`} maxLength={MAX_REASON}
            placeholder={t('rejectReasonPlaceholder')} value={reason} onChange={e => setReason(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" disabled={busy}
              className="bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-1.5 rounded transition-colors">
              {t('confirmReject')}
            </button>
            <button type="button" disabled={busy} onClick={() => setRejecting(false)}
              className="text-sm text-[#697050] hover:underline px-2">
              {t('cancel')}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => void run(() => api.approveAnnouncement(n.id))}
            className="bg-[#2C4A1A] hover:bg-[#3A6022] disabled:opacity-60 text-white text-sm font-semibold px-4 py-1.5 rounded transition-colors">
            {t('approve')}
          </button>
          <button type="button" disabled={busy} onClick={() => setRejecting(true)}
            className="border border-[#D6D3A8] hover:border-red-700 hover:text-red-700 disabled:opacity-60 text-sm font-semibold px-4 py-1.5 rounded transition-colors">
            {t('reject')}
          </button>
        </div>
      )}
      {error !== null && (
        <div className="mt-2"><ErrorNote error={error} /></div>
      )}
    </div>
  )
}

function ComposeNews({ isManager, onPosted }: { isManager: boolean; onPosted: (a: Announcement) => void }) {
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
      <h3 className="font-semibold text-[#2C4A1A] mb-1">{isManager ? t('composeTitle') : t('composeTitleResident')}</h3>
      {!isManager && <p className="text-xs text-[#697050] mb-3">{t('composeHintResident')}</p>}
      <form onSubmit={submit} className={`space-y-3 ${isManager ? 'mt-3' : ''}`}>
        <div>
          <label htmlFor="news-title" className={labelCls}>{t('titleLabel')}</label>
          <input id="news-title" className={inputCls} maxLength={MAX_TITLE}
            placeholder={isManager ? t('titlePlaceholder') : t('titlePlaceholderResident')}
            value={title} onChange={e => setTitle(e.target.value)} />
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
          {isManager ? (busy ? t('publishing') : t('publish')) : (busy ? t('sending') : t('submit'))}
        </button>
      </form>
    </Card>
  )
}
