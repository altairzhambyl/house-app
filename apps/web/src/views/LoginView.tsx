import { useState, type FormEvent, type ReactNode } from 'react'
import { LanguageSwitcher, defineMessages, useT, type Vars } from '../i18n'
import { getSupabase } from '../lib/supabase'

export const fieldCls =
  'w-full bg-white border border-[#D6D3A8] text-[#1E2A0E] placeholder-[#B0AD88] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#2C4A1A]'
export const fieldLabelCls = 'text-[#697050] text-xs font-mono uppercase tracking-wider block mb-1.5'

const MIN_PASSWORD = 6 // GoTrue's default minimum

const layoutMessages = defineMessages({
  ru: {
    appName: 'ЖК Управление',
    heroLine1: 'Ваш дом.',
    heroLine2: 'Ваш голос.',
    heroText: 'Единый портал для жильцов жилого комплекса — заявки, новости, голосования и платежи в одном месте.',
    place: 'Алматы · Казахстан · 2026',
  },
  kk: {
    appName: 'ТК Басқару',
    heroLine1: 'Сіздің үйіңіз.',
    heroLine2: 'Сіздің дауысыңыз.',
    heroText: 'Тұрғын үй кешенінің тұрғындарына арналған бірыңғай портал — өтінімдер, жаңалықтар, дауыс беру және төлемдер бір жерде.',
    place: 'Алматы · Қазақстан · 2026',
  },
  en: {
    appName: 'Residence Management',
    heroLine1: 'Your home.',
    heroLine2: 'Your voice.',
    heroText: 'Requests, news, voting and payments for your residential complex — all in one place.',
    place: 'Almaty · Kazakhstan · 2026',
  },
})

const m = defineMessages({
  ru: {
    signinTitle: 'Вход в систему',
    signupTitle: 'Регистрация',
    signinSub: 'Войдите в личный кабинет жильца',
    signupSub: 'После регистрации введите код квартиры от управляющего',
    tabSignin: 'Вход',
    tabSignup: 'Регистрация',
    tabsLabel: 'Вход или регистрация',
    email: 'Email',
    password: 'Пароль',
    passwordPlaceholder: 'Введите пароль',
    emailInvalid: 'Введите корректный email',
    passwordShort: {
      one: 'Пароль должен содержать минимум {n} символ',
      few: 'Пароль должен содержать минимум {n} символа',
      many: 'Пароль должен содержать минимум {n} символов',
      other: 'Пароль должен содержать минимум {n} символа',
    },
    invalidCredentials: 'Неверный email или пароль',
    emailNotConfirmed: 'Email не подтверждён. Перейдите по ссылке из письма.',
    userExists: 'Аккаунт с таким email уже есть. Войдите.',
    weakPassword: 'Пароль слишком простой. Придумайте более надёжный.',
    rateLimited: 'Слишком много попыток. Подождите немного и повторите.',
    network: 'Сервер авторизации недоступен. Проверьте подключение к интернету.',
    authFailed: 'Не удалось выполнить вход. Попробуйте ещё раз.',
    signupDone: 'Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите.',
    wait: 'Подождите…',
    signIn: 'Войти',
    createAccount: 'Создать аккаунт',
    noCode: 'Нет кода квартиры? Обратитесь к управляющему комплекса.',
    demo: 'Демо: {accounts} · пароль {password}',
    details: 'Подробности',
  },
  kk: {
    signinTitle: 'Жүйеге кіру',
    signupTitle: 'Тіркелу',
    signinSub: 'Тұрғынның жеке кабинетіне кіріңіз',
    signupSub: 'Тіркелгеннен кейін басқарушы берген пәтер кодын енгізіңіз',
    tabSignin: 'Кіру',
    tabSignup: 'Тіркелу',
    tabsLabel: 'Кіру немесе тіркелу',
    email: 'Электрондық пошта',
    password: 'Құпия сөз',
    passwordPlaceholder: 'Құпия сөзді енгізіңіз',
    emailInvalid: 'Электрондық поштаны дұрыс енгізіңіз',
    passwordShort: {
      one: 'Құпия сөз кемінде {n} таңбадан тұруы керек',
      other: 'Құпия сөз кемінде {n} таңбадан тұруы керек',
    },
    invalidCredentials: 'Электрондық пошта немесе құпия сөз қате',
    emailNotConfirmed: 'Электрондық пошта расталмаған. Хаттағы сілтеме бойынша өтіңіз.',
    userExists: 'Бұл электрондық поштамен аккаунт бұрыннан бар. Кіріңіз.',
    weakPassword: 'Құпия сөз тым қарапайым. Күрделірек құпия сөз ойлап табыңыз.',
    rateLimited: 'Әрекеттер тым көп. Біраз күтіп, қайталаңыз.',
    network: 'Авторизация серверіне қосылу мүмкін болмады. Интернет байланысын тексеріңіз.',
    authFailed: 'Кіру мүмкін болмады. Қайта көріңіз.',
    signupDone: 'Аккаунт жасалды. Хаттағы сілтеме бойынша электрондық поштаңызды растаңыз, содан кейін кіріңіз.',
    wait: 'Күте тұрыңыз…',
    signIn: 'Кіру',
    createAccount: 'Аккаунт жасау',
    noCode: 'Пәтер коды жоқ па? Кешен басқарушысына хабарласыңыз.',
    demo: 'Демо: {accounts} · құпия сөз {password}',
    details: 'Толығырақ',
  },
  en: {
    signinTitle: 'Sign in',
    signupTitle: 'Create an account',
    signinSub: 'Sign in to your resident account',
    signupSub: 'After signing up, enter the flat code from your manager',
    tabSignin: 'Sign in',
    tabSignup: 'Sign up',
    tabsLabel: 'Sign in or sign up',
    email: 'Email',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    emailInvalid: 'Enter a valid email address',
    passwordShort: {
      one: 'Password must be at least {n} character long',
      other: 'Password must be at least {n} characters long',
    },
    invalidCredentials: 'Incorrect email or password',
    emailNotConfirmed: 'Your email isn’t confirmed yet. Open the link we sent you.',
    userExists: 'An account with this email already exists. Sign in instead.',
    weakPassword: 'This password is too weak. Choose a stronger one.',
    rateLimited: 'Too many attempts. Wait a moment and try again.',
    network: 'Can’t reach the sign-in server. Check your internet connection.',
    authFailed: 'Couldn’t sign you in. Please try again.',
    signupDone: 'Account created. Confirm your email with the link we sent you, then sign in.',
    wait: 'Please wait…',
    signIn: 'Sign in',
    createAccount: 'Create account',
    noCode: 'No flat code? Ask your building manager.',
    demo: 'Demo: {accounts} · password {password}',
    details: 'Details',
  },
})

type MessageKey = keyof (typeof m)['ru']

// Kept as a key (not text) so the message follows a language switch.
interface FormMessage { key: MessageKey; vars?: Vars; detail?: string }

// Supabase Auth reports English messages; map the codes we expect to our own text.
const AUTH_CODES: Partial<Record<string, MessageKey>> = {
  invalid_credentials: 'invalidCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  user_already_exists: 'userExists',
  email_exists: 'userExists',
  weak_password: 'weakPassword',
  email_address_invalid: 'emailInvalid',
  validation_failed: 'emailInvalid',
  over_email_send_rate_limit: 'rateLimited',
  over_request_rate_limit: 'rateLimited',
}

function authError(err: { name?: string; message: string; code?: string }): FormMessage {
  const key = err.code ? AUTH_CODES[err.code] : undefined
  if (key) return { key }
  if (err.message === 'Invalid login credentials') return { key: 'invalidCredentials' }
  if (err.name === 'AuthRetryableFetchError') return { key: 'network' }
  return { key: 'authFailed', detail: err.message }
}

// Shared two-panel frame for the login and join screens.
export function AuthLayout({ children }: { children: ReactNode }) {
  const t = useT(layoutMessages)
  return (
    <div className="min-h-screen bg-[#2C4A1A] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] p-12 border-r border-white/10">
        <div>
          <div className="text-white/60 text-xs font-mono tracking-widest uppercase mb-12">{t('appName')}</div>
          <h1 className="text-white text-5xl font-bold leading-tight mb-4">
            {t('heroLine1')}<br />{t('heroLine2')}
          </h1>
          <p className="text-white/60 text-base leading-relaxed">
            {t('heroText')}
          </p>
        </div>
        <div className="text-white/30 text-xs font-mono">
          {t('place')}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F6F5DC]">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="text-[#697050] text-xs font-mono tracking-widest uppercase lg:invisible">{t('appName')}</div>
            <LanguageSwitcher />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

// login
export function LoginView() {
  const t = useT(m)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<FormMessage | null>(null)
  const [notice, setNotice] = useState<MessageKey | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    const trimmed = email.trim()
    if (!trimmed.includes('@')) { setError({ key: 'emailInvalid' }); return }
    if (password.length < MIN_PASSWORD) { setError({ key: 'passwordShort', vars: { n: MIN_PASSWORD } }); return }

    setBusy(true)
    try {
      const auth = getSupabase().auth
      if (mode === 'signin') {
        const { error: err } = await auth.signInWithPassword({ email: trimmed, password })
        if (err) setError(authError(err))
        // On success App's auth listener switches the screen.
      } else {
        const { data, error: err } = await auth.signUp({ email: trimmed, password })
        if (err) setError(authError(err))
        else if (!data.session) setNotice('signupDone')
      }
    } catch (err) {
      console.error('Sign-in request failed', err)
      setError({ key: 'authFailed', detail: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next: 'signin' | 'signup') {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  return (
    <AuthLayout>
      <h2 className="text-[#1E2A0E] text-2xl font-bold mb-1">{mode === 'signin' ? t('signinTitle') : t('signupTitle')}</h2>
      <p className="text-[#697050] text-sm mb-6">
        {mode === 'signin' ? t('signinSub') : t('signupSub')}
      </p>

      <div role="group" aria-label={t('tabsLabel')} className="flex gap-1 mb-6 bg-white border border-[#D6D3A8] rounded-md p-1">
        {(['signin', 'signup'] as const).map(tab => (
          <button key={tab} type="button"
            aria-pressed={mode === tab}
            onClick={() => switchMode(tab)}
            className={`flex-1 px-4 py-1.5 rounded text-sm font-medium transition-colors ${mode === tab ? 'bg-[#2C4A1A] text-white' : 'text-[#697050] hover:text-[#1E2A0E]'}`}
          >{tab === 'signin' ? t('tabSignin') : t('tabSignup')}</button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className={fieldLabelCls}>{t('email')}</label>
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
          <label htmlFor="password" className={fieldLabelCls}>{t('password')}</label>
          <input
            id="password"
            className={fieldCls}
            placeholder={t('passwordPlaceholder')}
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-red-600 text-xs" role="alert">
            {t(error.key, error.vars)}
            {error.detail && (
              <span className="block font-mono text-[10px] opacity-75 mt-0.5 break-words">
                {t('details')}: <span lang="en">{error.detail}</span>
              </span>
            )}
          </p>
        )}
        {notice && <p className="text-emerald-700 text-xs" role="status">{t(notice)}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[#2C4A1A] hover:bg-[#3A6022] disabled:opacity-60 text-white font-semibold rounded-md py-2.5 text-sm transition-colors mt-2"
        >
          {busy ? t('wait') : mode === 'signin' ? t('signIn') : t('createAccount')}
        </button>
      </form>

      <p className="text-[#697050] text-xs text-center mt-6">
        {t('noCode')}
      </p>
      {import.meta.env.DEV && (
        <p className="text-[#697050] text-[11px] font-mono text-center mt-3">
          {t('demo', { accounts: 'resident@demo.test / manager@demo.test', password: 'demo-password' })}
        </p>
      )}
    </AuthLayout>
  )
}
