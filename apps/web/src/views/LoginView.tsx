import { useState, type FormEvent, type ReactNode } from 'react'
import { getSupabase } from '../lib/supabase'

export const fieldCls =
  'w-full bg-white border border-[#D6D3A8] text-[#1E2A0E] placeholder-[#B0AD88] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#2C4A1A]'
export const fieldLabelCls = 'text-[#697050] text-xs font-mono uppercase tracking-wider block mb-1.5'

const MIN_PASSWORD = 6 // GoTrue's default minimum

// Shared two-panel frame for the login and join screens.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#2C4A1A] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] p-12 border-r border-white/10">
        <div>
          <div className="text-white/60 text-xs font-mono tracking-widest uppercase mb-12">ЖК Управление</div>
          <h1 className="text-white text-5xl font-bold leading-tight mb-4">
            Ваш дом.<br />Ваш голос.
          </h1>
          <p className="text-white/60 text-base leading-relaxed">
            Единый портал для жильцов жилого комплекса — заявки, новости, голосования и платежи в одном месте.
          </p>
        </div>
        <div className="text-white/30 text-xs font-mono">
          Алматы · Казахстан · 2026
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F6F5DC]">
        <div className="w-full max-w-sm">
          <div className="text-[#697050] text-xs font-mono tracking-widest uppercase mb-8 lg:hidden">ЖК Управление</div>
          {children}
        </div>
      </div>
    </div>
  )
}

// login
export function LoginView() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    const trimmed = email.trim()
    if (!trimmed.includes('@')) { setError('Введите корректный email'); return }
    if (password.length < MIN_PASSWORD) { setError(`Пароль должен содержать минимум ${MIN_PASSWORD} символов`); return }

    setBusy(true)
    try {
      const auth = getSupabase().auth
      if (mode === 'signin') {
        const { error: err } = await auth.signInWithPassword({ email: trimmed, password })
        if (err) setError(err.message === 'Invalid login credentials' ? 'Неверный email или пароль' : err.message)
        // On success App's auth listener switches the screen.
      } else {
        const { data, error: err } = await auth.signUp({ email: trimmed, password })
        if (err) setError(err.message)
        else if (!data.session) setNotice('Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next: 'signin' | 'signup') {
    setMode(next)
    setError('')
    setNotice('')
  }

  return (
    <AuthLayout>
      <h2 className="text-[#1E2A0E] text-2xl font-bold mb-1">{mode === 'signin' ? 'Вход в систему' : 'Регистрация'}</h2>
      <p className="text-[#697050] text-sm mb-6">
        {mode === 'signin' ? 'Войдите в личный кабинет жильца' : 'После регистрации введите код квартиры от управляющего'}
      </p>

      <div className="flex gap-1 mb-6 bg-white border border-[#D6D3A8] rounded-md p-1">
        {(['signin', 'signup'] as const).map(m => (
          <button key={m} type="button"
            onClick={() => switchMode(m)}
            className={`flex-1 px-4 py-1.5 rounded text-sm font-medium transition-colors ${mode === m ? 'bg-[#2C4A1A] text-white' : 'text-[#697050] hover:text-[#1E2A0E]'}`}
          >{m === 'signin' ? 'Вход' : 'Регистрация'}</button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className={fieldLabelCls}>Email</label>
          <input
            id="email"
            className={fieldCls}
            placeholder="zhanar@example.kz"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className={fieldLabelCls}>Пароль</label>
          <input
            id="password"
            className={fieldCls}
            placeholder="Введите пароль"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-red-600 text-xs" role="alert">{error}</p>}
        {notice && <p className="text-emerald-700 text-xs">{notice}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[#2C4A1A] hover:bg-[#3A6022] disabled:opacity-60 text-white font-semibold rounded-md py-2.5 text-sm transition-colors mt-2"
        >
          {busy ? 'Подождите…' : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
        </button>
      </form>

      <p className="text-[#697050] text-xs text-center mt-6">
        Нет кода квартиры? Обратитесь к управляющему комплекса.
      </p>
      {import.meta.env.DEV && (
        <p className="text-[#697050] text-[11px] font-mono text-center mt-3">
          Демо: resident@demo.test / manager@demo.test · demo-password
        </p>
      )}
    </AuthLayout>
  )
}
