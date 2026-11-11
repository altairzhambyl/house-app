import { useMemo, useState } from 'react'
import { Badge, Card, SectionHeader } from '../components/ui'
import { useLocale, useLocalize, useT } from '../i18n'
import type { Tone } from '../lib/format'
import { MOCK_VOTES, type VoteChoice, type VoteStatus } from '../mock/data'
import { m } from './VotingView.i18n'

const STATUS_TONE: Record<VoteStatus, Tone> = { open: 'green', closed: 'gray' }
const CHOICES: readonly VoteChoice[] = ['yes', 'no', 'abstain']
const BAR_COLOR: Record<VoteChoice, string> = { yes: 'bg-emerald-500', no: 'bg-red-400', abstain: 'bg-gray-300' }
const BUTTON_CLS: Record<VoteChoice, string> = {
  yes: 'border-emerald-400 text-emerald-700 hover:bg-emerald-50',
  no: 'border-red-400 text-red-700 hover:bg-red-50',
  abstain: 'border-gray-300 text-gray-600 hover:bg-gray-50',
}

// voting
export function VotingView() {
  const t = useT(m)
  const L = useLocalize()
  const { formatDate, formatNumber, locale } = useLocale()
  const percent = useMemo(() => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }), [locale])
  const [votes, setVotes] = useState(MOCK_VOTES)

  function vote(id: number, choice: VoteChoice) {
    setVotes(vs => vs.map(v => v.id === id ? { ...v, voted: true, myVote: choice, [choice]: v[choice] + 1 } : v))
  }

  return (
    <div>
      <SectionHeader demo title={t('title')} sub={t('sub')} />
      <div className="space-y-4">
        {votes.map(v => {
          const share = (n: number) => (v.total > 0 ? n / v.total : 0)
          return (
            <Card key={v.id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge label={t(`status_${v.status}`)} tone={STATUS_TONE[v.status]} />
                    <span className="text-[11px] font-mono text-[#697050]">{t('deadline', { date: formatDate(v.deadline) })}</span>
                  </div>
                  <h3 className="font-semibold text-[#2C4A1A]">{L(v.title)}</h3>
                </div>
              </div>

              {/* Vote bars */}
              <div className="space-y-2 mb-4">
                {CHOICES.map(key => {
                  const n = v[key]
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-[#697050] w-28">{t(`tally_${key}`)}</span>
                      <div className="flex-1 bg-[#F6F5DC] rounded-full h-2" aria-hidden="true">
                        <div className={`h-2 rounded-full ${BAR_COLOR[key]} transition-all`} style={{ width: `${Math.round(share(n) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-[#697050] w-16 text-right">
                        {t('barCount', { count: formatNumber(n), pct: percent.format(share(n)) })}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-[#697050]">
                  {t('turnout', { voted: formatNumber(v.yes + v.no + v.abstain), total: formatNumber(v.total) })}
                </span>
                {v.status === 'open' && !v.voted && (
                  <div className="flex flex-wrap gap-2">
                    {CHOICES.map(c => (
                      <button key={c} onClick={() => vote(v.id, c)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${BUTTON_CLS[c]}`}
                      >{t(`choice_${c}`)}</button>
                    ))}
                  </div>
                )}
                {v.voted && v.myVote && (
                  <span className="text-xs text-emerald-700 font-medium">{t(`youVoted_${v.myVote}`)}</span>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
