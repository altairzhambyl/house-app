import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Card, ErrorBox, ErrorNote, Loading, SectionHeader } from '../components/ui'
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
      <SectionHeader title="Чат дома" sub={`${resident.building_name} · соседи и управляющая компания`} />
      {initial.loading && <Loading />}
      {initial.error !== null && <ErrorBox error={initial.error} onRetry={() => void loadInitial()} />}
      {!initial.loading && initial.error === null && (
        <Card className="flex flex-col h-[calc(100vh-11rem)] min-h-[360px]">
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
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
              <p className="text-center text-sm text-[#697050] py-10">Сообщений пока нет. Напишите первым!</p>
            )}
            {messages.map(m => <MessageBubble key={m.id} m={m} own={m.author_id === resident.id} />)}
          </div>
          {pollError !== null && (
            <div className="px-4 py-1.5 bg-amber-50 border-t border-amber-200 text-[11px] text-amber-800">
              Не удаётся обновить чат — повторим через несколько секунд.
            </div>
          )}
          <SendBox onSent={onSent} />
        </Card>
      )}
    </div>
  )
}

function MessageBubble({ m, own }: { m: Message; own: boolean }) {
  const who = [m.author_name, m.role === 'manager' ? 'УК' : m.flat_number ? `кв. ${m.flat_number}` : null]
    .filter(Boolean)
    .join(' · ')
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-md px-3 py-2 ${
        own ? 'bg-[#2C4A1A] text-white' : m.role === 'manager' ? 'bg-amber-50 border border-amber-200' : 'bg-[#F6F5DC]'
      }`}>
        <div className={`text-[11px] font-mono mb-0.5 ${own ? 'text-white/60' : 'text-[#697050]'}`}>
          {who} · {formatMessageTime(m.created_at)}
        </div>
        <p className={`text-sm whitespace-pre-line break-words ${own ? 'text-white' : 'text-[#1E2A0E]'}`}>{m.body}</p>
      </div>
    </div>
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
    <form onSubmit={send} className="border-t border-[#D6D3A8] p-3">
      {error !== null && <div className="mb-2"><ErrorNote error={error} /></div>}
      <div className="flex gap-2">
        <textarea
          aria-label="Сообщение"
          className="flex-1 border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A] resize-none h-10"
          placeholder="Написать соседям… (Enter — отправить, Shift+Enter — новая строка)"
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
          className="bg-[#A07C12] hover:bg-[#836208] disabled:opacity-60 text-white font-semibold rounded px-4 text-sm transition-colors">
          {busy ? '…' : 'Отправить'}
        </button>
      </div>
    </form>
  )
}
