import { useEffect, useRef, useState } from 'react'
import { LanguageSwitcher, defineMessages, useT, type TFunction } from '../i18n'
import type { Resident, View } from '../types'

const m = defineMessages({
  ru: {
    dashboard: 'Главная',
    news: 'Новости',
    channel: 'Чат дома',
    report: 'Подать заявку',
    requests: 'Заявки',
    flats: 'Квартиры и коды',
    outages: 'Отключения',
    alerts: 'Экстренные',
    complaints: 'Жалобы',
    voting: 'Голосования',
    payments: 'Платежи',
    owner: 'Мои объекты',
    demo: 'Демо-данные',
    logout: '← Выйти',
    flat: 'Кв. {flat}',
    manager: 'Управляющий',
    openMenu: 'Открыть меню',
    closeMenu: 'Закрыть меню',
    navLabel: 'Основное меню',
  },
  kk: {
    dashboard: 'Басты бет',
    news: 'Жаңалықтар',
    channel: 'Үй чаты',
    report: 'Өтінім беру',
    requests: 'Өтінімдер',
    flats: 'Пәтерлер мен кодтар',
    outages: 'Өшірулер',
    alerts: 'Шұғыл хабарламалар',
    complaints: 'Шағымдар',
    voting: 'Дауыс беру',
    payments: 'Төлемдер',
    owner: 'Менің нысандарым',
    demo: 'Демо деректер',
    logout: '← Шығу',
    flat: '{flat}-пәтер',
    manager: 'Басқарушы',
    openMenu: 'Мәзірді ашу',
    closeMenu: 'Мәзірді жабу',
    navLabel: 'Негізгі мәзір',
  },
  en: {
    dashboard: 'Home',
    news: 'News',
    channel: 'Building chat',
    report: 'Submit a request',
    requests: 'Requests',
    flats: 'Flats and codes',
    outages: 'Outages',
    alerts: 'Emergency alerts',
    complaints: 'Complaints',
    voting: 'Voting',
    payments: 'Payments',
    owner: 'My properties',
    demo: 'Demo data',
    logout: '← Sign out',
    flat: 'Flat {flat}',
    manager: 'Manager',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    navLabel: 'Main menu',
  },
})

interface NavItem {
  view: View
  icon: string
  managerOnly?: boolean
  // Filing a request needs a flat; managers usually have none.
  needsFlat?: boolean
}

// nav — real features
const NAV_ITEMS: NavItem[] = [
  { view: 'dashboard', icon: '⌂' },
  { view: 'news', icon: '📢' },
  { view: 'channel', icon: '💬' },
  { view: 'report', icon: '＋', needsFlat: true },
  { view: 'requests', icon: '📋' },
  { view: 'flats', icon: '🔑', managerOnly: true },
]

// nav — still on mock data (see DemoBadge)
const DEMO_ITEMS: NavItem[] = [
  { view: 'outages', icon: '⚡' },
  { view: 'alerts', icon: '🚨' },
  { view: 'complaints', icon: '⚑' },
  { view: 'voting', icon: '✓' },
  { view: 'payments', icon: '₸' },
  { view: 'owner', icon: '🏠' },
]

export function visibleViews(resident: Resident): View[] {
  return [...NAV_ITEMS, ...DEMO_ITEMS].filter(i => isVisible(i, resident)).map(i => i.view)
}

function isVisible(item: NavItem, resident: Resident): boolean {
  if (item.managerOnly && resident.role !== 'manager') return false
  if (item.needsFlat && resident.flat_id === null) return false
  return true
}

function NavButton({ item, current, onNav, t }: {
  item: NavItem
  current: View
  onNav: (v: View) => void
  t: TFunction<keyof (typeof m)['ru']>
}) {
  return (
    <button
      onClick={() => onNav(item.view)}
      aria-current={current === item.view ? 'page' : undefined}
      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors relative ${
        current === item.view
          ? 'bg-white/15 text-white font-medium'
          : 'text-white/60 hover:text-white hover:bg-white/8'
      }`}
    >
      <span className="text-base w-5 text-center" aria-hidden>{item.icon}</span>
      <span className="flex-1">{t(item.view)}</span>
    </button>
  )
}

export function Sidebar({
  current,
  onNav,
  resident,
  onLogout,
}: {
  current: View
  onNav: (v: View) => void
  resident: Resident
  onLogout: () => void
}) {
  const t = useT(m)
  const subtitle = [
    resident.flat_number ? t('flat', { flat: resident.flat_number }) : resident.role === 'manager' ? t('manager') : null,
    resident.full_name,
  ]
    .filter(Boolean)
    .join(' · ')

  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const close = () => { setOpen(false); toggleRef.current?.focus() }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function navAndClose(v: View) {
    close()
    onNav(v)
  }

  const navList = (go: (v: View) => void, withSwitcher: boolean) => (
    <>
      <nav aria-label={t('navLabel')} className="flex-1 py-3 space-y-0.5 px-2">
        {NAV_ITEMS.filter(i => isVisible(i, resident)).map(item => (
          <NavButton key={item.view} item={item} current={current} onNav={go} t={t} />
        ))}
        <div className="px-3 pt-4 pb-1 text-white/30 text-[10px] font-mono uppercase tracking-widest">
          {t('demo')}
        </div>
        {DEMO_ITEMS.map(item => (
          <NavButton key={item.view} item={item} current={current} onNav={go} t={t} />
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
        <button onClick={onLogout} className="text-white/40 text-xs hover:text-white/70 transition-colors">
          {t('logout')}
        </button>
        {withSwitcher && <LanguageSwitcher tone="dark" />}
      </div>
    </>
  )

  return (
    <>
      {/* below md: top bar with a drop-down menu */}
      <div className="md:hidden sticky top-0 z-30" style={{background:'#2C4A1A'}}>
        <div className="h-14 flex items-center gap-3 px-4">
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm leading-tight truncate">{resident.building_name}</div>
            <div className="text-white/50 text-[11px] font-mono truncate">{subtitle}</div>
          </div>
          <LanguageSwitcher tone="dark" className="shrink-0" />
          <button ref={toggleRef} type="button" onClick={() => setOpen(o => !o)}
            aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? t('closeMenu') : t('openMenu')}
            className="w-10 h-10 grid place-items-center rounded text-white text-xl hover:bg-white/10 shrink-0">
            <span aria-hidden>{open ? '✕' : '☰'}</span>
          </button>
        </div>
        {open && (
          <div className="fixed inset-0 top-14 bg-black/30" aria-hidden onClick={close} />
        )}
        <div id="mobile-nav" hidden={!open}
          className="absolute left-0 right-0 top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto flex flex-col border-t border-white/10 shadow-lg"
          style={{background:'#2C4A1A'}}>
          {navList(navAndClose, false)}
        </div>
      </div>

      {/* md+: fixed-width sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 bg-[#2C4A1A] flex-col min-h-screen" style={{background:'#2C4A1A'}}>
        <div className="px-4 py-5 border-b border-white/10">
          <div className="text-white font-bold text-base leading-tight">{resident.building_name}</div>
          <div className="text-white/50 text-xs font-mono mt-0.5">{subtitle}</div>
        </div>
        {navList(onNav, true)}
      </aside>
    </>
  )
}
