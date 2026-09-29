import { SectionHeader } from '../components/ui'

// ALERTS
export function AlertsView() {
  const alerts = [
    { id: 1, time: '29 Sep 2026 08:45', title: 'Отключение воды', body: 'Горячая и холодная вода отключены до 14:00. Причина: плановая проверка давления в трубах.', level: 'warning' },
    { id: 2, time: '15 Sep 2026 19:10', title: 'Задымление в подвале', body: 'Пожарная служба выезжала на ложное срабатывание датчика в подвале. Угрозы нет.', level: 'danger' },
    { id: 3, time: '1 Sep 2026 07:00', title: 'Отопительный сезон', body: 'С 1 октября начинается отопительный сезон. Ожидается запуск систем в срок.', level: 'info' },
  ]
  const color: Record<string, string> = { warning: 'border-amber-300 bg-amber-50', danger: 'border-red-300 bg-red-50', info: 'border-blue-200 bg-blue-50' }
  const icon: Record<string, string> = { warning: '⚠️', danger: '🚨', info: 'ℹ️' }

  return (
    <div>
      <SectionHeader demo title="Экстренные уведомления" sub="Важные сообщения от управления и аварийных служб" />
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
