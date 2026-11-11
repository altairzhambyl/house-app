import { HTML_LANG, LANGUAGES, defineMessages, type Language } from './core'
import { useLanguage, useT } from './context'

// Each language names itself in its own language, so these never change with the UI.
const SHORT: Record<Language, string> = { kk: 'ҚАЗ', ru: 'РУС', en: 'ENG' }
const NATIVE: Record<Language, string> = { kk: 'Қазақша', ru: 'Русский', en: 'English' }

const m = defineMessages({
  ru: { group: 'Язык интерфейса' },
  kk: { group: 'Интерфейс тілі' },
  en: { group: 'Interface language' },
})

/** ҚАЗ / РУС / ENG toggle. `tone="dark"` for the green sidebar/top bar, `"light"` on the beige login screen. */
export function LanguageSwitcher({ tone = 'light', className = '' }: { tone?: 'light' | 'dark'; className?: string }) {
  const { lang, setLang } = useLanguage()
  const t = useT(m)
  const frame = tone === 'dark' ? 'border-white/20' : 'border-[#D6D3A8] bg-white'
  const idle = tone === 'dark'
    ? 'text-white/60 hover:text-white hover:bg-white/10'
    : 'text-[#697050] hover:text-[#1E2A0E] hover:bg-[#F6F5DC]'
  const active = tone === 'dark' ? 'bg-white/20 text-white' : 'bg-[#2C4A1A] text-white'

  return (
    <div role="group" aria-label={t('group')} className={`inline-flex rounded border p-0.5 gap-0.5 ${frame} ${className}`}>
      {LANGUAGES.map(l => (
        <button
          key={l}
          type="button"
          lang={HTML_LANG[l]}
          title={NATIVE[l]}
          aria-label={NATIVE[l]}
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 rounded-sm text-[11px] font-mono font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#A07C12] ${lang === l ? active : idle}`}
        >
          {SHORT[l]}
        </button>
      ))}
    </div>
  )
}
