// Russian labels and date formatting for API values.
import type { RequestCategory, RequestStatus } from '../types'

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Новая',
  in_progress: 'В работе',
  done: 'Выполнена',
}

export const STATUS_ORDER: RequestStatus[] = ['pending', 'in_progress', 'done']

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  plumbing: 'Сантехника',
  electrical: 'Электрика',
  locksmith: 'Замок / Дверь',
  sanitation: 'Мусоропровод',
  cleaning: 'Уборка',
  other: 'Другое',
}

export function requestCode(num: number): string {
  return `REQ-${String(num).padStart(3, '0')}`
}

const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

function parse(iso: string): Date | null {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(iso: string): string {
  const d = parse(iso)
  return d ? dateFmt.format(d) : iso
}

export function formatDateTime(iso: string): string {
  const d = parse(iso)
  return d ? dateTimeFmt.format(d) : iso
}

// Time only for today's messages, full date+time otherwise.
export function formatMessageTime(iso: string): string {
  const d = parse(iso)
  if (!d) return iso
  return d.toDateString() === new Date().toDateString() ? timeFmt.format(d) : dateTimeFmt.format(d)
}
