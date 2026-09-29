import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Sidebar, visibleViews } from './components/Sidebar'
import { ErrorBox, Loading } from './components/ui'
import { api } from './lib/api'
import { getSupabase, supabaseConfigError } from './lib/supabase'
import { useApi } from './lib/useApi'
import type { Resident, ServiceRequest, View } from './types'
import { AlertsView } from './views/AlertsView'
import { ChannelView } from './views/ChannelView'
import { ComplaintsView } from './views/ComplaintsView'
import { DashboardView } from './views/DashboardView'
import { FlatsView } from './views/FlatsView'
import { JoinView } from './views/JoinView'
import { LoginView } from './views/LoginView'
import { NewsView } from './views/NewsView'
import { OutagesView } from './views/OutagesView'
import { OwnerView } from './views/OwnerView'
import { PaymentsView } from './views/PaymentsView'
import { ReportView } from './views/ReportView'
import { RequestDetailView } from './views/RequestDetailView'
import { RequestsView } from './views/RequestsView'
import { VotingView } from './views/VotingView'

type AuthState = { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; session: Session }

async function signOut(): Promise<void> {
  const auth = getSupabase().auth
  const { error } = await auth.signOut()
  if (error) {
    // Revoking the refresh token server-side failed; still drop the local session.
    console.error('Sign-out failed, clearing the local session only', error)
    const local = await auth.signOut({ scope: 'local' })
    if (local.error) console.error('Local sign-out failed', local.error)
  }
}

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{background:'#F6F5DC'}}>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}

// MAIN
export default function App() {
  if (supabaseConfigError !== null) {
    return <FullScreen><ErrorBox error={new Error(supabaseConfigError)} onRetry={() => window.location.reload()} /></FullScreen>
  }
  return <AuthGate />
}

function AuthGate() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    const client = getSupabase().auth
    client.getSession().then(
      ({ data, error }) => {
        if (error) console.error('Could not restore the session', error)
        // The listener below may already have reported a newer state.
        setAuth(prev => prev.status !== 'loading' ? prev
          : data.session ? { status: 'signed-in', session: data.session } : { status: 'signed-out' })
      },
      (error: unknown) => {
        console.error('Could not restore the session', error)
        setAuth({ status: 'signed-out' })
      },
    )
    const { data } = client.onAuthStateChange((_event, session) => {
      setAuth(session ? { status: 'signed-in', session } : { status: 'signed-out' })
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (auth.status === 'loading') return <FullScreen><Loading /></FullScreen>
  if (auth.status === 'signed-out') return <LoginView />
  // Keyed by user so switching accounts never shows the previous user's data.
  return <SignedIn key={auth.session.user.id} />
}

function SignedIn() {
  const { state, reload, setData } = useApi(useCallback(() => api.me(), []))

  if (state.status === 'loading') return <FullScreen><Loading /></FullScreen>
  if (state.status === 'error') {
    return (
      <FullScreen>
        <ErrorBox error={state.error} onRetry={reload} />
        <p className="text-center mt-4">
          <button onClick={() => void signOut()} className="text-[#697050] text-xs hover:text-[#1E2A0E]">← Выйти</button>
        </p>
      </FullScreen>
    )
  }
  const { resident, email } = state.data
  if (resident === null) {
    return (
      <JoinView
        email={email}
        onJoined={r => setData(me => ({ ...me, resident: r }))}
        onLogout={() => void signOut()}
      />
    )
  }
  return <Shell resident={resident} />
}

function Shell({ resident }: { resident: Resident }) {
  const [view, setView] = useState<View>('dashboard')
  const [openRequestId, setOpenRequestId] = useState<string | null>(null)
  const [changedRequest, setChangedRequest] = useState<ServiceRequest | null>(null)

  const allowed = visibleViews(resident)
  const current: View = allowed.includes(view) ? view : 'dashboard'

  function nav(v: View) {
    setView(v)
    setOpenRequestId(null)
    setChangedRequest(null)
  }

  function openRequest(id: string) {
    setView('requests')
    setOpenRequestId(id)
  }

  function render(v: View): ReactNode {
    switch (v) {
      case 'dashboard': return <DashboardView resident={resident} onNav={nav} onOpenRequest={openRequest} />
      case 'news': return <NewsView resident={resident} />
      case 'channel': return <ChannelView resident={resident} />
      case 'report': return <ReportView onOpenRequest={openRequest} />
      case 'requests':
        // The list stays mounted (hidden) under an open request, so going back
        // keeps its tab and the pages already loaded.
        return (
          <>
            <div hidden={openRequestId !== null}>
              <RequestsView resident={resident} onOpenRequest={openRequest} changed={changedRequest} />
            </div>
            {openRequestId !== null && (
              <RequestDetailView key={openRequestId} id={openRequestId} resident={resident}
                onBack={() => setOpenRequestId(null)} onChanged={setChangedRequest} />
            )}
          </>
        )
      case 'flats': return <FlatsView />
      case 'outages': return <OutagesView />
      case 'alerts': return <AlertsView />
      case 'complaints': return <ComplaintsView />
      case 'voting': return <VotingView />
      case 'payments': return <PaymentsView />
      case 'owner': return <OwnerView />
    }
  }

  return (
    <div className="flex min-h-screen" style={{background:'#F6F5DC'}}>
      <Sidebar current={current} onNav={nav} resident={resident} onLogout={() => void signOut()} />
      <main className="flex-1 p-6 overflow-auto max-w-5xl">
        {render(current)}
      </main>
    </div>
  )
}
