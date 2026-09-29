import { useState } from 'react'
import { Badge, Card, SectionHeader } from '../components/ui'
import { VOTES, type VoteChoice } from '../mock/data'

// voting
export function VotingView() {
  const [votes, setVotes] = useState(VOTES)

  function vote(id: number, choice: VoteChoice) {
    setVotes(vs => vs.map(v => v.id === id ? { ...v, voted: true, myVote: choice, [choice]: v[choice] + 1 } : v))
  }

  return (
    <div>
      <SectionHeader demo title="Голосования" sub="Решения принимаются большинством голосов собственников" />
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
