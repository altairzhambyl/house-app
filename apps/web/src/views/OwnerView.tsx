import { Badge, Card, SectionHeader } from '../components/ui'
import { RENTED_FLATS } from '../mock/data'

// owner profile
export function OwnerView() {
  return (
    <div>
      <SectionHeader demo title="Мои объекты" sub="Управление арендованными квартирами" />
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
