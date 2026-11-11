// Read-only: these tests never create, change or delete data on production.
import { describe, expect, it } from 'vitest'

const BASE_URL = (process.env.SMOKE_URL ?? '').replace(/\/$/, '')
const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ''
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? ''
const canSignIn = Boolean(SUPABASE_URL && ANON_KEY && DEMO_PASSWORD)

if (!BASE_URL) throw new Error('SMOKE_URL is not set (e.g. https://house-app-blush.vercel.app)')
// In CI a missing secret must fail loudly, not silently skip the sign-in checks.
if (process.env.CI && !canSignIn) {
  throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY and DEMO_PASSWORD must be set in CI')
}

const get = (path: string, init?: RequestInit) => fetch(`${BASE_URL}${path}`, init)

async function signIn(email: string, password: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

describe('site', () => {
  it('serves the app shell', async () => {
    const res = await get('/')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('<div id="root">')
  })

  it('serves deep links as the SPA, not a 404', async () => {
    const res = await get('/requests/some-id', { headers: { Accept: 'text/html' } })
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<div id="root">')
  })
})

describe('api', () => {
  it('is healthy and connected to Supabase', async () => {
    const res = await get('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'ok', supabase: 'configured' })
  })

  it.each(['/api/me', '/api/requests', '/api/flats', '/api/announcements'])(
    'rejects %s without a token',
    async path => {
      expect((await get(path)).status).toBe(401)
    },
  )

  it('rejects a forged token', async () => {
    const res = await get('/api/me', { headers: { Authorization: 'Bearer not-a-real-token' } })
    expect(res.status).toBe(401)
  })
})

describe.skipIf(!canSignIn)('demo accounts', () => {
  it('refuses the old public demo password', async () => {
    const res = await signIn('resident@demo.test', 'demo-password')
    expect(res.status).toBe(400)
  })

  it('resident signs in and reads their building data', async () => {
    const token = await signIn('resident@demo.test', DEMO_PASSWORD)
    expect(token.status).toBe(200)
    const { access_token } = (await token.json()) as { access_token: string }
    const auth = { headers: { Authorization: `Bearer ${access_token}` } }

    const me = await get('/api/me', auth)
    expect(me.status).toBe(200)
    expect(await me.json()).toMatchObject({ resident: { role: 'resident' } })

    const requests = await get('/api/requests?limit=1', auth)
    expect(requests.status).toBe(200)
    expect(Array.isArray(await requests.json())).toBe(true)

    // A resident is not a manager.
    expect((await get('/api/flats', auth)).status).toBe(403)
  })

  it('manager signs in and sees flats', async () => {
    const token = await signIn('manager@demo.test', DEMO_PASSWORD)
    expect(token.status).toBe(200)
    const { access_token } = (await token.json()) as { access_token: string }
    const flats = await get('/api/flats', { headers: { Authorization: `Bearer ${access_token}` } })
    expect(flats.status).toBe(200)
    expect((await flats.json()).length).toBeGreaterThan(0)
  })
})
