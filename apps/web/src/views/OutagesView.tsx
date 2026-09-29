import { Badge, Card, SectionHeader } from '../components/ui'
import { OUTAGES } from '../mock/data'

// outages
export function OutagesView() {
  const typeIcon: Record<string, string> = { Water: '💧', Electricity: '⚡', Heating: '🔥', Elevator: '🛗' }

  return (
    <div>
      <SectionHeader demo title="Плановые отключения" sub="Запланированные работы и перебои в обслуживании" />
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
