// Typed client for the FastAPI backend (/api, proxied by Vite in dev).
// Attaches the Supabase access token, turns non-2xx responses into ApiError,
// and validates every response body against the contract schemas in types.ts.
import { useCallback } from 'react'
import { z } from 'zod'
import { useLanguage } from '../i18n/context'
import { defineMessages, getCurrentLanguage, translate, type Language } from '../i18n/core'
import { getSupabase } from './supabase'
import {
  AnnouncementSchema,
  FlatSchema,
  MeSchema,
  MessageSchema,
  ResidentSchema,
  ServiceRequestSchema,
  type Announcement,
  type AnnouncementCreate,
  type Flat,
  type Me,
  type Message,
  type RequestCreate,
  type RequestStatus,
  type Resident,
  type ServiceRequest,
} from '../types'

// Ticket from POST /api/requests/{id}/photo-upload (schemas.PhotoUploadOut).
const PhotoUploadSchema = z.object({ bucket: z.string(), path: z.string(), token: z.string() })

// Machine-readable cause for errors raised on the client side (no useful HTTP
// status of their own). describeError() turns these into localized text.
export type ApiErrorCode = 'network' | 'not_signed_in' | 'session' | 'bad_response' | 'storage_upload'

// Plain data: status + the server's (English) detail. Never shown as-is;
// views render it through describeError / useDescribeError / <ErrorNote>.
export class ApiError extends Error {
  readonly status: number
  readonly detail: string
  readonly code: ApiErrorCode | null

  constructor(status: number, detail: string, code: ApiErrorCode | null = null) {
    super(`${status}: ${detail}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.code = code
  }
}

// FastAPI sends {"detail": "text"} for HTTPException and
// {"detail": [{"loc": [...], "msg": "..."}]} for request validation errors.
const ErrorBodySchema = z.object({
  detail: z.union([
    z.string(),
    z.array(z.object({ msg: z.string(), loc: z.array(z.union([z.string(), z.number()])).optional() })),
  ]),
})

async function readErrorDetail(response: Response): Promise<string> {
  const text = await response.text()
  try {
    const parsed = ErrorBodySchema.safeParse(JSON.parse(text))
    if (parsed.success) {
      const { detail } = parsed.data
      return typeof detail === 'string'
        ? detail
        : detail.map(d => (d.loc ? `${d.loc.slice(1).join('.')}: ${d.msg}` : d.msg)).join('; ')
    }
  } catch {
    // Not JSON (e.g. the Vite proxy's plain-text 502 when the API is down).
  }
  return text.trim() || response.statusText || `HTTP ${response.status}`
}

async function accessToken(): Promise<string | null> {
  const { data, error } = await getSupabase().auth.getSession()
  if (error) throw new ApiError(401, `Could not read the session: ${error.message}`, 'session')
  return data.session?.access_token ?? null
}

// A 401 means the session is gone or rejected: drop it locally so App's
// auth listener sends the user back to the login screen.
async function handleUnauthorized(): Promise<void> {
  const { error } = await getSupabase().auth.signOut({ scope: 'local' })
  if (error) console.error('Local sign-out after 401 failed', error)
}

type Body = { json: unknown } | undefined

async function call<S extends z.ZodType>(
  schema: S,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  path: string,
  body?: Body,
): Promise<z.infer<S>> {
  const token = await accessToken()
  if (token === null) {
    await handleUnauthorized()
    throw new ApiError(401, 'Not signed in', 'not_signed_in')
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  let payload: BodyInit | undefined
  if (body && 'json' in body) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body.json)
  }

  let response: Response
  try {
    response = await fetch(path, { method, headers, body: payload })
  } catch (cause) {
    // fetch only rejects on network failure; status 0 marks "no response at all".
    console.error(`${method} ${path} failed without a response`, cause)
    throw new ApiError(0, `${method} ${path}: no response`, 'network')
  }
  if (!response.ok) {
    const detail = await readErrorDetail(response)
    if (response.status === 401) await handleUnauthorized()
    throw new ApiError(response.status, detail)
  }

  let data: unknown
  try {
    data = await response.json()
  } catch (cause) {
    console.error(`${method} ${path} returned a non-JSON body`, cause)
    throw new ApiError(response.status, `Unexpected response from ${method} ${path}`, 'bad_response')
  }
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    console.error(`Unexpected response shape from ${method} ${path}`, parsed.error.issues, data)
    throw new ApiError(response.status, `Unexpected response from ${method} ${path}`, 'bad_response')
  }
  return parsed.data
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

// Server-side page limit for list endpoints (le=100).
export const PAGE_LIMIT = 100

export const api = {
  me: (): Promise<Me> => call(MeSchema, 'GET', '/api/me'),

  join: (code: string, fullName: string): Promise<Resident> =>
    call(ResidentSchema, 'POST', '/api/join', { json: { code, full_name: fullName } }),

  listFlats: (): Promise<Flat[]> => call(z.array(FlatSchema), 'GET', '/api/flats'),

  rotateFlatCode: (flatId: string): Promise<Flat> =>
    call(FlatSchema, 'POST', `/api/flats/${encodeURIComponent(flatId)}/rotate-code`),

  listRequests: (opts: { mine: boolean; limit: number; offset: number }): Promise<ServiceRequest[]> =>
    call(z.array(ServiceRequestSchema), 'GET', `/api/requests${query(opts)}`),

  getRequest: (id: string): Promise<ServiceRequest> =>
    call(ServiceRequestSchema, 'GET', `/api/requests/${encodeURIComponent(id)}`),

  createRequest: (body: RequestCreate): Promise<ServiceRequest> =>
    call(ServiceRequestSchema, 'POST', '/api/requests', { json: body }),

  // Three steps so the bytes go straight to Supabase Storage, not through the API
  // (Vercel caps function bodies at 4.5 MB): get a signed upload ticket, upload,
  // then attach. The bucket enforces the size and type limits server-side.
  uploadRequestPhoto: async (id: string, photo: File): Promise<ServiceRequest> => {
    const base = `/api/requests/${encodeURIComponent(id)}`
    const ticket = await call(PhotoUploadSchema, 'POST', `${base}/photo-upload`, {
      json: { content_type: photo.type },
    })
    const { error } = await getSupabase()
      .storage.from(ticket.bucket)
      .uploadToSignedUrl(ticket.path, ticket.token, photo, { contentType: photo.type })
    if (error) {
      console.error(`Photo upload to storage failed for request ${id}`, error)
      throw new ApiError(502, error.message, 'storage_upload')
    }
    return call(ServiceRequestSchema, 'PUT', `${base}/photo`, { json: { path: ticket.path } })
  },

  setRequestStatus: (id: string, status: RequestStatus): Promise<ServiceRequest> =>
    call(ServiceRequestSchema, 'PATCH', `/api/requests/${encodeURIComponent(id)}`, { json: { status } }),

  listAnnouncements: (): Promise<Announcement[]> =>
    call(z.array(AnnouncementSchema), 'GET', '/api/announcements'),

  createAnnouncement: (body: AnnouncementCreate): Promise<Announcement> =>
    call(AnnouncementSchema, 'POST', '/api/announcements', { json: body }),

  // Newest first. `before` pages backwards through older messages.
  listMessages: (opts: { limit: number; before?: string }): Promise<Message[]> =>
    call(z.array(MessageSchema), 'GET', `/api/messages${query(opts)}`),

  postMessage: (body: string): Promise<Message> =>
    call(MessageSchema, 'POST', '/api/messages', { json: { body } }),
}

// Every request (all pages), newest first. Used where a count or filter must
// cover the whole list, not just the first page.
export async function listAllRequests(mine: boolean): Promise<ServiceRequest[]> {
  const all: ServiceRequest[] = []
  for (let offset = 0; ; offset += PAGE_LIMIT) {
    const page = await api.listRequests({ mine, limit: PAGE_LIMIT, offset })
    all.push(...page)
    if (page.length < PAGE_LIMIT) return all
  }
}

// ---------------------------------------------------------------------------
// Localized error text

const errorMessages = defineMessages({
  ru: {
    network: 'Сервер недоступен. Проверьте подключение к интернету и попробуйте ещё раз.',
    not_signed_in: 'Сессия завершена. Войдите снова.',
    session: 'Не удалось прочитать сессию. Войдите снова.',
    bad_response: 'Сервер вернул неожиданный ответ. Попробуйте позже.',
    storage_upload: 'Не удалось загрузить фото. Попробуйте ещё раз.',
    s400: 'Запрос не принят. Проверьте введённые данные.',
    s401: 'Сессия истекла. Войдите снова.',
    s403: 'Недостаточно прав для этого действия.',
    s404: 'Не найдено. Возможно, запись удалена.',
    s409: 'Данные уже изменились. Обновите страницу.',
    s413: 'Файл слишком большой.',
    s422: 'Проверьте введённые данные.',
    s429: 'Слишком много запросов. Подождите немного и повторите.',
    s5xx: 'Ошибка на сервере. Попробуйте позже.',
    other4xx: 'Запрос не выполнен.',
    unknown: 'Что-то пошло не так. Попробуйте ещё раз.',
  },
  kk: {
    network: 'Серверге қосылу мүмкін болмады. Интернет байланысын тексеріп, қайта көріңіз.',
    not_signed_in: 'Сессия аяқталды. Қайта кіріңіз.',
    session: 'Сессияны оқу мүмкін болмады. Қайта кіріңіз.',
    bad_response: 'Сервер күтпеген жауап қайтарды. Кейінірек қайталап көріңіз.',
    storage_upload: 'Фотоны жүктеу мүмкін болмады. Қайта көріңіз.',
    s400: 'Сұраныс қабылданбады. Енгізілген деректерді тексеріңіз.',
    s401: 'Сессия мерзімі өтті. Қайта кіріңіз.',
    s403: 'Бұл әрекетке құқығыңыз жеткіліксіз.',
    s404: 'Табылмады. Жазба жойылған болуы мүмкін.',
    s409: 'Деректер өзгеріп кеткен. Бетті жаңартыңыз.',
    s413: 'Файл тым үлкен.',
    s422: 'Енгізілген деректерді тексеріңіз.',
    s429: 'Сұраныстар тым көп. Біраз күтіп, қайталаңыз.',
    s5xx: 'Сервер қатесі. Кейінірек қайталап көріңіз.',
    other4xx: 'Сұраныс орындалмады.',
    unknown: 'Бірдеңе дұрыс болмады. Қайта көріңіз.',
  },
  en: {
    network: 'Can’t reach the server. Check your internet connection and try again.',
    not_signed_in: 'Your session has ended. Please sign in again.',
    session: 'Couldn’t read your session. Please sign in again.',
    bad_response: 'The server sent an unexpected response. Please try again later.',
    storage_upload: 'Couldn’t upload the photo. Please try again.',
    s400: 'The server rejected this. Check what you entered.',
    s401: 'Your session has expired. Please sign in again.',
    s403: 'You do not have permission to do this.',
    s404: 'Not found. It may have been deleted.',
    s409: 'The data has changed since you opened it. Refresh the page.',
    s413: 'The file is too large.',
    s422: 'Check what you entered.',
    s429: 'Too many attempts. Wait a moment and try again.',
    s5xx: 'Server error. Please try again later.',
    other4xx: 'That didn’t work. Please try again.',
    unknown: 'Something went wrong. Please try again.',
  },
})

export interface ErrorDescription {
  /** Localized, always shown. */
  message: string
  /** Raw server/library text (usually English) for a secondary "details" line; null when it adds nothing. */
  detail: string | null
}

/** Per-view replacements, keyed by HTTP status or ApiErrorCode, e.g. `{ 404: t('codeNotFound') }`. */
export type ErrorOverrides = Partial<Record<number | ApiErrorCode, string>>

const MAX_DETAIL = 200

function clip(text: string): string | null {
  const s = text.trim()
  if (!s) return null
  return s.length > MAX_DETAIL ? `${s.slice(0, MAX_DETAIL)}…` : s
}

function statusKey(status: number): keyof (typeof errorMessages)['ru'] {
  switch (status) {
    case 0: return 'network'
    case 400: return 's400'
    case 401: return 's401'
    case 403: return 's403'
    case 404: return 's404'
    case 409: return 's409'
    case 413: return 's413'
    case 422: return 's422'
    case 429: return 's429'
  }
  if (status >= 500) return 's5xx'
  if (status >= 400) return 'other4xx'
  return 'unknown'
}

/** Localized text for any error thrown by the calls above (or anything else). */
export function describeError(
  error: unknown,
  lang: Language = getCurrentLanguage(),
  overrides?: ErrorOverrides,
): ErrorDescription {
  const t = (key: keyof (typeof errorMessages)['ru']) => translate(errorMessages, lang, key)
  if (error instanceof ApiError) {
    const override = (error.code !== null ? overrides?.[error.code] : undefined) ?? overrides?.[error.status]
    // A view-specific message already explains the case; the raw detail would only repeat it in English.
    if (override !== undefined) return { message: override, detail: null }
    if (error.code !== null) {
      // Client-side codes: only the storage failure carries a useful detail.
      return { message: t(error.code), detail: error.code === 'storage_upload' ? clip(error.detail) : null }
    }
    const hideDetail = error.status === 0 || error.status === 401
    return { message: t(statusKey(error.status)), detail: hideDetail ? null : clip(error.detail) }
  }
  if (error instanceof Error) return { message: t('unknown'), detail: clip(error.message) }
  return { message: t('unknown'), detail: clip(String(error)) }
}

/** `const describe = useDescribeError(); describe(err, { 404: t('notFound') }).message` */
export function useDescribeError(): (error: unknown, overrides?: ErrorOverrides) => ErrorDescription {
  const { lang } = useLanguage()
  return useCallback((error: unknown, overrides?: ErrorOverrides) => describeError(error, lang, overrides), [lang])
}

/**
 * @deprecated Use <ErrorNote error={...} /> or useDescribeError(). Kept for old
 * callers: returns the localized message (current language) with the detail
 * in parentheses.
 */
export function errorMessage(error: unknown): string {
  const { message, detail } = describeError(error)
  return detail ? `${message} (${detail})` : message
}
