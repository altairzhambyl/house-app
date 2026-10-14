import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { ErrorBox, ErrorNote, Loading } from '../components/ui'
import { api } from '../lib/api'
import { formatMessageTime } from '../lib/format'
import type { Message, Resident } from '../types'

const PAGE_SIZE = 50
const POLL_MS = 5000
const MAX_BODY = 2000
// How close to the bottom (px) still counts as "following" the conversation.
const STICKY_PX = 80

// Oldest first, de-duplicated by id: the API pages newest-first, the chat reads top-down.
function merge(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map(m => [m.id, m]))
  for (const m of incoming) byId.set(m.id, m)
  return [...byId.values()].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id),
  )
}

// A full page of only-unknown messages means some were missed in between:
// restart from the newest page rather than show a silent gap.
function hasGap(current: Message[], page: Message[]): boolean {
  if (current.length === 0 || page.length < PAGE_SIZE) return false
  const known = new Set(current.map(m => m.id))
  return !page.some(m => known.has(m.id))
}

type ScrollIntent = 'bottom' | { preserveFrom: number } | null

// building channel — replaces the ЖК WhatsApp group
export function ChannelView({ resident }: { resident: Resident }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [initial, setInitial] = useState<{ loading: boolean; error: unknown }>({ loading: true, error: null })
  const [hasOlder, setHasOlder] = useState(false)
  const [olderState, setOlderState] = useState<{ loading: boolean; error: unknown }>({ loading: false, error: null })
  const [pollError, setPollError] = useState<unknown>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const scrollIntent = useRef<ScrollIntent>(null)
  const messagesRef = useRef<Message[]>(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  const loadInitial = useCallback(async () => {
    setInitial({ loading: true, error: null })
    try {
      const page = await api.listMessages({ limit: PAGE_SIZE })
      scrollIntent.current = 'bottom'
      setMessages(merge([], page))
      setHasOlder(page.length === PAGE_SIZE)
      setInitial({ loading: false, error: null })
    } catch (error) {
      setInitial({ loading: false, error })
    }
  }, [])

  useEffect(() => { void loadInitial() }, [loadInitial])

  // Poll for new messages. A failed poll keeps the conversation on screen and
  // shows a small warning; the next tick retries.
  useEffect(() => {
    if (initial.loading || initial.error !== null) return
    let cancelled = false
    const tick = async () => {
      if (document.hidden) return
      try {
        const page = await api.listMessages({ limit: PAGE_SIZE })
        if (cancelled) return
        setPollError(null)
        const el = listRef.current
        const following = !el || el.scrollHeight - el.scrollTop - el.clientHeight <= STICKY_PX
        if (hasGap(messagesRef.current, page)) setHasOlder(true)
        setMessages(current => {
          const known = new Set(current.map(m => m.id))
          if (page.every(m => known.has(m.id))) return current
          if (following) scrollIntent.current = 'bottom'
          return hasGap(current, page) ? merge([], page) : merge(current, page)
        })
      } catch (error) {
        if (!cancelled) setPollError(error)
      }
    }
    const timer = window.setInterval(() => { void tick() }, POLL_MS)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [initial.loading, initial.error])

  async function loadOlder() {
    const oldest = messages[0]
    if (!oldest) return
    setOlderState({ loading: true, error: null })
    try {
      const page = await api.listMessages({ limit: PAGE_SIZE, before: oldest.created_at })
      scrollIntent.current = { preserveFrom: listRef.current?.scrollHeight ?? 0 }
      setMessages(current => merge(current, page))
      setHasOlder(page.length === PAGE_SIZE)
      setOlderState({ loading: false, error: null })
    } catch (error) {
      setOlderState({ loading: false, error })
    }
  }

  function onSent(m: Message) {
    scrollIntent.current = 'bottom'
    setMessages(current => merge(current, [m]))
  }

  // Apply the scroll decision after the DOM has the new messages.
  useLayoutEffect(() => {
    const el = listRef.current
    const intent = scrollIntent.current
    scrollIntent.current = null
    if (!el || intent === null) return
    if (intent === 'bottom') {
      el.scrollTop = el.scrollHeight
    } else {
      el.scrollTop += el.scrollHeight - intent.preserveFrom
    }
  }, [messages])

  return (
    <div>
      {initial.loading && <Loading />}
      {initial.error !== null && <ErrorBox error={initial.error} onRetry={() => void loadInitial()} />}
      {!initial.loading && initial.error === null && (
        <section aria-label="Чат дома"
          className="flex flex-col h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-3rem)] min-h-[320px] bg-white border border-[#DEDBB7] rounded-[14px] overflow-hidden shadow-[0_8px_30px_#2c4a1a0b]">
          <header className="flex items-center gap-3 md:gap-3.5 px-4 md:px-6 py-3 md:py-4 border-b border-[#E8E7D5] shrink-0">
            <div className="w-10 h-10 md:w-12 md:h-12 grid place-items-center bg-[#E7EEDF] text-[#2C4A1A] rounded-[15px] text-lg md:text-xl shrink-0" aria-hidden>👥</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[17px] md:text-[19px] font-bold truncate text-[#2C4A1A]">Чат дома</h1>
              <p className="text-xs text-[#697050] mt-0.5 line-clamp-2 break-words">{resident.building_name} · соседи и управляющая компания</p>
            </div>
          </header>
          <div ref={listRef} role="log" aria-live="polite" aria-relevant="additions"
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-[clamp(16px,4%,48px)] py-6 bg-gradient-to-b from-[#FAF9ED] to-[#F6F5DC] flex flex-col gap-4">
            {hasOlder && (
              <div className="text-center">
                <button onClick={() => void loadOlder()} disabled={olderState.loading}
                  className="text-xs text-[#A07C12] hover:underline disabled:opacity-60">
                  {olderState.loading ? 'Загрузка…' : 'Показать более ранние сообщения'}
                </button>
                {olderState.error !== null && <ErrorNote error={olderState.error} />}
              </div>
            )}
            {messages.length === 0 && (
              <p className="m-auto text-center text-sm text-[#697050]">Сообщений пока нет. Напишите первым!</p>
            )}
            {messages.map(m => <MessageBubble key={m.id} m={m} own={m.author_id === resident.id} />)}
          </div>
          {pollError !== null && (
            <div className="px-4 py-1.5 bg-amber-50 border-t border-amber-200 text-[11px] text-amber-800">
              Не удаётся обновить чат — повторим через несколько секунд.
            </div>
          )}
          <SendBox onSent={onSent} />
        </section>
      )}
    </div>
  )
}

const AVATAR_COLORS = ['#DDEDD9', '#FCE7C8', '#DCEAF8', '#F2DFF1', '#F7E6D7']

function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
  const color = AVATAR_COLORS[Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
  return (
    <span aria-hidden title={name} style={{ backgroundColor: color }}
      className="w-9 h-9 min-w-9 grid place-items-center rounded-full text-xs font-bold text-[#2C4A1A] border-2 border-white">
      {initials || '?'}
    </span>
  )
}

function MessageBubble({ m, own }: { m: Message; own: boolean }) {
  const who = own ? 'Вы' : [m.author_name, m.role === 'manager' ? 'УК' : m.flat_number ? `кв. ${m.flat_number}` : null]
    .filter(Boolean)
    .join(' · ')
  return (
    <article className={`flex items-end gap-2.5 max-w-[92%] md:max-w-[82%] ${own ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <Avatar name={m.author_name} />
      <div className={`min-w-0 px-3.5 py-2.5 border shadow-[0_2px_7px_#2c4a1a08] ${
        own ? 'bg-[#E1EDDA] border-[#D0E2C5] rounded-[14px_14px_4px_14px]'
          : m.role === 'manager' ? 'bg-amber-50 border-amber-200 rounded-[14px_14px_14px_4px]'
          : 'bg-white border-[#E8E7D5] rounded-[14px_14px_14px_4px]'
      }`}>
        <div className="flex items-baseline justify-between gap-5 mb-1">
          <strong className="text-xs text-[#2C4A1A]">{who}</strong>
          <time dateTime={m.created_at} className="text-[10px] text-[#697050] whitespace-nowrap">{formatMessageTime(m.created_at)}</time>
        </div>
        <p className="text-sm leading-relaxed text-[#263521] whitespace-pre-line break-words">{m.body}</p>
      </div>
    </article>
  )
}

function SendBox({ onSent }: { onSent: (m: Message) => void }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function send(e?: FormEvent) {
    e?.preventDefault()
    const sent = body
    const text = sent.trim()
    if (!text || busy) return
    setBusy(true)
    setError(null)
    try {
      onSent(await api.postMessage(text))
      // The box stays editable while sending: remove only what was sent and
      // keep anything typed since.
      setBody(current => current.startsWith(sent) ? current.slice(sent.length).trimStart() : current)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={send} className="border-t border-[#E8E7D5] bg-white px-3 md:px-6 pt-3 md:pt-4 pb-3 shrink-0">
      {error !== null && <div className="mb-2"><ErrorNote error={error} /></div>}
      <div className="flex gap-2">
        <textarea
          aria-label="Сообщение"
          className="flex-1 min-w-0 border border-[#D6D3A8] rounded-[9px] px-3 md:px-4 py-3 text-sm focus:outline-none focus:border-[#2C4A1A] resize-none h-12"
          aria-describedby="composer-hint"
          placeholder="Написать соседям…"
          maxLength={MAX_BODY}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <button type="submit" disabled={busy || !body.trim()}
          className="bg-[#A07C12] hover:bg-[#836208] disabled:opacity-60 text-white font-semibold rounded-[9px] px-3 md:px-5 text-sm shrink-0 transition-colors">
          {busy ? '…' : 'Отправить'}
        </button>
      </div>
      <p id="composer-hint" className="sr-only md:not-sr-only md:mt-1.5 text-[11px] text-[#697050]">
        Enter — отправить, Shift+Enter — новая строка
      </p>
    </form>
  )
}
