import { useState } from 'react'

// types
type View =
  | 'login'
  | 'dashboard'
  | 'news'
  | 'report'
  | 'requests'
  | 'outages'
  | 'alerts'
  | 'complaints'
  | 'voting'
  | 'payments'
  | 'owner'

interface User {
  flat: string
  building: string
  name: string
  role: 'resident' | 'owner'
}

// all of the mock data
const NEWS = [
  { id: 1, date: '28 Sep 2026', title: 'Elevator maintenance completed', body: 'Both elevators in stairwell A have been serviced and are operating normally.', tag: 'Maintenance' },
  { id: 2, date: '25 Sep 2026', title: 'New management company contract signed', body: 'Starting 1 October, Almaty Comfort LLC will manage communal services and billing.', tag: 'General' },
  { id: 3, date: '20 Sep 2026', title: 'Parking rules reminder', body: 'Vehicles blocking the emergency exit will be towed at owner expense per building rules §14.', tag: 'Notice' },
  { id: 4, date: '15 Sep 2026', title: 'Autumn cleaning Saturday', body: 'Voluntary yard cleanup day on 5 October. Gloves and bags provided. Join us at 10:00.', tag: 'Community' },
]

const REQUESTS = [
  { id: 'REQ-041', flat: '14B', desc: 'Hot water pipe leaking under kitchen sink', status: 'In Progress', date: '27 Sep 2026', photo: true, category: 'Plumbing', votes: 3 },
  { id: 'REQ-039', flat: '14B', desc: 'Hallway light on 4th floor flickering', status: 'Done', date: '18 Sep 2026', photo: false, category: 'Electrical', votes: 7 },
  { id: 'REQ-035', flat: '14B', desc: 'Entrance door lock broken — key jams', status: 'Pending', date: '10 Sep 2026', photo: true, category: 'Locksmith', votes: 11 },
  { id: 'REQ-028', flat: '14B', desc: 'Rubbish chute blocked on floor 3', status: 'Done', date: '2 Sep 2026', photo: false, category: 'Sanitation', votes: 5 },
]

const ALL_REQUESTS = [
  { id: 'REQ-041', flat: '14B', desc: 'Hot water pipe leaking under kitchen sink', status: 'In Progress', date: '27 Sep 2026', category: 'Plumbing', votes: 3 },
  { id: 'REQ-040', flat: '7A', desc: 'Broken window latch in stairwell floor 6', status: 'Pending', date: '24 Sep 2026', category: 'Locksmith', votes: 8 },
  { id: 'REQ-039', flat: '14B', desc: 'Hallway light on 4th floor flickering', status: 'Done', date: '18 Sep 2026', category: 'Electrical', votes: 7 },
  { id: 'REQ-038', flat: '22C', desc: 'Graffiti on basement wall near parking', status: 'Pending', date: '17 Sep 2026', category: 'Cleaning', votes: 2 },
  { id: 'REQ-035', flat: '14B', desc: 'Entrance door lock broken — key jams', status: 'Pending', date: '10 Sep 2026', category: 'Locksmith', votes: 11 },
]

const OUTAGES = [
  { id: 1, type: 'Water', start: '29 Sep 2026 09:00', end: '29 Sep 2026 14:00', floors: 'All floors', reason: 'Scheduled pipe inspection and pressure testing', status: 'Active' },
  { id: 2, type: 'Electricity', start: '5 Oct 2026 10:00', end: '5 Oct 2026 13:00', floors: 'Floors 1–5', reason: 'Switchboard upgrade in basement', status: 'Upcoming' },
  { id: 3, type: 'Heating', start: '1 Oct 2026 00:00', end: '3 Oct 2026 00:00', floors: 'All floors', reason: 'Start-of-season heating system flush', status: 'Upcoming' },
  { id: 4, type: 'Elevator', start: '22 Sep 2026 08:00', end: '22 Sep 2026 17:00', floors: 'Stairwell B', reason: 'Annual safety certification inspection', status: 'Done' },
]

const COMPLAINTS = [
  { id: 1, from: 'Flat 12A', about: 'Flat 13A', subject: 'Noise after 23:00', status: 'Under review', date: '26 Sep 2026' },
  { id: 2, from: 'Flat 8C', about: 'Flat 8B', subject: 'Cigarette smoke in shared hallway', status: 'Resolved', date: '19 Sep 2026' },
  { id: 3, from: 'Flat 3B', about: 'Common area', subject: 'Dog not on leash in elevator', status: 'Closed', date: '12 Sep 2026' },
]

const VOTES = [
  {
    id: 1,
    title: 'Install CCTV cameras in all stairwells',
    deadline: '10 Oct 2026',
    status: 'Open',
    yes: 42,
    no: 11,
    abstain: 5,
    total: 80,
    voted: false,
  },
  {
    id: 2,
    title: 'Increase communal cleaning frequency to 3× per week',
    deadline: '15 Oct 2026',
    status: 'Open',
    yes: 31,
    no: 22,
    abstain: 8,
    total: 80,
    voted: true,
    myVote: 'yes',
  },
  {
    id: 3,
    title: 'Repaint building facade — approve 2026 budget item',
    deadline: '20 Sep 2026',
    status: 'Closed',
    yes: 55,
    no: 18,
    abstain: 7,
    total: 80,
    voted: true,
    myVote: 'yes',
  },
]

const PAYMENTS = [
  { id: 1, month: 'September 2026', amount: 18500, status: 'Paid', date: '5 Sep 2026', breakdown: { communal: 8000, repair: 4500, security: 2000, cleaning: 4000 } },
  { id: 2, month: 'August 2026', amount: 18500, status: 'Paid', date: '4 Aug 2026', breakdown: { communal: 8000, repair: 4500, security: 2000, cleaning: 4000 } },
  { id: 3, month: 'July 2026', amount: 16000, status: 'Paid', date: '6 Jul 2026', breakdown: { communal: 8000, repair: 2500, security: 2000, cleaning: 3500 } },
  { id: 4, month: 'October 2026', amount: 19000, status: 'Due', date: 'Due 10 Oct 2026', breakdown: { communal: 8000, repair: 5000, security: 2000, cleaning: 4000 } },
]

const RENTED_FLATS = [
  { flat: '14B', tenant: 'Asel Nurmagambetova', since: 'Jan 2026', paid: true, nextDue: 'Oct 2026', requests: 2 },
  { flat: '22A', tenant: 'Dauren Bektenov', since: 'Mar 2025', paid: false, nextDue: 'Sep 2026', requests: 0 },
]

//color palettes
const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-amber-100 text-amber-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'Done': 'bg-emerald-100 text-emerald-800',
  'Active': 'bg-red-100 text-red-800',
  'Upcoming': 'bg-amber-100 text-amber-800',
  'Open': 'bg-blue-100 text-blue-800',
  'Closed': 'bg-gray-100 text-gray-600',
  'Under review': 'bg-amber-100 text-amber-800',
  'Resolved': 'bg-emerald-100 text-emerald-800',
  'Paid': 'bg-emerald-100 text-emerald-800',
  'Due': 'bg-red-100 text-red-800',
}

const TAG_COLORS: Record<string, string> = {
  Maintenance: 'bg-blue-50 text-blue-700',
  General: 'bg-gray-100 text-gray-700',
  Notice: 'bg-red-50 text-red-700',
  Community: 'bg-green-50 text-green-700',
}

// other small comp.
function Badge({ label }: { label: string }) {
  const cls = STATUS_COLORS[label] ?? 'bg-gray-100 text-gray-600'
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${cls}`}>{label}</span>
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-[#2C4A1A] tracking-tight">{title}</h1>
      {sub && <p className="text-sm text-[#697050] mt-0.5">{sub}</p>}
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#D6D3A8] rounded-md ${className}`}>
      {children}
    </div>
  )
}

// login
function LoginView({ onLogin }: { onLogin: (u: User) => void }) {
  const [building, setBuilding] = useState('Ул. Навои 47')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) { setError('Введите имя и фамилию'); return }
    if (password.length < 4) { setError('Пароль должен содержать минимум 4 символа'); return }
    onLogin({ flat: '14Б', building, name: `${firstName} ${lastName}`, role: 'owner' })
  }

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
          <h2 className="text-[#1E2A0E] text-2xl font-bold mb-1">Вход в систему</h2>
          <p className="text-[#697050] text-sm mb-8">Войдите в личный кабинет жильца</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-[#697050] text-xs font-mono uppercase tracking-wider block mb-1.5">Жилой комплекс</label>
              <select
                className="w-full bg-white border border-[#D6D3A8] text-[#1E2A0E] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#2C4A1A]"
                value={building}
                onChange={e => setBuilding(e.target.value)}
              >
                <option value="Ул. Навои 47">Ул. Навои 47 (корп. А, Б, В)</option>
                <option value="Ул. Абая 12">Ул. Абая 12</option>
                <option value="Мкр. Алмагуль 5">Мкр. Алмагуль 5</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#697050] text-xs font-mono uppercase tracking-wider block mb-1.5">Имя</label>
                <input
                  className="w-full bg-white border border-[#D6D3A8] text-[#1E2A0E] placeholder-[#B0AD88] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#2C4A1A]"
                  placeholder="Жанар"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[#697050] text-xs font-mono uppercase tracking-wider block mb-1.5">Фамилия</label>
                <input
                  className="w-full bg-white border border-[#D6D3A8] text-[#1E2A0E] placeholder-[#B0AD88] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#2C4A1A]"
                  placeholder="Сейткали"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-[#697050] text-xs font-mono uppercase tracking-wider block mb-1.5">Пароль</label>
              <input
                className="w-full bg-white border border-[#D6D3A8] text-[#1E2A0E] placeholder-[#B0AD88] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#2C4A1A]"
                placeholder="Введите пароль"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <button
              type="submit"
              className="w-full bg-[#2C4A1A] hover:bg-[#3A6022] text-white font-semibold rounded-md py-2.5 text-sm transition-colors mt-2"
            >
              Войти
            </button>
          </form>

          <p className="text-[#697050] text-xs text-center mt-6">
            Нет доступа? Обратитесь к управляющему комплекса.
          </p>
        </div>
      </div>
    </div>
  )
}

// nav
const NAV_ITEMS: { view: View; label: string; icon: string; badge?: number }[] = [
  { view: 'dashboard', label: 'Главная', icon: '⌂' },
  { view: 'news', label: 'Новости', icon: '📢' },
  { view: 'report', label: 'Подать заявку', icon: '＋' },
  { view: 'requests', label: 'Мои заявки', icon: '📋', badge: 2 },
  { view: 'outages', label: 'Отключения', icon: '⚡', badge: 1 },
  { view: 'alerts', label: 'Экстренные', icon: '🚨' },
  { view: 'complaints', label: 'Жалобы', icon: '⚑' },
  { view: 'voting', label: 'Голосования', icon: '✓', badge: 1 },
  { view: 'payments', label: 'Платежи', icon: '₸' },
  { view: 'owner', label: 'Мои объекты', icon: '🔑' },
]

function Sidebar({ current, onNav, user, onLogout }: { current: View; onNav: (v: View) => void; user: User; onLogout: () => void }) {
  return (
    <aside className="w-56 shrink-0 bg-[#2C4A1A] flex flex-col min-h-screen" style={{background:'#2C4A1A'}}>
      <div className="px-4 py-5 border-b border-white/10">
        <div className="text-white font-bold text-base leading-tight">{user.building}</div>
        <div className="text-white/50 text-xs font-mono mt-0.5">Кв. {user.flat} · {user.name}</div>
      </div>
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV_ITEMS.map(item => (
          <button
            key={item.view}
            onClick={() => onNav(item.view)}
            className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors relative ${
              current === item.view
                ? 'bg-white/15 text-white font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/8'
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-[#A07C12] text-white text-[10px] font-mono font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </button>
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

// dashboard
function DashboardView({ onNav }: { onNav: (v: View) => void }) {
  return (
    <div>
      {/* Emergency alert banner */}
      <div className="bg-[#A07C12] text-white px-5 py-3 flex items-center gap-3 -mx-6 -mt-6 mb-6">
        <span className="text-lg">🚨</span>
        <div className="flex-1">
          <span className="font-semibold text-sm">Экстренное уведомление:</span>
          <span className="text-sm text-white/90 ml-2">Отключение воды сегодня с 09:00 до 14:00 — плановые работы.</span>
        </div>
        <button onClick={() => onNav('alerts')} className="text-white/70 text-xs hover:text-white underline">Подробнее</button>
      </div>

      <SectionHeader title="Главная" sub="Ул. Навои 47 · Квартира 14Б" />

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Мои заявки', value: '2', sub: 'активных', action: 'requests' as View },
          { label: 'Следующий платёж', value: '19 000 ₸', sub: 'до 10 окт', action: 'payments' as View },
          { label: 'Открытых голос.', value: '1', sub: 'жду вашего голоса', action: 'voting' as View },
          { label: 'Отключений', value: '3', sub: 'запланировано', action: 'outages' as View },
        ].map(s => (
          <button key={s.label} onClick={() => onNav(s.action)}
            className="bg-white border border-[#D6D3A8] rounded-md p-4 text-left hover:border-[#2C4A1A] transition-colors group">
            <div className="text-xl font-bold text-[#2C4A1A] group-hover:text-[#A07C12] transition-colors">{s.value}</div>
            <div className="text-xs text-[#697050] mt-0.5">{s.label}</div>
            <div className="text-[10px] text-[#697050] font-mono mt-1">{s.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent news */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#2C4A1A]">Последние новости</h2>
            <button onClick={() => onNav('news')} className="text-xs text-[#A07C12] hover:underline">Все →</button>
          </div>
          <Card>
            {NEWS.slice(0, 3).map((n, i) => (
              <div key={n.id} className={`px-4 py-3 ${i < 2 ? 'border-b border-[#F6F5DC]' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded mt-0.5 ${TAG_COLORS[n.tag] ?? 'bg-gray-100 text-gray-600'}`}>{n.tag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[#1E2A0E] leading-snug">{n.title}</div>
                    <div className="text-xs text-[#697050] mt-0.5">{n.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* My open requests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#2C4A1A]">Мои заявки</h2>
            <button onClick={() => onNav('requests')} className="text-xs text-[#A07C12] hover:underline">Все →</button>
          </div>
          <Card>
            {REQUESTS.filter(r => r.status !== 'Done').map((r, i, arr) => (
              <div key={r.id} className={`px-4 py-3 ${i < arr.length - 1 ? 'border-b border-[#F6F5DC]' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] text-[#697050]">{r.id}</span>
                  <Badge label={r.status} />
                </div>
                <div className="text-sm text-[#1E2A0E] leading-snug">{r.desc}</div>
                <div className="text-[11px] text-[#697050] font-mono mt-1">{r.date} · {r.category}</div>
              </div>
            ))}
          </Card>

          <button
            onClick={() => onNav('report')}
            className="w-full mt-3 bg-[#A07C12] hover:bg-[#836208] text-white font-semibold rounded-md py-2 text-sm transition-colors"
          >
            + Новая заявка
          </button>
        </div>
      </div>
    </div>
  )
}

// news
function NewsView() {
  const [filter, setFilter] = useState('All')
  const tags = ['All', 'Maintenance', 'General', 'Notice', 'Community']
  const filtered = filter === 'All' ? NEWS : NEWS.filter(n => n.tag === filter)

  return (
    <div>
      <SectionHeader title="Новости дома" sub="Официальный канал управляющей компании" />
      <div className="flex gap-2 mb-5 flex-wrap">
        {tags.map(t => (
          <button key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              filter === t ? 'bg-[#2C4A1A] text-white border-[#2C4A1A]' : 'bg-white text-[#2C4A1A] border-[#D6D3A8] hover:border-[#2C4A1A]'
            }`}
          >{t === 'All' ? 'Все' : t}</button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map(n => (
          <Card key={n.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${TAG_COLORS[n.tag] ?? 'bg-gray-100 text-gray-600'}`}>{n.tag}</span>
                  <span className="text-xs text-[#697050] font-mono">{n.date}</span>
                </div>
                <h3 className="font-semibold text-[#2C4A1A] mb-1">{n.title}</h3>
                <p className="text-sm text-[#697050] leading-relaxed">{n.body}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// all of the reports
function ReportView() {
  const [form, setForm] = useState({ category: '', desc: '', location: '', photo: false })
  const [submitted, setSubmitted] = useState(false)
  const [similar, setSimilar] = useState(false)

  function handleDesc(v: string) {
    setForm(f => ({ ...f, desc: v }))
    setSimilar(v.toLowerCase().includes('lock') || v.toLowerCase().includes('замок') || v.toLowerCase().includes('лифт'))
  }

  if (submitted) {
    return (
      <div>
        <SectionHeader title="Заявка подана" />
        <Card className="p-8 text-center max-w-md mx-auto">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-lg font-bold text-[#2C4A1A] mb-2">Заявка REQ-042 зарегистрирована</h2>
          <p className="text-sm text-[#697050] mb-6">Управляющий получил уведомление. Ожидайте обратной связи в течение 24 часов.</p>
          <button onClick={() => setSubmitted(false)} className="bg-[#2C4A1A] text-white px-5 py-2 rounded text-sm font-medium hover:bg-[#3A6022] transition-colors">
            Подать ещё одну
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <SectionHeader title="Подать заявку" sub="Сообщите о неисправности или проблеме в доме" />
      <div className="max-w-lg">
        <Card className="p-5 space-y-4">
          <div>
            <label className="text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5">Категория</label>
            <select
              className="w-full border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A]"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              <option value="">Выберите категорию…</option>
              <option>Сантехника</option>
              <option>Электрика</option>
              <option>Лифт</option>
              <option>Замок / Дверь</option>
              <option>Уборка</option>
              <option>Отопление</option>
              <option>Кровля</option>
              <option>Другое</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5">Место</label>
            <input
              className="w-full border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A]"
              placeholder="Напр. Подъезд Б, 3 этаж"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5">Описание</label>
            <textarea
              className="w-full border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A] resize-none h-24"
              placeholder="Опишите проблему подробно…"
              value={form.desc}
              onChange={e => handleDesc(e.target.value)}
            />
          </div>

          {/* Duplicate suggestion */}
          {similar && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <div className="text-xs font-semibold text-amber-800 mb-1">⚡ Похожая заявка уже существует</div>
              <p className="text-xs text-amber-700">REQ-035: «Замок входной двери сломан» (11 голосов). Присоединиться к этой заявке?</p>
              <button className="mt-2 text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-1 rounded font-medium transition-colors">
                Присоединиться (рекомендуется)
              </button>
            </div>
          )}

          <div>
            <label className="text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5">Фото (необязательно)</label>
            <div
              onClick={() => setForm(f => ({ ...f, photo: !f.photo }))}
              className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                form.photo ? 'border-[#2C4A1A] bg-blue-50' : 'border-[#D6D3A8] hover:border-[#2C4A1A]'
              }`}
            >
              {form.photo
                ? <span className="text-sm text-[#2C4A1A] font-medium">✓ photo_20260929.jpg прикреплено</span>
                : <span className="text-sm text-[#697050]">Нажмите чтобы прикрепить фото</span>
              }
            </div>
          </div>

          <button
            onClick={() => { if (form.category && form.desc) setSubmitted(true) }}
            className="w-full bg-[#A07C12] hover:bg-[#836208] text-white font-semibold rounded py-2.5 text-sm transition-colors"
          >
            Отправить заявку
          </button>
        </Card>
      </div>
    </div>
  )
}

// my requests
function RequestsView() {
  const [tab, setTab] = useState<'mine' | 'all'>('mine')
  const list = tab === 'mine' ? REQUESTS : ALL_REQUESTS

  return (
    <div>
      <SectionHeader title="Заявки" sub="История и статус ваших обращений" />
      <div className="flex gap-1 mb-5 bg-white border border-[#D6D3A8] rounded-md p-1 w-fit">
        {(['mine', 'all'] as const).map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${tab === t ? 'bg-[#2C4A1A] text-white' : 'text-[#697050] hover:text-[#1E2A0E]'}`}
          >{t === 'mine' ? 'Мои заявки' : 'Все заявки дома'}</button>
        ))}
      </div>
      <div className="space-y-3">
        {list.map(r => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] text-[#697050]">{r.id}</span>
                  <Badge label={r.status} />
                  <span className="text-[11px] text-[#697050] font-mono">{r.category}</span>
                  {'photo' in r && Boolean(r.photo) && <span className="text-[11px] text-[#697050]">📷</span>}
                </div>
                <p className="text-sm font-medium text-[#1E2A0E]">{r.desc}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[11px] text-[#697050] font-mono">{r.date}</span>
                  <span className="text-[11px] text-[#697050]">Кв. {r.flat}</span>
                  <span className="text-[11px] text-[#697050]">👍 {r.votes} поддержали</span>
                </div>
              </div>
              {tab === 'all' && (
                <button className="shrink-0 text-xs text-[#A07C12] hover:underline font-medium">
                  Присоединиться
                </button>
              )}
            </div>
            {/* Status timeline */}
            {r.status === 'In Progress' && (
              <div className="mt-3 pt-3 border-t border-[#F6F5DC]">
                <div className="flex items-center gap-0">
                  {['Принято', 'В работе', 'Выполнено'].map((s, i) => (
                    <div key={s} className="flex items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= 1 ? 'bg-[#2C4A1A] text-white' : 'bg-[#E2DFB8] text-[#697050]'}`}>{i + 1}</div>
                      <div className="text-[10px] font-mono ml-1 mr-3 text-[#697050]">{s}</div>
                      {i < 2 && <div className={`h-px w-8 mr-3 ${i < 1 ? 'bg-[#2C4A1A]' : 'bg-[#E2DFB8]'}`} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

// outages
function OutagesView() {
  const typeIcon: Record<string, string> = { Water: '💧', Electricity: '⚡', Heating: '🔥', Elevator: '🛗' }

  return (
    <div>
      <SectionHeader title="Плановые отключения" sub="Запланированные работы и перебои в обслуживании" />
      <div className="space-y-3">
        {OUTAGES.map(o => (
          <Card key={o.id} className={`p-4 ${o.status === 'Active' ? 'border-red-200 bg-red-50' : ''}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{typeIcon[o.type]}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-[#1E2A0E]">{o.type}</span>
                  <Badge label={o.status} />
                </div>
                <p className="text-xs text-[#697050] mb-1">{o.reason}</p>
                <div className="flex flex-wrap gap-4 text-[11px] font-mono text-[#697050]">
                  <span>С: {o.start}</span>
                  <span>До: {o.end}</span>
                  <span>Зона: {o.floors}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ALERTS
function AlertsView() {
  const alerts = [
    { id: 1, time: '29 Sep 2026 08:45', title: 'Отключение воды', body: 'Горячая и холодная вода отключены до 14:00. Причина: плановая проверка давления в трубах.', level: 'warning' },
    { id: 2, time: '15 Sep 2026 19:10', title: 'Задымление в подвале', body: 'Пожарная служба выезжала на ложное срабатывание датчика в подвале. Угрозы нет.', level: 'danger' },
    { id: 3, time: '1 Sep 2026 07:00', title: 'Отопительный сезон', body: 'С 1 октября начинается отопительный сезон. Ожидается запуск систем в срок.', level: 'info' },
  ]
  const color: Record<string, string> = { warning: 'border-amber-300 bg-amber-50', danger: 'border-red-300 bg-red-50', info: 'border-blue-200 bg-blue-50' }
  const icon: Record<string, string> = { warning: '⚠️', danger: '🚨', info: 'ℹ️' }

  return (
    <div>
      <SectionHeader title="Экстренные уведомления" sub="Важные сообщения от управления и аварийных служб" />
      <div className="space-y-3">
        {alerts.map(a => (
          <div key={a.id} className={`border rounded-md p-4 ${color[a.level]}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl">{icon[a.level]}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-[#1E2A0E]">{a.title}</span>
                  <span className="text-[10px] font-mono text-[#697050]">{a.time}</span>
                </div>
                <p className="text-sm text-[#697050] leading-relaxed">{a.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// complaints
function ComplaintsView() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ about: '', subject: '', detail: '' })
  const [submitted, setSubmitted] = useState(false)

  return (
    <div>
      <SectionHeader title="Жалобы на соседей" sub="Анонимное обращение к управляющему" />

      <div className="flex gap-3 mb-5">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#A07C12] hover:bg-[#836208] text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
        >
          + Подать жалобу
        </button>
      </div>

      {showForm && !submitted && (
        <Card className="p-5 mb-5 max-w-lg">
          <h3 className="font-semibold text-[#2C4A1A] mb-4">Новая жалоба</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5">На кого (квартира)</label>
              <input className="w-full border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A]"
                placeholder="Напр. 13А" value={form.about} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5">Тема</label>
              <input className="w-full border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A]"
                placeholder="Шум, запах, мусор…" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5">Подробности</label>
              <textarea className="w-full border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A] resize-none h-20"
                value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} />
            </div>
            <p className="text-[11px] text-[#697050]">🔒 Ваша жалоба будет анонимной. Управляющий свяжется с обеими сторонами.</p>
            <button onClick={() => setSubmitted(true)}
              className="w-full bg-[#2C4A1A] hover:bg-[#3A6022] text-white text-sm font-semibold py-2 rounded transition-colors">
              Отправить
            </button>
          </div>
        </Card>
      )}
      {submitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-5 text-sm text-emerald-800">
          ✓ Жалоба принята анонимно. Управляющий рассмотрит в течение 48 часов.
        </div>
      )}

      <h3 className="font-semibold text-[#2C4A1A] mb-3 text-sm">История обращений</h3>
      <div className="space-y-2">
        {COMPLAINTS.map(c => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge label={c.status} />
                  <span className="text-[11px] font-mono text-[#697050]">{c.date}</span>
                </div>
                <p className="text-sm font-medium text-[#1E2A0E]">{c.subject}</p>
                <p className="text-xs text-[#697050] mt-0.5">От кв. {c.from} → на кв. {c.about}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// voting
function VotingView() {
  const [votes, setVotes] = useState(VOTES)

  function vote(id: number, choice: 'yes' | 'no' | 'abstain') {
    setVotes(vs => vs.map(v => v.id === id ? { ...v, voted: true, myVote: choice, [choice]: (v as any)[choice] + 1 } : v))
  }

  return (
    <div>
      <SectionHeader title="Голосования" sub="Решения принимаются большинством голосов собственников" />
      <div className="space-y-4">
        {votes.map(v => {
          const pct = (n: number) => Math.round((n / v.total) * 100)
          return (
            <Card key={v.id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge label={v.status} />
                    <span className="text-[11px] font-mono text-[#697050]">до {v.deadline}</span>
                  </div>
                  <h3 className="font-semibold text-[#2C4A1A]">{v.title}</h3>
                </div>
              </div>

              {/* Vote bars */}
              <div className="space-y-2 mb-4">
                {([['yes', 'За', v.yes, 'bg-emerald-500'], ['no', 'Против', v.no, 'bg-red-400'], ['abstain', 'Воздержались', v.abstain, 'bg-gray-300']] as const).map(([key, label, n, color]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-[#697050] w-24">{label}</span>
                    <div className="flex-1 bg-[#F6F5DC] rounded-full h-2">
                      <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct(n)}%` }} />
                    </div>
                    <span className="text-xs font-mono text-[#697050] w-14 text-right">{n} ({pct(n)}%)</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#697050]">Проголосовало: {v.yes + v.no + v.abstain} из {v.total}</span>
                {v.status === 'Open' && !v.voted && (
                  <div className="flex gap-2">
                    {(['yes', 'no', 'abstain'] as const).map(c => (
                      <button key={c} onClick={() => vote(v.id, c)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                          c === 'yes' ? 'border-emerald-400 text-emerald-700 hover:bg-emerald-50' :
                          c === 'no' ? 'border-red-400 text-red-700 hover:bg-red-50' :
                          'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >{c === 'yes' ? 'За' : c === 'no' ? 'Против' : 'Воздержаться'}</button>
                    ))}
                  </div>
                )}
                {v.voted && (
                  <span className="text-xs text-emerald-700 font-medium">✓ Вы проголосовали: {v.myVote === 'yes' ? 'За' : v.myVote === 'no' ? 'Против' : 'Воздержались'}</span>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// payments
function PaymentsView() {
  const [expanded, setExpanded] = useState<number | null>(4)

  return (
    <div>
      <SectionHeader title="Платежи" sub="Коммунальные взносы · Квартира 14Б" />

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'К оплате', value: '19 000 ₸', sub: 'Октябрь 2026', urgent: true },
          { label: 'Оплачено в 2026', value: '214 500 ₸', sub: '9 месяцев' },
          { label: 'Задолженность', value: '0 ₸', sub: 'Нет просроченных' },
        ].map(s => (
          <Card key={s.label} className={`p-4 ${s.urgent ? 'border-[#A07C12]' : ''}`}>
            <div className={`text-xl font-bold ${s.urgent ? 'text-[#A07C12]' : 'text-[#2C4A1A]'}`}>{s.value}</div>
            <div className="text-xs text-[#697050] mt-0.5">{s.label}</div>
            <div className="text-[10px] font-mono text-[#697050] mt-0.5">{s.sub}</div>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        {PAYMENTS.map(p => (
          <Card key={p.id}>
            <button
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#F8F7F4] transition-colors"
              onClick={() => setExpanded(expanded === p.id ? null : p.id)}
            >
              <Badge label={p.status} />
              <span className="flex-1 text-sm font-medium text-[#1E2A0E]">{p.month}</span>
              <span className="font-mono text-sm font-semibold text-[#2C4A1A]">{p.amount.toLocaleString()} ₸</span>
              <span className="text-[#697050] text-xs font-mono">{p.date}</span>
              <span className="text-[#697050] text-xs ml-1">{expanded === p.id ? '▲' : '▼'}</span>
            </button>
            {expanded === p.id && (
              <div className="px-4 pb-4 border-t border-[#F6F5DC]">
                <div className="pt-3 space-y-1.5">
                  {Object.entries(p.breakdown).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-[#697050] capitalize">{
                        k === 'communal' ? 'Коммунальные' :
                        k === 'repair' ? 'Ремонтный фонд' :
                        k === 'security' ? 'Охрана' : 'Уборка'
                      }</span>
                      <span className="font-mono font-medium text-[#1E2A0E]">{(v as number).toLocaleString()} ₸</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-[#F6F5DC]">
                    <span>Итого</span>
                    <span className="font-mono">{p.amount.toLocaleString()} ₸</span>
                  </div>
                </div>
                {p.status === 'Due' && (
                  <button className="mt-4 w-full bg-[#A07C12] hover:bg-[#836208] text-white font-semibold py-2.5 rounded text-sm transition-colors">
                    Оплатить онлайн
                  </button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

// owner profile
function OwnerView() {
  return (
    <div>
      <SectionHeader title="Мои объекты" sub="Управление арендованными квартирами" />
      <div className="space-y-4">
        {RENTED_FLATS.map(f => (
          <Card key={f.flat} className={`p-5 ${!f.paid ? 'border-red-200' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-lg font-bold text-[#2C4A1A]">Кв. {f.flat}</div>
                <div className="text-sm text-[#697050]">Арендатор: {f.tenant}</div>
                <div className="text-xs font-mono text-[#697050] mt-0.5">С {f.since}</div>
              </div>
              <Badge label={f.paid ? 'Paid' : 'Due'} />
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#F6F5DC]">
              <div>
                <div className="text-xs text-[#697050] mb-0.5">Следующий платёж</div>
                <div className="text-sm font-semibold text-[#1E2A0E] font-mono">{f.nextDue}</div>
              </div>
              <div>
                <div className="text-xs text-[#697050] mb-0.5">Активных заявок</div>
                <div className={`text-sm font-semibold font-mono ${f.requests > 0 ? 'text-[#A07C12]' : 'text-[#1E2A0E]'}`}>{f.requests}</div>
              </div>
              <div>
                <div className="text-xs text-[#697050] mb-0.5">Статус</div>
                <div className="text-sm font-semibold text-emerald-700">{f.paid ? 'Нет задолженности' : '⚠ Просрочен'}</div>
              </div>
            </div>
            {!f.paid && (
              <div className="mt-3 pt-3 border-t border-red-100">
                <p className="text-xs text-red-700 mb-2">Платёж за {f.nextDue} не получен. Уведомление отправлено арендатору.</p>
                <button className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded font-medium transition-colors">
                  Отправить напоминание
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

// MAIN
export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [view, setView] = useState<View>('dashboard')

  if (!user) return <LoginView onLogin={u => { setUser(u); setView('dashboard') }} />

  const views: Record<View, React.ReactNode> = {
    login: null,
    dashboard: <DashboardView onNav={setView} />,
    news: <NewsView />,
    report: <ReportView />,
    requests: <RequestsView />,
    outages: <OutagesView />,
    alerts: <AlertsView />,
    complaints: <ComplaintsView />,
    voting: <VotingView />,
    payments: <PaymentsView />,
    owner: <OwnerView />,
  }

  return (
    <div className="flex min-h-screen" style={{background:'#F6F5DC'}}>
      <Sidebar current={view} onNav={setView} user={user} onLogout={() => setUser(null)} />
      <main className="flex-1 p-6 overflow-auto max-w-5xl">
        {views[view]}
      </main>
    </div>
  )
}
