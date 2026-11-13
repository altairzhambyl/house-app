import { describe, expect, it } from 'vitest'
import type { Poll, PollStatus, Resident } from '../types'
import { endOfLocalDay, groupPolls, localDay } from './polls'

function resident(id: string, role: Resident['role']): Resident {
  return {
    id,
    building_id: 'b1',
    building_name: 'Block A',
    flat_id: role === 'manager' ? null : 'f1',
    flat_number: role === 'manager' ? null : '14B',
    full_name: id,
    role,
  }
}

function poll(id: string, status: PollStatus, author_id: string): Poll {
  return {
    id,
    building_id: 'b1',
    author_id,
    author_name: author_id,
    question: id,
    description: null,
    ends_at: '2030-01-01T00:00:00Z',
    status,
    reject_reason: status === 'rejected' ? 'no' : null,
    reviewed_at: null,
    created_at: '2026-11-01T00:00:00Z',
    votes_for: 0,
    votes_against: 0,
    votes_abstain: 0,
    votes_total: 0,
    eligible_voters: 3,
    my_choice: null,
  }
}

const POLLS = [
  poll('mine-proposed', 'proposed', 'alice'),
  poll('other-proposed', 'proposed', 'bob'),
  poll('mine-rejected', 'rejected', 'alice'),
  poll('other-rejected', 'rejected', 'bob'),
  poll('open', 'open', 'manager'),
  poll('closed', 'closed', 'manager'),
]
const ids = (list: Poll[]) => list.map(p => p.id)

describe('groupPolls', () => {
  it('shows a resident only their own proposals', () => {
    const groups = groupPolls(POLLS, resident('alice', 'resident'))
    expect(ids(groups.queue)).toEqual([])
    expect(ids(groups.proposals)).toEqual(['mine-proposed', 'mine-rejected'])
    expect(ids(groups.open)).toEqual(['open'])
    expect(ids(groups.closed)).toEqual(['closed'])
  })

  it('gives a manager the moderation queue and every rejection', () => {
    const groups = groupPolls(POLLS, resident('manager', 'manager'))
    expect(ids(groups.queue)).toEqual(['mine-proposed', 'other-proposed'])
    expect(ids(groups.proposals)).toEqual(['mine-rejected', 'other-rejected'])
  })
})

describe('end dates', () => {
  it('ends at the last minute of the chosen local day', () => {
    const iso = endOfLocalDay('2026-11-20')
    expect(iso).not.toBeNull()
    const end = new Date(iso!)
    expect([end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes()])
      .toEqual([2026, 10, 20, 23, 59])
  })

  it('rejects malformed and impossible dates', () => {
    expect(endOfLocalDay('')).toBeNull()
    expect(endOfLocalDay('20.11.2026')).toBeNull()
    expect(endOfLocalDay('2026-02-31')).toBeNull()
  })

  it('formats a day offset for <input type="date">', () => {
    expect(localDay(7, new Date(2026, 11, 28))).toBe('2027-01-04')
    expect(localDay(0, new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
