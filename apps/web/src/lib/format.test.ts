import { describe, expect, it } from 'vitest'
import { RequestStatusSchema } from '../types'
import {
  ALL_STATUSES,
  STATUS_LABELS,
  STATUS_ORDER,
  STATUS_TONE,
  canWithdraw,
  isOpenStatus,
  statusLabel,
  statusSteps,
} from './format'

describe('request statuses', () => {
  it('lists every status the API can return', () => {
    expect([...ALL_STATUSES].sort()).toEqual([...RequestStatusSchema.options].sort())
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([...ALL_STATUSES].sort())
  })

  it('labels withdrawn in every language', () => {
    expect(statusLabel('withdrawn', 'ru')).toBe('Отозвана')
    expect(statusLabel('withdrawn', 'kk')).toBe('Кері қайтарылды')
    expect(statusLabel('withdrawn', 'en')).toBe('Withdrawn')
    expect(STATUS_TONE.withdrawn).toBe('gray')
  })

  it('does not offer withdrawn to managers', () => {
    expect(STATUS_ORDER).not.toContain('withdrawn')
  })

  it('counts only pending and in_progress as open', () => {
    expect(ALL_STATUSES.filter(isOpenStatus)).toEqual(['pending', 'in_progress'])
  })

  it('ends the timeline of a withdrawn request after New', () => {
    expect(statusSteps('withdrawn')).toEqual(['pending', 'withdrawn'])
    expect(statusSteps('in_progress')).toEqual(['pending', 'in_progress', 'done'])
  })
})

describe('canWithdraw', () => {
  const own = { status: 'pending' as const, author_id: 'alice' }

  it('allows the author while the request is new', () => {
    expect(canWithdraw(own, 'alice')).toBe(true)
  })

  it('refuses other residents', () => {
    expect(canWithdraw(own, 'bob')).toBe(false)
  })

  it('refuses once the request has moved on', () => {
    for (const status of ['in_progress', 'done', 'withdrawn'] as const) {
      expect(canWithdraw({ ...own, status }, 'alice')).toBe(false)
    }
  })
})
