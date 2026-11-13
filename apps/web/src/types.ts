// API contract types. The schemas double as runtime checks: every response is
// parsed through them in lib/api.ts, so a backend/frontend mismatch fails loudly
// with a clear error instead of rendering `undefined`.
//
// Ids and timestamps are plain strings on purpose: the seed uses non-RFC UUIDs
// (…b001) and FastAPI emits offsets like +00:00, which strict validators reject.
import { z } from 'zod'

export const RoleSchema = z.enum(['resident', 'manager'])
export type Role = z.infer<typeof RoleSchema>

// Mirrors the Postgres enum public.request_status. 'withdrawn' is final (ITP-53).
export const RequestStatusSchema = z.enum(['pending', 'in_progress', 'done', 'withdrawn'])
export type RequestStatus = z.infer<typeof RequestStatusSchema>

// Mirrors the Postgres enum public.request_category.
export const RequestCategorySchema = z.enum([
  'plumbing',
  'electrical',
  'locksmith',
  'sanitation',
  'cleaning',
  'other',
])
export type RequestCategory = z.infer<typeof RequestCategorySchema>

export const ResidentSchema = z.object({
  id: z.string(),
  building_id: z.string(),
  building_name: z.string(),
  flat_id: z.string().nullable(),
  flat_number: z.string().nullable(),
  full_name: z.string(),
  role: RoleSchema,
})
export type Resident = z.infer<typeof ResidentSchema>

export const MeSchema = z.object({
  user_id: z.string(),
  email: z.string().nullable(),
  // null = signed in but not linked to a flat yet -> Join screen.
  resident: ResidentSchema.nullable(),
})
export type Me = z.infer<typeof MeSchema>

export const FlatSchema = z.object({
  id: z.string(),
  number: z.string(),
  join_code: z.string(),
  resident_count: z.number().int(),
})
export type Flat = z.infer<typeof FlatSchema>

// An active resident of a flat, as its building's manager sees them (schemas.FlatResidentOut).
export const FlatResidentSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  created_at: z.string(),
})
export type FlatResident = z.infer<typeof FlatResidentSchema>

export const RequestEventSchema = z.object({
  status: RequestStatusSchema,
  at: z.string(),
  actor_name: z.string(),
})
export type RequestEvent = z.infer<typeof RequestEventSchema>

export const ServiceRequestSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  building_id: z.string(),
  flat_id: z.string(),
  flat_number: z.string(),
  author_id: z.string(),
  author_name: z.string(),
  category: RequestCategorySchema,
  description: z.string(),
  location: z.string().nullable(),
  status: RequestStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  has_photo: z.boolean(),
  // Short-lived signed URL; only filled on the single-request endpoint.
  photo_url: z.string().nullable().optional(),
  // Oldest first; only on GET/PATCH /api/requests/{id}.
  history: z.array(RequestEventSchema).optional(),
})
export type ServiceRequest = z.infer<typeof ServiceRequestSchema>

// ITP-51: a resident's post is 'pending' until a manager approves or rejects it.
export const AnnouncementStatusSchema = z.enum(['pending', 'published', 'rejected'])
export type AnnouncementStatus = z.infer<typeof AnnouncementStatusSchema>

export const AnnouncementSchema = z.object({
  id: z.string(),
  building_id: z.string(),
  author_id: z.string(),
  title: z.string(),
  body: z.string(),
  created_at: z.string(),
  status: AnnouncementStatusSchema,
  // Only on rejected posts (seen by their author and managers).
  reject_reason: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  // True: from the management company. False: from a resident, labelled by flat only.
  is_official: z.boolean(),
  author_flat_number: z.string().nullable(),
})
export type Announcement = z.infer<typeof AnnouncementSchema>

export const MessageSchema = z.object({
  id: z.string(),
  author_id: z.string(),
  author_name: z.string(),
  flat_number: z.string().nullable(),
  role: RoleSchema,
  body: z.string(),
  created_at: z.string(),
})
export type Message = z.infer<typeof MessageSchema>

export interface RequestCreate {
  category: RequestCategory
  description: string
  location: string | null
}

export interface AnnouncementCreate {
  title: string
  body: string
}

export type View =
  | 'dashboard'
  | 'news'
  | 'channel'
  | 'report'
  | 'requests'
  | 'flats'
  | 'outages'
  | 'alerts'
  | 'complaints'
  | 'voting'
  | 'payments'
  | 'owner'

// Polls (ITP-40, ITP-55). Mirrors schemas.PollOut / PollCreate.
export const PollStatusSchema = z.enum(['proposed', 'open', 'rejected', 'closed'])
export type PollStatus = z.infer<typeof PollStatusSchema>

export const PollChoiceSchema = z.enum(['for', 'against', 'abstain'])
export type PollChoice = z.infer<typeof PollChoiceSchema>

export const PollSchema = z.object({
  id: z.string(),
  building_id: z.string(),
  author_id: z.string(),
  author_name: z.string(),
  question: z.string(),
  description: z.string().nullable(),
  ends_at: z.string(),
  // 'closed' also when an open poll's end date has passed.
  status: PollStatusSchema,
  reject_reason: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  created_at: z.string(),
  votes_for: z.number().int(),
  votes_against: z.number().int(),
  votes_abstain: z.number().int(),
  votes_total: z.number().int(),
  // Active residents of the building (who may vote).
  eligible_voters: z.number().int(),
  my_choice: PollChoiceSchema.nullable(),
})
export type Poll = z.infer<typeof PollSchema>

export interface PollCreate {
  question: string
  description: string | null
  /** ISO 8601 with offset */
  ends_at: string
}
