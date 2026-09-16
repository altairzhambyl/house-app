import { useEffect, useState } from 'react'
import './App.css'

type Health = { status: string; service: string }

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; health: Health }
  | { kind: 'error'; message: string }

function App() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/health', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`)
        return (await res.json()) as Health
      })
      .then((health) => setState({ kind: 'ok', health }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
      })

    return () => controller.abort()
  }, [])

  return (
    <main>
      <h1>house-app</h1>
      <p>Resident ↔ management app for residential complexes.</p>
      <section>
        <h2>Backend</h2>
        {state.kind === 'loading' && <p>Checking API…</p>}
        {state.kind === 'ok' && (
          <p>
            Connected to <code>{state.health.service}</code> — status{' '}
            <strong>{state.health.status}</strong>
          </p>
        )}
        {state.kind === 'error' && (
          <p>
            Cannot reach the API: {state.message}
            <br />
            Is the backend running on port 8000?
          </p>
        )}
      </section>
    </main>
  )
}

export default App
