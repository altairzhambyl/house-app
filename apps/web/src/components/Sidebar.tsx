import type { Resident, View } from '../types'

interface NavItem {
  view: View
  label: string
  icon: string
  managerOnly?: boolean
  // Filing a request needs a flat; managers usually have none.
  needsFlat?: boolean
}

// nav — real features
const NAV_ITEMS: NavItem[] = [
  { view: 'dashboard', label: 'Главная', icon: '⌂' },
  { view: 'news', label: 'Новости', icon: '📢' },
  { view: 'channel', label: 'Чат дома', icon: '💬' },
  { view: 'report', label: 'Подать заявку', icon: '＋', needsFlat: true },
  { view: 'requests', label: 'Заявки', icon: '📋' },
  { view: 'flats', label: 'Квартиры и коды', icon: '🔑', managerOnly: true },
]

// nav — still on mock data (see DemoBadge)
const DEMO_ITEMS: NavItem[] = [
  { view: 'outages', label: 'Отключения', icon: '⚡' },
  { view: 'alerts', label: 'Экстренные', icon: '🚨' },
  { view: 'complaints', label: 'Жалобы', icon: '⚑' },
  { view: 'voting', label: 'Голосования', icon: '✓' },
  { view: 'payments', label: 'Платежи', icon: '₸' },
  { view: 'owner', label: 'Мои объекты', icon: '🏠' },
]

export function visibleViews(resident: Resident): View[] {
  return [...NAV_ITEMS, ...DEMO_ITEMS].filter(i => isVisible(i, resident)).map(i => i.view)
}

function isVisible(item: NavItem, resident: Resident): boolean {
  if (item.managerOnly && resident.role !== 'manager') return false
  if (item.needsFlat && resident.flat_id === null) return false
  return true
}

function NavButton({ item, current, onNav }: { item: NavItem; current: View; onNav: (v: View) => void }) {
  return (
    <button
      onClick={() => onNav(item.view)}
      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors relative ${
        current === item.view
          ? 'bg-white/15 text-white font-medium'
          : 'text-white/60 hover:text-white hover:bg-white/8'
      }`}
    >
      <span className="text-base w-5 text-center">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
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
  const subtitle = [
    resident.flat_number ? `Кв. ${resident.flat_number}` : resident.role === 'manager' ? 'Управляющий' : null,
    resident.full_name,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <aside className="w-56 shrink-0 bg-[#2C4A1A] flex flex-col min-h-screen" style={{background:'#2C4A1A'}}>
      <div className="px-4 py-5 border-b border-white/10">
        <div className="text-white font-bold text-base leading-tight">{resident.building_name}</div>
        <div className="text-white/50 text-xs font-mono mt-0.5">{subtitle}</div>
      </div>
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV_ITEMS.filter(i => isVisible(i, resident)).map(item => (
          <NavButton key={item.view} item={item} current={current} onNav={onNav} />
        ))}
        <div className="px-3 pt-4 pb-1 text-white/30 text-[10px] font-mono uppercase tracking-widest">
          Демо-данные
        </div>
        {DEMO_ITEMS.map(item => (
          <NavButton key={item.view} item={item} current={current} onNav={onNav} />
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        <button onClick={onLogout} className="text-white/40 text-xs hover:text-white/70 transition-colors">
          ← Выйти
        </button>
      </div>
    </aside>
  )
}
