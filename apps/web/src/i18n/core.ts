// Framework-free i18n core: languages, typed per-file dictionaries, plural
// selection and interpolation. React bindings live in context.tsx.

export type Language = 'ru' | 'kk' | 'en'

export const LANGUAGES: readonly Language[] = ['kk', 'ru', 'en']
export const DEFAULT_LANGUAGE: Language = 'ru'

/** BCP 47 locale used for every Intl formatter. */
export const LOCALES: Record<Language, string> = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' }

/** Value of <html lang>. */
export const HTML_LANG: Record<Language, string> = { ru: 'ru', kk: 'kk', en: 'en' }

export function isLanguage(value: unknown): value is Language {
  return value === 'ru' || value === 'kk' || value === 'en'
}

/** Text that exists in every language (mock/demo content, not API data). */
export type Localized = Record<Language, string>

// Russian needs one/few/many (1 заявка, 2 заявки, 5 заявок); Kazakh and
// English only distinguish one/other. `other` is the fallback everywhere.
export interface RuPlural { one: string; few: string; many: string; other: string }
export interface Plural { one: string; other: string }
export type RuMessage = string | RuPlural
export type Message = string | Plural | RuPlural

export type Dictionary<K extends string> = { readonly [L in Language]: Readonly<Record<K, Message>> }

/**
 * Declares one file's messages. Russian is the source of truth for the key
 * set: a key missing from kk/en, or an extra key there, is a type error.
 */
export function defineMessages<R extends Record<string, RuMessage>>(messages: {
  ru: R
  kk: NoInfer<{ [K in keyof R]: string | Plural }>
  en: NoInfer<{ [K in keyof R]: string | Plural }>
}): Dictionary<keyof R & string> {
  return messages
}

export type Vars = Record<string, string | number>

/** `t(key)` / `t(key, { n: 3, name })`; a plural message picks its form by `n`. */
export type TFunction<K extends string> = (key: K, vars?: Vars) => string

const pluralRules = new Map<Language, Intl.PluralRules>()
function pluralCategory(lang: Language, n: number): Intl.LDMLPluralRule {
  let rules = pluralRules.get(lang)
  if (!rules) {
    rules = new Intl.PluralRules(LOCALES[lang])
    pluralRules.set(lang, rules)
  }
  return rules.select(n)
}

function pickForm(message: Message, lang: Language, vars: Vars | undefined): string {
  if (typeof message === 'string') return message
  const n = vars?.n
  if (typeof n !== 'number') return message.other
  const category = pluralCategory(lang, n)
  if (category === 'one') return message.one
  if ('few' in message) {
    if (category === 'few') return message.few
    if (category === 'many') return message.many
  }
  return message.other
}

/** Replaces `{name}` placeholders; unknown placeholders are left visible. */
export function interpolate(text: string, vars: Vars | undefined): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole)
}

export function translate<K extends string>(dict: Dictionary<K>, lang: Language, key: K, vars?: Vars): string {
  const message = dict[lang][key] ?? dict[DEFAULT_LANGUAGE][key]
  if (message === undefined) return key
  return interpolate(pickForm(message, lang, vars), vars)
}

export function makeT<K extends string>(dict: Dictionary<K>, lang: Language): TFunction<K> {
  return (key, vars) => translate(dict, lang, key, vars)
}

// The selected language, mirrored outside React for the few non-component
// helpers (legacy formatters, errorMessage). Components use the hooks instead.
let current: Language = DEFAULT_LANGUAGE
export function getCurrentLanguage(): Language {
  return current
}
export function setCurrentLanguage(lang: Language): void {
  current = lang
}
