import { useState, type FormEvent } from 'react'
import { ErrorNote } from '../components/ui'
import { defineMessages, useT, type Vars } from '../i18n'
import { api } from '../lib/api'
import type { Resident } from '../types'
import { AuthLayout, fieldCls, fieldLabelCls } from './LoginView'

const MAX_NAME = 100

const m = defineMessages({
  ru: {
    title: 'Привязка к квартире',
    sub: 'Введите код квартиры, который выдал управляющий',
    codeLabel: 'Код квартиры',
    nameLabel: 'Имя и фамилия',
    namePlaceholder: 'Жанар Сейткали',
    codeRequired: 'Введите код квартиры',
    nameRequired: 'Введите имя и фамилию',
    nameTooLong: {
      one: 'Имя не длиннее {n} символа',
      few: 'Имя не длиннее {n} символов',
      many: 'Имя не длиннее {n} символов',
      other: 'Имя не длиннее {n} символа',
    },
    codeNotFound: 'Код не найден. Проверьте его или запросите новый у управляющего.',
    alreadyLinked: 'Аккаунт уже привязан к квартире. Обновите страницу.',
    wait: 'Подождите…',
    submit: 'Привязать',
    logout: '← Выйти',
  },
  kk: {
    title: 'Пәтерге байланыстыру',
    sub: 'Басқарушы берген пәтер кодын енгізіңіз',
    codeLabel: 'Пәтер коды',
    nameLabel: 'Аты-жөні',
    namePlaceholder: 'Жанар Сейтқали',
    codeRequired: 'Пәтер кодын енгізіңіз',
    nameRequired: 'Аты-жөніңізді енгізіңіз',
    nameTooLong: {
      one: 'Аты-жөні {n} таңбадан аспауы керек',
      other: 'Аты-жөні {n} таңбадан аспауы керек',
    },
    codeNotFound: 'Код табылмады. Оны тексеріңіз немесе басқарушыдан жаңасын сұраңыз.',
    alreadyLinked: 'Аккаунт пәтерге әлдеқашан байланыстырылған. Бетті жаңартыңыз.',
    wait: 'Күте тұрыңыз…',
    submit: 'Байланыстыру',
    logout: '← Шығу',
  },
  en: {
    title: 'Link your flat',
    sub: 'Enter the flat code your manager gave you',
    codeLabel: 'Flat code',
    nameLabel: 'Full name',
    namePlaceholder: 'Zhanar Seitkali',
    codeRequired: 'Enter the flat code',
    nameRequired: 'Enter your full name',
    nameTooLong: {
      one: 'Name can’t be longer than {n} character',
      other: 'Name can’t be longer than {n} characters',
    },
    codeNotFound: 'Code not found. Check it or ask your manager for a new one.',
    alreadyLinked: 'This account is already linked to a flat. Refresh the page.',
    wait: 'Please wait…',
    submit: 'Link flat',
    logout: '← Sign out',
  },
})

type FormError = { key: keyof (typeof m)['ru']; vars?: Vars } | { error: unknown }

// Link a signed-in account to a flat with the code from the management company.
export function JoinView({ email, onJoined, onLogout }: {
  email: string | null
  onJoined: (r: Resident) => void
  onLogout: () => void
}) {
  const t = useT(m)
  const [code, setCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<FormError | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    // The server ignores case, spaces and dashes too; this just keeps the request tidy.
    const normalized = code.replace(/[\s-]/g, '').toUpperCase()
    const name = fullName.trim()
    if (!normalized) { setError({ key: 'codeRequired' }); return }
    if (!name) { setError({ key: 'nameRequired' }); return }
    if (name.length > MAX_NAME) { setError({ key: 'nameTooLong', vars: { n: MAX_NAME } }); return }

    setBusy(true)
    try {
      onJoined(await api.join(normalized, name))
    } catch (err) {
      setError({ error: err })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-[#1E2A0E] text-2xl font-bold mb-1">{t('title')}</h2>
      <p className="text-[#697050] text-sm mb-8">
        {t('sub')}{email ? ` · ${email}` : ''}
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="code" className={fieldLabelCls}>{t('codeLabel')}</label>
          <input
            id="code"
            className={`${fieldCls} font-mono tracking-widest uppercase`}
            placeholder="XXXXXXXXXX"
            autoComplete="off"
            value={code}
            onChange={e => setCode(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="fullName" className={fieldLabelCls}>{t('nameLabel')}</label>
          <input
            id="fullName"
            className={fieldCls}
            placeholder={t('namePlaceholder')}
            autoComplete="name"
            maxLength={MAX_NAME}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
          />
        </div>
        {error && ('key' in error
          ? <p className="text-red-600 text-xs" role="alert">{t(error.key, error.vars)}</p>
          : <ErrorNote error={error.error} overrides={{ 404: t('codeNotFound'), 409: t('alreadyLinked') }} />)}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[#2C4A1A] hover:bg-[#3A6022] disabled:opacity-60 text-white font-semibold rounded-md py-2.5 text-sm transition-colors mt-2"
        >
          {busy ? t('wait') : t('submit')}
        </button>
      </form>

      <p className="text-center mt-6">
        <button onClick={onLogout} className="text-[#697050] text-xs hover:text-[#1E2A0E] transition-colors">
          {t('logout')}
        </button>
      </p>
    </AuthLayout>
  )
}
