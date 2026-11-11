import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as fmt from '../lib/format'
import type { RequestCategory, RequestStatus } from '../types'
import {
  DEFAULT_LANGUAGE,
  HTML_LANG,
  LOCALES,
  defineMessages,
  isLanguage,
  makeT,
  setCurrentLanguage,
  type Dictionary,
  type Language,
  type Localized,
  type TFunction,
} from './core'

const STORAGE_KEY = 'houseapp.lang'

function readStoredLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    // Storage blocked (private mode, sandboxed iframe): fall back to the default.
    return DEFAULT_LANGUAGE
  }
}

function storeLanguage(lang: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
  } catch (error) {
    console.warn('Could not persist the interface language', error)
  }
}

const doc = defineMessages({
  ru: { title: 'ЖК Управление — портал жильцов' },
  kk: { title: 'ТК Басқару — тұрғындар порталы' },
  en: { title: 'Residence Management — resident portal' },
})

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const initial = readStoredLanguage()
    setCurrentLanguage(initial)
    return initial
  })

  const setLang = useCallback((next: Language) => {
    setCurrentLanguage(next)
    storeLanguage(next)
    setLangState(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang]
    document.title = doc[lang].title as string
  }, [lang])

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (ctx === null) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}

/** `const t = useT(m)` — `m` is the file's `defineMessages(...)` result. */
export function useT<K extends string>(dict: Dictionary<K>): TFunction<K> {
  const { lang } = useLanguage()
  return useMemo(() => makeT(dict, lang), [dict, lang])
}

/** Picks the selected language's text from a Localized value (mock/demo content). */
export function useLocalize(): (text: Localized) => string {
  const { lang } = useLanguage()
  return useCallback((text: Localized) => text[lang], [lang])
}

export interface LocaleTools {
  lang: Language
  /** 'ru-RU' | 'kk-KZ' | 'en-GB' */
  locale: string
  formatDate: (iso: string) => string
  formatDateTime: (iso: string) => string
  formatTime: (iso: string) => string
  formatMessageTime: (iso: string) => string
  /** '2026-09' or any ISO date → 'сентябрь 2026 г.' / '2026 ж. қыркүйек' / 'September 2026' */
  formatMonth: (isoMonth: string) => string
  /** 'вчера', '3 дня назад', 'через 2 часа' … */
  formatRelative: (iso: string) => string
  formatNumber: (n: number) => string
  /** 19000 → '19 000 ₸' */
  formatMoney: (amountKzt: number) => string
  statusLabel: (status: RequestStatus) => string
  categoryLabel: (category: RequestCategory) => string
}

export function useLocale(): LocaleTools {
  const { lang } = useLanguage()
  return useMemo(() => ({
    lang,
    locale: LOCALES[lang],
    formatDate: (iso: string) => fmt.formatDate(iso, lang),
    formatDateTime: (iso: string) => fmt.formatDateTime(iso, lang),
    formatTime: (iso: string) => fmt.formatTime(iso, lang),
    formatMessageTime: (iso: string) => fmt.formatMessageTime(iso, lang),
    formatMonth: (isoMonth: string) => fmt.formatMonth(isoMonth, lang),
    formatRelative: (iso: string) => fmt.formatRelative(iso, lang),
    formatNumber: (n: number) => fmt.formatNumber(n, lang),
    formatMoney: (amount: number) => fmt.formatMoney(amount, lang),
    statusLabel: (status: RequestStatus) => fmt.statusLabel(status, lang),
    categoryLabel: (category: RequestCategory) => fmt.categoryLabel(category, lang),
  }), [lang])
}
