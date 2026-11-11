// Localized labels and Intl formatting for API values.
// Components should use `useLocale()` from '../i18n', which binds these to
// the selected language; the `lang` argument defaults to it for old callers.
import {
  LOCALES,
  defineMessages,
  getCurrentLanguage,
  translate,
  type Language,
} from '../i18n/core'
import type { RequestCategory, RequestStatus } from '../types'

export const statusMessages = defineMessages({
  ru: { pending: 'Новая', in_progress: 'В работе', done: 'Выполнена' },
  kk: { pending: 'Жаңа', in_progress: 'Орындалуда', done: 'Орындалды' },
  en: { pending: 'New', in_progress: 'In progress', done: 'Done' },
})

export const categoryMessages = defineMessages({
  ru: {
    plumbing: 'Сантехника',
    electrical: 'Электрика',
    locksmith: 'Замок / Дверь',
    sanitation: 'Мусоропровод',
    cleaning: 'Уборка',
    other: 'Другое',
  },
  kk: {
    plumbing: 'Сантехника',
    electrical: 'Электрика',
    locksmith: 'Құлып / Есік',
    sanitation: 'Қоқыс құбыры',
    cleaning: 'Тазалау',
    other: 'Басқа',
  },
  en: {
    plumbing: 'Plumbing',
    electrical: 'Electrical',
    locksmith: 'Locks and doors',
    sanitation: 'Rubbish chute',
    cleaning: 'Cleaning',
    other: 'Other',
  },
})

export function statusLabel(status: RequestStatus, lang: Language = getCurrentLanguage()): string {
  return translate(statusMessages, lang, status)
}

export function categoryLabel(category: RequestCategory, lang: Language = getCurrentLanguage()): string {
  return translate(categoryMessages, lang, category)
}

export type Tone = 'amber' | 'blue' | 'green' | 'red' | 'gray'

/** Badge colour per request status (pass as `<Badge tone={...} />`). */
export const STATUS_TONE: Record<RequestStatus, Tone> = {
  pending: 'amber',
  in_progress: 'blue',
  done: 'green',
}

export const STATUS_ORDER: RequestStatus[] = ['pending', 'in_progress', 'done']

export const CATEGORY_ORDER: RequestCategory[] = ['plumbing', 'electrical', 'locksmith', 'sanitation', 'cleaning', 'other']

// Legacy adapters: read the label in the language selected at call time.
// Prefer `useLocale().statusLabel / categoryLabel`.
function liveLabels<K extends string>(keys: readonly K[], label: (k: K) => string): Record<K, string> {
  const target = {} as Record<K, string>
  for (const k of keys) Object.defineProperty(target, k, { get: () => label(k), enumerable: true })
  return target
}
/** @deprecated use `useLocale().statusLabel(status)` */
export const STATUS_LABELS: Record<RequestStatus, string> = liveLabels(STATUS_ORDER, s => statusLabel(s))
/** @deprecated use `useLocale().categoryLabel(category)` */
export const CATEGORY_LABELS: Record<RequestCategory, string> = liveLabels(CATEGORY_ORDER, c => categoryLabel(c))

export function requestCode(num: number): string {
  return `REQ-${String(num).padStart(3, '0')}`
}

// Intl formatters are costly to build; cache one per locale and option set.
const formatters = new Map<string, Intl.DateTimeFormat>()
function dateFormatter(lang: Language, name: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${lang}:${name}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALES[lang], options)
    formatters.set(key, f)
  }
  return f
}

const DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
const DATE_TIME: Intl.DateTimeFormatOptions = { ...DATE, hour: '2-digit', minute: '2-digit' }
const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
const MONTH: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }

// Date-only values ('2026-09', '2026-09-05') are local calendar dates; `new Date`
// would read them as UTC midnight and shift the day west of Greenwich.
function parse(iso: string): Date | null {
  const dateOnly = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(iso)
  const d = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3] ?? '1'))
    : new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(iso: string, lang: Language = getCurrentLanguage()): string {
  const d = parse(iso)
  return d ? dateFormatter(lang, 'date', DATE).format(d) : iso
}

export function formatDateTime(iso: string, lang: Language = getCurrentLanguage()): string {
  const d = parse(iso)
  return d ? dateFormatter(lang, 'datetime', DATE_TIME).format(d) : iso
}

export function formatTime(iso: string, lang: Language = getCurrentLanguage()): string {
  const d = parse(iso)
  return d ? dateFormatter(lang, 'time', TIME).format(d) : iso
}

export function formatMonth(isoMonth: string, lang: Language = getCurrentLanguage()): string {
  const d = parse(isoMonth)
  return d ? dateFormatter(lang, 'month', MONTH).format(d) : isoMonth
}

// Time only for today's messages, full date+time otherwise.
export function formatMessageTime(iso: string, lang: Language = getCurrentLanguage()): string {
  const d = parse(iso)
  if (!d) return iso
  return d.toDateString() === new Date().toDateString() ? formatTime(iso, lang) : formatDateTime(iso, lang)
}

const relativeFormatters = new Map<Language, Intl.RelativeTimeFormat>()
const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60], ['minute', 60], ['hour', 24], ['day', 7], ['week', 4.35], ['month', 12], ['year', Infinity],
]

/** 'только что' / '5 минут назад' / 'вчера' / 'через 2 дня' in the selected language. */
export function formatRelative(iso: string, lang: Language = getCurrentLanguage(), now: Date = new Date()): string {
  const d = parse(iso)
  if (!d) return iso
  let rtf = relativeFormatters.get(lang)
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(LOCALES[lang], { numeric: 'auto' })
    relativeFormatters.set(lang, rtf)
  }
  let value = (d.getTime() - now.getTime()) / 1000
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(value) < size) return rtf.format(Math.round(value), unit)
    value /= size
  }
  return formatDate(iso, lang)
}

export function formatNumber(n: number, lang: Language = getCurrentLanguage()): string {
  return n.toLocaleString(LOCALES[lang])
}

/** Tenge amounts: '19 000 ₸' (ru/kk) and '19,000 ₸' (en). */
export function formatMoney(amountKzt: number, lang: Language = getCurrentLanguage()): string {
  return `${formatNumber(amountKzt, lang)} ₸`
}
