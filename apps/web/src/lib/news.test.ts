import { describe, expect, it } from 'vitest'
import type { Announcement, AnnouncementStatus } from '../types'
import { replaceNews, splitNews } from './news'

function news(id: string, status: AnnouncementStatus): Announcement {
  return {
    id,
    building_id: 'b',
    author_id: 'a',
    title: id,
    body: 'text',
    created_at: '2026-11-12T10:00:00+00:00',
    status,
    reject_reason: null,
    reviewed_at: null,
    is_official: false,
    author_flat_number: '14B',
  }
}

const items = [news('p', 'pending'), news('ok', 'published'), news('no', 'rejected')]

describe('splitNews', () => {
  it('gives managers the pending queue and hides rejected posts', () => {
    const { review, feed } = splitNews(items, 'manager')
    expect(review.map(n => n.id)).toEqual(['p'])
    expect(feed.map(n => n.id)).toEqual(['ok'])
  })

  it('shows residents their own pending and rejected posts apart from the feed', () => {
    const { review, feed } = splitNews(items, 'resident')
    expect(review.map(n => n.id)).toEqual(['p', 'no'])
    expect(feed.map(n => n.id)).toEqual(['ok'])
  })
})

describe('replaceNews', () => {
  it('swaps the reviewed post in place', () => {
    const approved = { ...items[0], status: 'published' as const }
    expect(replaceNews(items, approved).map(n => [n.id, n.status])).toEqual([
      ['p', 'published'],
      ['ok', 'published'],
      ['no', 'rejected'],
    ])
  })
})
