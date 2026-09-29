import { useState } from 'react'
import { Badge, Card, SectionHeader } from '../components/ui'
import { COMPLAINTS } from '../mock/data'

// complaints
export function ComplaintsView() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ about: '', subject: '', detail: '' })
  const [submitted, setSubmitted] = useState(false)

  return (
    <div>
      <SectionHeader demo title="Жалобы на соседей" sub="Анонимное обращение к управляющему" />

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
