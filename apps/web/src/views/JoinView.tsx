import { useState, type FormEvent } from 'react'
import { ApiError, api, errorMessage } from '../lib/api'
import type { Resident } from '../types'
import { AuthLayout, fieldCls, fieldLabelCls } from './LoginView'

const MAX_NAME = 100

// Link a signed-in account to a flat with the code from the management company.
export function JoinView({ email, onJoined, onLogout }: {
  email: string | null
  onJoined: (r: Resident) => void
  onLogout: () => void
}) {
  const [code, setCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    // The server ignores case, spaces and dashes too; this just keeps the request tidy.
    const normalized = code.replace(/[\s-]/g, '').toUpperCase()
    const name = fullName.trim()
    if (!normalized) { setError('Введите код квартиры'); return }
    if (!name) { setError('Введите имя и фамилию'); return }
    if (name.length > MAX_NAME) { setError(`Имя не длиннее ${MAX_NAME} символов`); return }

    setBusy(true)
    try {
      onJoined(await api.join(normalized, name))
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setError('Код не найден. Проверьте его или запросите новый у управляющего.')
      else if (err instanceof ApiError && err.status === 409) setError('Аккаунт уже привязан к квартире. Обновите страницу.')
      else setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-[#1E2A0E] text-2xl font-bold mb-1">Привязка к квартире</h2>
      <p className="text-[#697050] text-sm mb-8">
        Введите код квартиры, который выдал управляющий{email ? ` · ${email}` : ''}
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="code" className={fieldLabelCls}>Код квартиры</label>
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
          <label htmlFor="fullName" className={fieldLabelCls}>Имя и фамилия</label>
          <input
            id="fullName"
            className={fieldCls}
            placeholder="Жанар Сейткали"
            autoComplete="name"
            maxLength={MAX_NAME}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
          />
        </div>
        {error && <p className="text-red-600 text-xs" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[#2C4A1A] hover:bg-[#3A6022] disabled:opacity-60 text-white font-semibold rounded-md py-2.5 text-sm transition-colors mt-2"
        >
          {busy ? 'Подождите…' : 'Привязать'}
        </button>
      </form>

      <p className="text-center mt-6">
        <button onClick={onLogout} className="text-[#697050] text-xs hover:text-[#1E2A0E] transition-colors">
          ← Выйти
        </button>
      </p>
    </AuthLayout>
  )
}
