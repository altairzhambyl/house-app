// Typed client for the FastAPI backend (/api, proxied by Vite in dev).
// Attaches the Supabase access token, turns non-2xx responses into ApiError,
// and validates every response body against the contract schemas in types.ts.
import { z } from 'zod'
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

export class ApiError extends Error {
  readonly status: number
  readonly detail: string

  constructor(status: number, detail: string) {
    super(`${status}: ${detail}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
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
  if (error) throw new ApiError(401, `Could not read the session: ${error.message}`)
  return data.session?.access_token ?? null
}

// A 401 means the session is gone or rejected: drop it locally so App's
// auth listener sends the user back to the login screen.
async function handleUnauthorized(): Promise<void> {
  const { error } = await getSupabase().auth.signOut({ scope: 'local' })
  if (error) console.error('Local sign-out after 401 failed', error)
}

type Body = { json: unknown } | { form: FormData } | undefined

async function call<S extends z.ZodType>(
  schema: S,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  path: string,
  body?: Body,
): Promise<z.infer<S>> {
  const token = await accessToken()
  if (token === null) {
    await handleUnauthorized()
    throw new ApiError(401, 'Not signed in')
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  let payload: BodyInit | undefined
  if (body && 'json' in body) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body.json)
  } else if (body && 'form' in body) {
    // No Content-Type: the browser sets multipart/form-data with the boundary.
    payload = body.form
  }

  let response: Response
  try {
    response = await fetch(path, { method, headers, body: payload })
  } catch (cause) {
    // fetch only rejects on network failure; status 0 marks "no response at all".
    console.error(`${method} ${path} failed without a response`, cause)
    throw new ApiError(0, 'Сервер недоступен. Проверьте соединение и что API запущен.')
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
    throw new ApiError(response.status, `Unexpected response from ${method} ${path}`)
  }
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    console.error(`Unexpected response shape from ${method} ${path}`, parsed.error.issues, data)
    throw new ApiError(response.status, `Unexpected response from ${method} ${path}`)
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

  uploadRequestPhoto: (id: string, photo: File): Promise<ServiceRequest> => {
    const form = new FormData()
    form.append('photo', photo)
    return call(ServiceRequestSchema, 'PUT', `/api/requests/${encodeURIComponent(id)}/photo`, { form })
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

// User-facing text for any error thrown by the calls above.
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.detail
  if (error instanceof Error) return error.message
  return String(error)
}
