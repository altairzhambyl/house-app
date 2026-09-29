import { useState } from 'react'
import { Badge, Card, SectionHeader } from '../components/ui'
import { PAYMENTS } from '../mock/data'

// payments
export function PaymentsView() {
  const [expanded, setExpanded] = useState<number | null>(4)

  return (
    <div>
      <SectionHeader demo title="Платежи" sub="Коммунальные взносы · Квартира 14Б" />

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
