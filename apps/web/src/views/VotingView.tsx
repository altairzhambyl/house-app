import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Badge, Card, Empty, ErrorNote, Loaded, SectionHeader, inputCls, labelCls } from '../components/ui'
import { useLocale, useT } from '../i18n'
import { api, listAllPolls } from '../lib/api'
import type { Tone } from '../lib/format'
import { endOfLocalDay, groupPolls, localDay } from '../lib/polls'
import { useApi } from '../lib/useApi'
import type { Poll, PollChoice, PollStatus, Resident } from '../types'
import { m } from './VotingView.i18n'

const MAX_QUESTION = 300
const MAX_DESCRIPTION = 2000
const MAX_REASON = 500
// The API accepts end dates up to a year ahead.
const MAX_DAYS_AHEAD = 365
const DEFAULT_DAYS = 7

const STATUS_TONE: Record<PollStatus, Tone> = { proposed: 'amber', open: 'green', rejected: 'red', closed: 'gray' }
const CHOICES: readonly PollChoice[] = ['for', 'against', 'abstain']
const BAR_COLOR: Record<PollChoice, string> = { for: 'bg-emerald-500', against: 'bg-red-400', abstain: 'bg-gray-300' }
const BUTTON_CLS: Record<PollChoice, string> = {
  for: 'border-emerald-400 text-emerald-700 hover:bg-emerald-50',
  against: 'border-red-400 text-red-700 hover:bg-red-50',
  abstain: 'border-gray-300 text-gray-600 hover:bg-gray-50',
}
const COUNT: Record<PollChoice, 'votes_for' | 'votes_against' | 'votes_abstain'> = {
  for: 'votes_for',
  against: 'votes_against',
  abstain: 'votes_abstain',
}
const primaryBtn =
  'bg-[#2C4A1A] hover:bg-[#3A6022] disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors'
const secondaryBtn =
  'border border-[#D6D3A8] text-[#2C4A1A] hover:bg-[#F6F5DC] disabled:opacity-60 text-xs font-semibold px-3 py-1.5 rounded transition-colors'

// voting
export function VotingView({ resident }: { resident: Resident }) {
  const t = useT(m)
  const { state, reload, setData } = useApi(useCallback(() => listAllPolls(), []))
  const isManager = resident.role === 'manager'

  // Every action returns the poll as it is now; swap it in place (or prepend a new one).
  const upsert = useCallback((poll: Poll) => {
    setData(list => (list.some(p => p.id === poll.id) ? list.map(p => (p.id === poll.id ? poll : p)) : [poll, ...list]))
  }, [setData])

  return (
    <div>
      <SectionHeader title={t('title')} sub={t('sub')} />
      <p className="text-xs text-[#697050] bg-[#F6F5DC] border border-[#D6D3A8] rounded px-3 py-2 mb-5 max-w-2xl">
        {t('advisory')}
      </p>
      <ProposePoll isManager={isManager} onCreated={upsert} />
      <Loaded state={state} onRetry={reload}>
        {polls => <PollSections polls={polls} resident={resident} onChanged={upsert} />}
      </Loaded>
    </div>
  )
}

function PollSections({ polls, resident, onChanged }: {
  polls: Poll[]
  resident: Resident
  onChanged: (poll: Poll) => void
}) {
  const t = useT(m)
  const groups = useMemo(() => groupPolls(polls, resident), [polls, resident])
  const isManager = resident.role === 'manager'
  const card = (p: Poll) => <PollCard key={p.id} poll={p} resident={resident} onChanged={onChanged} />

  return (
    <div className="space-y-8">
      {isManager && groups.queue.length > 0 && (
        <Section title={t('sectionQueue')}>{groups.queue.map(card)}</Section>
      )}
      {groups.proposals.length > 0 && (
        <Section title={isManager ? t('sectionRejected') : t('sectionMine')}>{groups.proposals.map(card)}</Section>
      )}
      <Section title={t('sectionOpen')}>
        {groups.open.length > 0 ? groups.open.map(card) : <Empty>{t('emptyOpen')}</Empty>}
      </Section>
      <Section title={t('sectionClosed')}>
        {groups.closed.length > 0 ? groups.closed.map(card) : <Empty>{t('emptyClosed')}</Empty>}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-mono text-[#697050] uppercase tracking-wider mb-3">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function PollCard({ poll, resident, onChanged }: {
  poll: Poll
  resident: Resident
  onChanged: (poll: Poll) => void
}) {
  const t = useT(m)
  const { formatDate } = useLocale()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const isManager = resident.role === 'manager'
  const isReview = poll.status === 'proposed' || poll.status === 'rejected'

  async function run(action: () => Promise<Poll>) {
    setBusy(true)
    setError(null)
    try {
      onChanged(await action())
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <Badge label={t(`status_${poll.status}`)} tone={STATUS_TONE[poll.status]} />
        <span className="text-[11px] font-mono text-[#697050]">{t('deadline', { date: formatDate(poll.ends_at) })}</span>
        <span className="text-[11px] text-[#697050]">· {t('author', { name: poll.author_name })}</span>
      </div>
      <h3 className="font-semibold text-[#2C4A1A] break-words">{poll.question}</h3>
      {poll.description && (
        <p className="text-sm text-[#697050] mt-1 leading-relaxed whitespace-pre-line break-words">{poll.description}</p>
      )}

      {poll.status === 'rejected' && poll.reject_reason && (
        <p className="text-xs text-red-700 mt-3 break-words">{t('rejectReason', { reason: poll.reject_reason })}</p>
      )}
      {poll.status === 'proposed' && !isManager && (
        <p className="text-xs text-[#697050] mt-3">{t('awaitingReview')}</p>
      )}
      {poll.status === 'proposed' && isManager && (
        <Moderation poll={poll} busy={busy} run={run} />
      )}

      {!isReview && <Tally poll={poll} />}

      {!isReview && (
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
          <span className="text-[11px] font-mono text-[#697050]">
            <Turnout poll={poll} />
          </span>
          {poll.status === 'open' && !isManager && poll.my_choice === null && (
            <div className="flex flex-wrap gap-2">
              {CHOICES.map(c => (
                <button key={c} type="button" disabled={busy} onClick={() => void run(() => api.votePoll(poll.id, c))}
                  className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors disabled:opacity-60 ${BUTTON_CLS[c]}`}
                >{t(`choice_${c}`)}</button>
              ))}
            </div>
          )}
          {poll.my_choice !== null && (
            <span className="text-xs text-emerald-700 font-medium">{t(`youVoted_${poll.my_choice}`)}</span>
          )}
          {poll.status === 'open' && isManager && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-[#697050]">{t('managersDontVote')}</span>
              <button type="button" disabled={busy} className={secondaryBtn}
                onClick={() => void run(() => api.closePoll(poll.id))}>{t('closeEarly')}</button>
            </div>
          )}
        </div>
      )}
      {error !== null && (
        <div className="mt-3">
          <ErrorNote error={error} overrides={{ 409: poll.status === 'open' && !isManager ? t('voteRejected') : t('notOpen') }} />
        </div>
      )}
    </Card>
  )
}

function Tally({ poll }: { poll: Poll }) {
  const t = useT(m)
  const { formatNumber, locale } = useLocale()
  const percent = useMemo(() => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }), [locale])
  const share = (n: number) => (poll.votes_total > 0 ? n / poll.votes_total : 0)
  return (
    <div className="space-y-2 mt-4">
      {CHOICES.map(key => {
        const n = poll[COUNT[key]]
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-[#697050] w-28">{t(`tally_${key}`)}</span>
            <div className="flex-1 bg-[#F6F5DC] rounded-full h-2" aria-hidden="true">
              <div className={`h-2 rounded-full ${BAR_COLOR[key]} transition-all`} style={{ width: `${Math.round(share(n) * 100)}%` }} />
            </div>
            <span className="text-xs font-mono text-[#697050] w-16 text-right">
              {t('barCount', { count: formatNumber(n), pct: percent.format(share(n)) })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Turnout({ poll }: { poll: Poll }) {
  const t = useT(m)
  const { formatNumber } = useLocale()
  return <>{t('turnout', { voted: formatNumber(poll.votes_total), total: formatNumber(poll.eligible_voters) })}</>
}

function Moderation({ poll, busy, run }: {
  poll: Poll
  busy: boolean
  run: (action: () => Promise<Poll>) => Promise<void>
}) {
  const t = useT(m)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [invalid, setInvalid] = useState(false)
  const reasonId = `reject-reason-${poll.id}`

  function reject(e: FormEvent) {
    e.preventDefault()
    const text = reason.trim()
    if (!text) { setInvalid(true); return }
    setInvalid(false)
    void run(() => api.rejectPoll(poll.id, text))
  }

  if (rejecting) {
    return (
      <form onSubmit={reject} className="mt-4 space-y-2 max-w-lg">
        <label htmlFor={reasonId} className={labelCls}>{t('rejectReasonLabel')}</label>
        <textarea id={reasonId} className={`${inputCls} resize-none h-20`} maxLength={MAX_REASON}
          placeholder={t('rejectReasonPlaceholder')} value={reason} onChange={e => setReason(e.target.value)} />
        {invalid && <p className="text-red-600 text-xs" role="alert">{t('reasonRequired')}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy}
            className="bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">
            {t('confirmReject')}
          </button>
          <button type="button" disabled={busy} className={secondaryBtn} onClick={() => setRejecting(false)}>{t('cancel')}</button>
        </div>
      </form>
    )
  }
  return (
    <div className="flex gap-2 mt-4">
      <button type="button" disabled={busy} className={primaryBtn}
        onClick={() => void run(() => api.approvePoll(poll.id))}>{t('approve')}</button>
      <button type="button" disabled={busy} className={secondaryBtn} onClick={() => setRejecting(true)}>{t('reject')}</button>
    </div>
  )
}

function ProposePoll({ isManager, onCreated }: { isManager: boolean; onCreated: (poll: Poll) => void }) {
  const t = useT(m)
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [endsOn, setEndsOn] = useState(() => localDay(DEFAULT_DAYS))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  // Validation is kept as a key so the message follows a language switch.
  const [invalid, setInvalid] = useState<'required' | 'endsInPast' | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const questionText = question.trim()
    const endsAt = endOfLocalDay(endsOn)
    if (!questionText || endsAt === null) { setInvalid('required'); return }
    if (new Date(endsAt) <= new Date()) { setInvalid('endsInPast'); return }
    setInvalid(null)
    setBusy(true)
    try {
      onCreated(await api.createPoll({ question: questionText, description: description.trim() || null, ends_at: endsAt }))
      setQuestion('')
      setDescription('')
      setEndsOn(localDay(DEFAULT_DAYS))
      setOpen(false)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="mb-6">
        <button type="button" className={primaryBtn} onClick={() => setOpen(true)}>
          {isManager ? t('createOpen') : t('proposeOpen')}
        </button>
      </div>
    )
  }
  return (
    <Card className="p-5 mb-6 max-w-lg">
      <h3 className="font-semibold text-[#2C4A1A] mb-1">{isManager ? t('createTitle') : t('proposeTitle')}</h3>
      <p className="text-xs text-[#697050] mb-4">{isManager ? t('createHint') : t('proposeHint')}</p>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="poll-question" className={labelCls}>{t('questionLabel')}</label>
          <input id="poll-question" className={inputCls} maxLength={MAX_QUESTION}
            placeholder={t('questionPlaceholder')} value={question} onChange={e => setQuestion(e.target.value)} />
        </div>
        <div>
          <label htmlFor="poll-description" className={labelCls}>{t('descriptionLabel')}</label>
          <textarea id="poll-description" className={`${inputCls} resize-none h-20`} maxLength={MAX_DESCRIPTION}
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div>
          <label htmlFor="poll-ends" className={labelCls}>{t('endsLabel')}</label>
          <input id="poll-ends" type="date" className={inputCls} min={localDay(0)} max={localDay(MAX_DAYS_AHEAD)}
            value={endsOn} onChange={e => setEndsOn(e.target.value)} />
        </div>
        {invalid !== null && <p className="text-red-600 text-xs" role="alert">{t(invalid)}</p>}
        {error !== null && <ErrorNote error={error} />}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? t('sending') : isManager ? t('submitCreate') : t('submitPropose')}
          </button>
          <button type="button" disabled={busy} className={secondaryBtn} onClick={() => setOpen(false)}>{t('cancel')}</button>
        </div>
      </form>
    </Card>
  )
}
