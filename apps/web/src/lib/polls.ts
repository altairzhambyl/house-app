// Pure helpers for VotingView (ITP-40, ITP-55): grouping and end-date handling.
import type { Poll, Resident } from '../types'

export interface PollGroups {
  /** Managers only: proposals waiting for approve / reject. */
  queue: Poll[]
  /** Residents: their own proposals and rejections. Managers: every rejection. */
  proposals: Poll[]
  open: Poll[]
  closed: Poll[]
}

/** Splits the API's list into the view's sections, keeping its newest-first order. */
export function groupPolls(polls: readonly Poll[], resident: Resident): PollGroups {
  const isManager = resident.role === 'manager'
  const groups: PollGroups = { queue: [], proposals: [], open: [], closed: [] }
  for (const poll of polls) {
    switch (poll.status) {
      case 'proposed':
        if (isManager) groups.queue.push(poll)
        else if (poll.author_id === resident.id) groups.proposals.push(poll)
        break
      case 'rejected':
        if (isManager || poll.author_id === resident.id) groups.proposals.push(poll)
        break
      case 'open':
        groups.open.push(poll)
        break
      case 'closed':
        groups.closed.push(poll)
        break
    }
  }
  return groups
}

/** The last minute of a local calendar day ("2026-11-20"), as an ISO timestamp with offset. */
export function endOfLocalDay(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const [, y, mo, d] = match
  const end = new Date(Number(y), Number(mo) - 1, Number(d), 23, 59, 0, 0)
  // Rejects overflow such as 2026-02-31, which Date would roll into March.
  if (end.getMonth() !== Number(mo) - 1 || end.getDate() !== Number(d)) return null
  return end.toISOString()
}

/** A local calendar day `days` from `from`, in the <input type="date"> format. */
export function localDay(days: number, from: Date = new Date()): string {
  const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
}
