// ITP-51: how the news list from GET /api/announcements is split for display.
import type { Announcement, Role } from '../types'

export interface NewsSections {
  // Manager: resident posts waiting for review. Resident: their own posts that
  // are not published (pending or rejected) - the API returns no one else's.
  review: Announcement[]
  // Published news, newest first.
  feed: Announcement[]
}

export function splitNews(items: Announcement[], role: Role): NewsSections {
  const feed = items.filter(n => n.status === 'published')
  const review = role === 'manager'
    ? items.filter(n => n.status === 'pending')
    : items.filter(n => n.status !== 'published')
  return { review, feed }
}

/** Replace one post in the list (after approve/reject), keeping the order. */
export function replaceNews(items: Announcement[], updated: Announcement): Announcement[] {
  return items.map(n => (n.id === updated.id ? updated : n))
}
