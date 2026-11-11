// Mock data for the views that are not part of the MVP yet.
// Every view using it shows the demo-data badge (<SectionHeader demo />).
//
// Language-aware: free text is `Localized` ({ ru, kk, en }) — read it with
// `useLocalize()`; statuses/kinds are codes the view labels from its own
// dictionary; dates are ISO strings for `useLocale().formatDate/…`; amounts
// are numbers for `formatMoney`.
import type { Localized } from '../i18n'

export type VoteChoice = 'yes' | 'no' | 'abstain'

// ---------------------------------------------------------------------------
// Outages

export type OutageKind = 'water' | 'electricity' | 'heating' | 'elevator'
export type OutageStatus = 'active' | 'upcoming' | 'done'

export interface MockOutage {
  id: number
  kind: OutageKind
  /** Local date-time, ISO */
  start: string
  end: string
  zone: Localized
  reason: Localized
  status: OutageStatus
}

const ALL_FLOORS: Localized = { ru: 'Все этажи', kk: 'Барлық қабаттар', en: 'All floors' }

export const MOCK_OUTAGES: MockOutage[] = [
  {
    id: 1, kind: 'water', start: '2026-09-29T09:00', end: '2026-09-29T14:00', status: 'active',
    zone: ALL_FLOORS,
    reason: {
      ru: 'Плановая проверка труб и давления',
      kk: 'Құбырлар мен қысымды жоспарлы тексеру',
      en: 'Scheduled pipe inspection and pressure testing',
    },
  },
  {
    id: 2, kind: 'electricity', start: '2026-10-05T10:00', end: '2026-10-05T13:00', status: 'upcoming',
    zone: { ru: 'Этажи 1–5', kk: '1–5 қабаттар', en: 'Floors 1–5' },
    reason: {
      ru: 'Замена электрощита в подвале',
      kk: 'Жертөледегі электр қалқанын ауыстыру',
      en: 'Replacing the switchboard in the basement',
    },
  },
  {
    id: 3, kind: 'heating', start: '2026-10-01T00:00', end: '2026-10-03T00:00', status: 'upcoming',
    zone: ALL_FLOORS,
    reason: {
      ru: 'Промывка системы отопления перед началом сезона',
      kk: 'Маусым алдында жылыту жүйесін шаю',
      en: 'Flushing the heating system before the season starts',
    },
  },
  {
    id: 4, kind: 'elevator', start: '2026-09-22T08:00', end: '2026-09-22T17:00', status: 'done',
    zone: { ru: 'Подъезд Б', kk: 'Б кіреберісі', en: 'Entrance B' },
    reason: {
      ru: 'Ежегодная проверка безопасности лифта',
      kk: 'Лифт қауіпсіздігін жыл сайынғы тексеру',
      en: 'Annual lift safety inspection',
    },
  },
]

// ---------------------------------------------------------------------------
// Emergency alerts

export type AlertLevel = 'warning' | 'danger' | 'info'

export interface MockAlert {
  id: number
  time: string
  level: AlertLevel
  title: Localized
  body: Localized
}

export const MOCK_ALERTS: MockAlert[] = [
  {
    id: 1, time: '2026-09-29T08:45', level: 'warning',
    title: { ru: 'Отключение воды', kk: 'Су өшірілді', en: 'Water outage' },
    body: {
      ru: 'Горячая и холодная вода отключены до 14:00. Причина: плановая проверка давления в трубах.',
      kk: 'Ыстық және суық су 14:00-ге дейін өшірілді. Себебі — құбырлардағы қысымды жоспарлы тексеру.',
      en: 'Hot and cold water are off until 14:00. Reason: a scheduled pipe pressure check.',
    },
  },
  {
    id: 2, time: '2026-09-15T19:10', level: 'danger',
    title: { ru: 'Задымление в подвале', kk: 'Жертөледе түтін', en: 'Smoke in the basement' },
    body: {
      ru: 'Пожарная служба выезжала на ложное срабатывание датчика в подвале. Угрозы нет.',
      kk: 'Жертөледегі датчик жалған іске қосылғандықтан, өрт сөндіру қызметі келді. Қауіп жоқ.',
      en: 'The fire service responded to a false sensor alarm in the basement. There is no danger.',
    },
  },
  {
    id: 3, time: '2026-09-01T07:00', level: 'info',
    title: { ru: 'Отопительный сезон', kk: 'Жылыту маусымы', en: 'Heating season' },
    body: {
      ru: 'С 1 октября начинается отопительный сезон. Системы запустят в срок.',
      kk: '1 қазаннан бастап жылыту маусымы басталады. Жүйелер уақытында іске қосылады.',
      en: 'The heating season starts on 1 October. The heating will be switched on as scheduled.',
    },
  },
]

// ---------------------------------------------------------------------------
// Neighbour complaints

export type ComplaintStatus = 'review' | 'resolved' | 'closed'

export interface MockComplaint {
  id: number
  /** Flat numbers are identifiers, not translated. */
  fromFlat: string
  /** null = a common area, not a flat */
  aboutFlat: string | null
  subject: Localized
  status: ComplaintStatus
  /** ISO date */
  date: string
}

export const MOCK_COMPLAINTS: MockComplaint[] = [
  {
    id: 1, fromFlat: '12A', aboutFlat: '13A', status: 'review', date: '2026-09-26',
    subject: { ru: 'Шум после 23:00', kk: '23:00-ден кейінгі шу', en: 'Noise after 23:00' },
  },
  {
    id: 2, fromFlat: '8C', aboutFlat: '8B', status: 'resolved', date: '2026-09-19',
    subject: { ru: 'Сигаретный дым в общем коридоре', kk: 'Ортақ дәліздегі темекі түтіні', en: 'Cigarette smoke in the shared hallway' },
  },
  {
    id: 3, fromFlat: '3B', aboutFlat: null, status: 'closed', date: '2026-09-12',
    subject: { ru: 'Собака без поводка в лифте', kk: 'Лифтте қарғыбаусыз ит', en: 'Dog off its lead in the lift' },
  },
]

// ---------------------------------------------------------------------------
// Voting

export type VoteStatus = 'open' | 'closed'

export interface MockVote {
  id: number
  title: Localized
  /** ISO date */
  deadline: string
  status: VoteStatus
  yes: number
  no: number
  abstain: number
  total: number
  voted: boolean
  myVote?: VoteChoice
}

export const MOCK_VOTES: MockVote[] = [
  {
    id: 1, deadline: '2026-10-10', status: 'open', yes: 42, no: 11, abstain: 5, total: 80, voted: false,
    title: {
      ru: 'Установить камеры видеонаблюдения во всех подъездах',
      kk: 'Барлық кіреберіске бейнебақылау камераларын орнату',
      en: 'Install CCTV cameras in all entrances',
    },
  },
  {
    id: 2, deadline: '2026-10-15', status: 'open', yes: 31, no: 22, abstain: 8, total: 80, voted: true, myVote: 'yes',
    title: {
      ru: 'Увеличить уборку общих зон до 3 раз в неделю',
      kk: 'Ортақ аумақтарды аптасына 3 рет тазалау',
      en: 'Increase cleaning of common areas to 3 times a week',
    },
  },
  {
    id: 3, deadline: '2026-09-20', status: 'closed', yes: 55, no: 18, abstain: 7, total: 80, voted: true, myVote: 'yes',
    title: {
      ru: 'Покраска фасада — утвердить статью бюджета 2026 года',
      kk: 'Үй қасбетін бояу — 2026 жылғы бюджет бабын бекіту',
      en: 'Repaint the facade — approve the 2026 budget item',
    },
  },
]

// ---------------------------------------------------------------------------
// Payments (amounts in tenge)

export type PaymentStatus = 'paid' | 'due'
export type PaymentItem = 'communal' | 'repair' | 'security' | 'cleaning'

export interface MockPayment {
  id: number
  /** 'YYYY-MM' — format with formatMonth */
  month: string
  amount: number
  status: PaymentStatus
  /** ISO date: paid on (status 'paid') or due by (status 'due') */
  date: string
  breakdown: Record<PaymentItem, number>
}

export const MOCK_PAYMENTS: MockPayment[] = [
  { id: 1, month: '2026-09', amount: 18500, status: 'paid', date: '2026-09-05', breakdown: { communal: 8000, repair: 4500, security: 2000, cleaning: 4000 } },
  { id: 2, month: '2026-08', amount: 18500, status: 'paid', date: '2026-08-04', breakdown: { communal: 8000, repair: 4500, security: 2000, cleaning: 4000 } },
  { id: 3, month: '2026-07', amount: 16000, status: 'paid', date: '2026-07-06', breakdown: { communal: 8000, repair: 2500, security: 2000, cleaning: 3500 } },
  { id: 4, month: '2026-10', amount: 19000, status: 'due', date: '2026-10-10', breakdown: { communal: 8000, repair: 5000, security: 2000, cleaning: 4000 } },
]

export const MOCK_PAYMENT_SUMMARY = {
  flat: '14B',
  dueAmount: 19000,
  dueMonth: '2026-10',
  paidThisYear: 214500,
  paidMonths: 9,
  debt: 0,
}

// ---------------------------------------------------------------------------
// Owner: rented-out flats

export interface MockRentedFlat {
  flat: string
  tenant: Localized
  /** 'YYYY-MM' */
  since: string
  paid: boolean
  /** 'YYYY-MM' */
  nextDue: string
  requests: number
}

export const MOCK_RENTED_FLATS: MockRentedFlat[] = [
  {
    flat: '14B', since: '2026-01', paid: true, nextDue: '2026-10', requests: 2,
    tenant: { ru: 'Асель Нурмагамбетова', kk: 'Әсел Нұрмағамбетова', en: 'Asel Nurmagambetova' },
  },
  {
    flat: '22A', since: '2025-03', paid: false, nextDue: '2026-09', requests: 0,
    tenant: { ru: 'Даурен Бектенов', kk: 'Дәурен Бектенов', en: 'Dauren Bektenov' },
  },
]
