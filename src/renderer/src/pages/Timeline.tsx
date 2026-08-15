/* 视觉基线：冷墨月度日志，时间范围和汇总是玻璃工具层，日记录保持克制的分层阅读。 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock3, Gamepad2, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GameWithStats, SessionWithGame } from '@shared/types'
import type { GameStatus } from '@shared/constants'
import { SESSION_END_REASON_LABELS } from '@shared/constants'
import StatusBadge from '../components/ui/StatusBadge'

const RANGE_OPTIONS = [30, 90, 180, 365]

function toSqliteDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day} 00:00:00`
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours} 小时 ${minutes} 分钟` : `${minutes} 分钟`
}

function formatTime(date: string): string {
  return new Date(date.replace(' ', 'T')).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatMonth(monthKey: string): string {
  return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
}

export default function Timeline(): React.ReactElement {
  const [days, setDays] = useState(90)
  const end = new Date()
  end.setDate(end.getDate() + 1)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))

  const { data: sessions = [], isLoading } = useQuery<SessionWithGame[]>({
    queryKey: ['sessions', 'timeline', days],
    queryFn: () => window.api.session.getByDateRange(toSqliteDate(start), toSqliteDate(end)),
  })
  const { data: games = [] } = useQuery<GameWithStats[]>({
    queryKey: ['games', 'timeline-status'],
    queryFn: () => window.api.game.getAll({ includeHidden: true }),
  })

  const gameById = useMemo(() => new Map(games.map((game) => [game.id, game])), [games])
  const monthGroups = useMemo(() => {
    const months = new Map<string, Map<string, SessionWithGame[]>>()
    for (const session of sessions) {
      const dayKey = session.started_at.slice(0, 10)
      const monthKey = dayKey.slice(0, 7)
      const daysInMonth = months.get(monthKey) ?? new Map<string, SessionWithGame[]>()
      const daySessions = daysInMonth.get(dayKey) ?? []
      daySessions.push(session)
      daysInMonth.set(dayKey, daySessions)
      months.set(monthKey, daysInMonth)
    }
    return [...months.entries()].sort(([left], [right]) => right.localeCompare(left))
  }, [sessions])

  const totalDuration = sessions.reduce((sum, session) => sum + session.duration_seconds, 0)
  const activeGameCount = new Set(sessions.map((session) => session.game_id)).size

  return (
    <div className="pv-page space-y-6">
      <header className="pv-page-header">
        <div>
          <p className="eyebrow">私人游戏日志</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h1 className="page-title">时间回顾</h1><span className="text-[13px] text-archive-500">近 {days} 天</span></div>
          <p className="pv-page-copy">按月份回看真正游玩过的游戏，而不是只浏览一张静态的游戏清单。</p>
        </div>
        <div className="pv-toolbar flex gap-1 p-1" aria-label="时间范围">
          {RANGE_OPTIONS.map((option) => <button key={option} type="button" data-active={days === option} aria-pressed={days === option} onClick={() => setDays(option)} className="pv-segment min-h-7 px-2.5 text-[11px] font-medium">近 {option} 天</button>)}
        </div>
      </header>

      <section className="pv-panel grid grid-cols-1 gap-px overflow-hidden bg-white/[0.065] sm:grid-cols-3" aria-label="时间范围汇总">
        <TimelineStat icon={<History size={15} />} label="游玩记录" value={`${sessions.length} 次`} />
        <TimelineStat icon={<Clock3 size={15} />} label="累计游玩" value={formatDuration(totalDuration)} accent />
        <TimelineStat icon={<Gamepad2 size={15} />} label="涉及游戏" value={`${activeGameCount} 款`} />
      </section>

      {isLoading ? <div className="py-24 text-center text-sm text-archive-500">正在整理本地游玩轨迹…</div> : monthGroups.length === 0 ? (
        <div className="py-28 text-center"><CalendarDays size={30} className="mx-auto text-archive-600" /><h2 className="mt-5 font-serif text-2xl text-archive-200">这段时间还没有游玩痕迹</h2><p className="mt-2 text-sm text-archive-500">绑定本地可执行文件后，启动游戏即可自动生成记录。</p></div>
      ) : (
        <div className="space-y-12">
          {monthGroups.map(([monthKey, dayMap]) => {
            const daysInMonth = [...dayMap.entries()].sort(([left], [right]) => right.localeCompare(left))
            const monthSessions = daysInMonth.flatMap(([, daySessions]) => daySessions)
            const monthDuration = monthSessions.reduce((sum, session) => sum + session.duration_seconds, 0)
            const monthGames = new Set(monthSessions.map((session) => session.game_id)).size
            return (
              <section key={monthKey} className="border-t border-white/[0.075] pt-6">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">月度回顾</p><h2 className="mt-2 font-serif text-[1.7rem] font-medium leading-none tracking-[-0.03em] text-archive-100 sm:text-[2rem]">{formatMonth(monthKey)}</h2></div><p className="text-[11px] tracking-[0.02em] text-archive-500">{monthGames} 款游戏　·　{monthSessions.length} 次记录　·　{formatDuration(monthDuration)}</p></div>
                <div className="space-y-5">
                  {daysInMonth.map(([date, daySessions]) => <DayLog key={date} date={date} sessions={daySessions} gameById={gameById} />)}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TimelineStat({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }): React.ReactElement {
  return <div className="bg-[var(--pv-surface)]/72 px-5 py-4 transition-colors duration-300"><div className="flex items-center gap-2 text-archive-500">{icon}<span className="text-[10px] font-semibold tracking-[0.12em]">{label}</span></div><p className={`mt-3 font-serif text-[1.65rem] font-medium leading-none tracking-[-0.02em] ${accent ? 'text-[var(--pv-accent-strong)]' : 'text-archive-50'}`}>{value}</p></div>
}

function DayLog({ date, sessions, gameById }: { date: string; sessions: SessionWithGame[]; gameById: Map<number, GameWithStats> }): React.ReactElement {
  const dayDuration = sessions.reduce((sum, session) => sum + session.duration_seconds, 0)
  return (
    <article className="pv-panel overflow-hidden transition-[border-color,background-color] duration-300 hover:border-white/[0.16] hover:bg-white/[0.027]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] px-4 py-3.5"><div className="flex items-center gap-2"><CalendarDays size={14} className="text-[var(--pv-accent-strong)]" /><h3 className="text-[15px] font-medium tracking-[-0.01em] text-archive-200">{new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</h3></div><span className="text-[11px] tracking-[0.01em] text-archive-500">{sessions.length} 次 · {formatDuration(dayDuration)}</span></header>
      <div className="divide-y divide-white/[0.055]">
        {sessions.map((session) => {
          const game = gameById.get(session.game_id)
          return <Link key={session.id} to={`/games/${session.game_id}`} className="group flex items-center justify-between gap-4 px-4 py-3.5 transition-[background-color,transform] duration-200 hover:translate-x-0.5 hover:bg-white/[0.035]"><div className="flex min-w-0 items-center gap-3"><span className="rounded-md bg-white/[0.055] p-2 text-archive-500 transition-colors group-hover:bg-[color:color-mix(in_srgb,var(--pv-accent)_10%,transparent)] group-hover:text-[var(--pv-accent-strong)]"><Gamepad2 size={14} /></span><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium text-archive-200 group-hover:text-archive-50">{session.game_display_name || '未知游戏'}</p>{game && <StatusBadge status={game.status as GameStatus} />}{game?.archive_status === 'archived' && <span className="hidden text-[10px] text-[#c3e0ea] sm:inline">已留档</span>}</div><p className="mt-1 truncate text-xs text-archive-500">{formatTime(session.started_at)}{session.ended_at ? ` – ${formatTime(session.ended_at)}` : ' – 进行中'} · {session.exe_name}</p></div></div><div className="shrink-0 text-right"><p className="text-xs font-medium text-archive-200">{formatDuration(session.duration_seconds)}</p>{session.end_reason && <p className="mt-1 text-[10px] text-archive-600">{SESSION_END_REASON_LABELS[session.end_reason]}</p>}</div></Link>
        })}
      </div>
    </article>
  )
}
