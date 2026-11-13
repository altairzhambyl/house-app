import { useState } from 'react'
import { Badge, Card, SectionHeader } from '../components/ui'
import { useLocale, useLocalize, useT } from '../i18n'
import type { Tone } from '../lib/format'
import { MOCK_COMPLAINTS, type ComplaintStatus } from '../mock/data'
import type { Resident } from '../types'
import { m } from './ComplaintsView.i18n'

const STATUS_TONE: Record<ComplaintStatus, Tone> = { review: 'amber', resolved: 'green', closed: 'gray' }

// Flat numbers are typed by hand, often with Cyrillic letters ('13А' vs '13A').
function sameFlat(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\s/g, '').toUpperCase()
    .replace(/А/g, 'A').replace(/[БВ]/g, 'B').replace(/С/g, 'C').replace(/Е/g, 'E')
  return norm(a) === norm(b)
}

// complaints
export function ComplaintsView({ resident }: { resident: Resident }) {
  const t = useT(m)
  const L = useLocalize()
  const { formatDate } = useLocale()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ about: '', subject: '', detail: '' })
  const [submitted, setSubmitted] = useState(false)
  // The mock history belongs to one demo sender. A resident must never see a
  // complaint about their own flat presented as one they filed (ITP-54).
  const own = resident.flat_number
  const history = own === null ? MOCK_COMPLAINTS : MOCK_COMPLAINTS.filter(c => c.aboutFlat === null || !sameFlat(c.aboutFlat, own))

  return (
    <div>
      <SectionHeader demo title={t('title')} sub={t('sub')} />

      <div className="flex gap-3 mb-5">
        <button
          onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm}
          className="bg-[#A07C12] hover:bg-[#836208] text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
        >
          {t('fileComplaint')}
        </button>
      </div>

      {showForm && !submitted && (
        <Card className="p-5 mb-5 max-w-lg">
          <h3 className="font-semibold text-[#2C4A1A] mb-4">{t('newComplaint')}</h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="complaint-about" className="text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5">{t('aboutFlat')}</label>
              <input id="complaint-about" className="w-full border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A]"
                placeholder={t('aboutPlaceholder')} value={form.about} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="complaint-subject" className="text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5">{t('subject')}</label>
              <input id="complaint-subject" className="w-full border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A]"
                placeholder={t('subjectPlaceholder')} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="complaint-detail" className="text-xs font-mono text-[#697050] uppercase tracking-wider block mb-1.5">{t('details')}</label>
              <textarea id="complaint-detail" className="w-full border border-[#D6D3A8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A1A] resize-none h-20"
                value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} />
            </div>
            <p className="text-[11px] text-[#697050]">{t('anonymousInfo')}</p>
            <button onClick={() => setSubmitted(true)}
              className="w-full bg-[#2C4A1A] hover:bg-[#3A6022] text-white text-sm font-semibold py-2 rounded transition-colors">
              {t('send')}
            </button>
          </div>
        </Card>
      )}
      {submitted && (
        <div role="status" className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-5 text-sm text-amber-900">
          {t('accepted')}
        </div>
      )}

      <h3 className="font-semibold text-[#2C4A1A] mb-3 text-sm">{t('history')}</h3>
      <div className="space-y-2">
        {history.map(c => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge label={t(`status_${c.status}`)} tone={STATUS_TONE[c.status]} />
                  <time dateTime={c.date} className="text-[11px] font-mono text-[#697050]">{formatDate(c.date)}</time>
                </div>
                <p className="text-sm font-medium text-[#1E2A0E]">{L(c.subject)}</p>
                <p className="text-xs text-[#697050] mt-0.5">
                  {/* Only the target: the sender's flat is for the manager's eyes (ITP-54). */}
                  {c.aboutFlat === null ? t('aboutCommon') : t('aboutFlatTarget', { about: c.aboutFlat })}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
