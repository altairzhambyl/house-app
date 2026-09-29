// Browser Supabase client: used only for Auth (sign-in, sign-up, session).
// All data goes through our FastAPI backend (lib/api.ts), never straight to
// Postgres. The anon key is public by design; the service role key must never
// reach this bundle.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url: string | undefined = import.meta.env.VITE_SUPABASE_URL
const anonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY

// Checked once at startup so a missing .env.local shows a clear screen
// instead of a blank page.
export const supabaseConfigError: string | null =
  url && anonKey
    ? null
    : 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. Copy apps/web/.env.example to apps/web/.env.local and fill it from `supabase status -o env`.'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (supabaseConfigError !== null || !url || !anonKey) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured')
  }
  client ??= createClient(url, anonKey)
  return client
}
