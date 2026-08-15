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
    <div className="content-canvas min-h-full space-y-7 bg-[#090a0c] px-7 py-8 sm:px-10 lg:px-12">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/[0.075] pb-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.16em] text-[#d8ba77]">私人游戏日志</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h1 className="font-serif text-3xl tracking-[-0.02em] text-archive-50 sm:text-4xl">时间回顾</h1><span className="text-sm text-archive-500">近 {days} 天</span></div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-archive-500">按月份回看真正游玩过的游戏，而不是只浏览一张静态的游戏清单。</p>
        </div>
        <div className="flex gap-4 border-b border-white/[0.075] pb-2">
          {RANGE_OPTIONS.map((option) => <button key={option} type="button" onClick={() => setDays(option)} className={`border-b pb-1 text-xs font-medium transition-colors ${days === option ? 'border-[#c9a35a] text-[#ead7aa]' : 'border-transparent text-archive-500 hover:text-archive-200'}`}>近 {option} 天</button>)}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-px border border-white/[0.065] bg-white/[0.065] sm:grid-cols-3">
        <TimelineStat icon={<History size={15} />} label="游玩记录" value={`${sessions.length} 次`} />
        <TimelineStat icon={<Clock3 size={15} />} label="累计游玩" value={formatDuration(totalDuration)} accent />
        <TimelineStat icon={<Gamepad2 size={15} />} label="涉及游戏" value={`${activeGameCount} 款`} />
      </section>

      {isLoading ? <div className="py-24 text-center text-sm text-archive-500">正在整理本地游玩轨迹…</div> : monthGroups.length === 0 ? (
        <div className="py-28 text-center"><CalendarDays size={30} className="mx-auto text-archive-600" /><h2 className="mt-5 font-serif text-2xl text-archive-200">这段时间还没有游玩痕迹</h2><p className="mt-2 text-sm text-archive-500">绑定本地可执行文件后，启动游戏即可自动生成记录。</p></div>
      ) : (
        <div className="space-y-10">
          {monthGroups.map(([monthKey, dayMap]) => {
            const daysInMonth = [...dayMap.entries()].sort(([left], [right]) => right.localeCompare(left))
            const monthSessions = daysInMonth.flatMap(([, daySessions]) => daySessions)
            const monthDuration = monthSessions.reduce((sum, session) => sum + session.duration_seconds, 0)
            const monthGames = new Set(monthSessions.map((session) => session.game_id)).size
            return (
              <section key={monthKey} className="border-t border-white/[0.075] pt-5">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-medium tracking-[0.16em] text-[#d8ba77]">月度回顾</p><h2 className="mt-1 font-serif text-2xl text-archive-100">{formatMonth(monthKey)}</h2></div><p className="text-xs text-archive-500">{monthGames} 款游戏 · {monthSessions.length} 次记录 · {formatDuration(monthDuration)}</p></div>
                <div className="space-y-4">
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
  return <div className="bg-[#111214] px-5 py-4"><div className="flex items-center gap-2 text-archive-500">{icon}<span className="text-xs font-medium">{label}</span></div><p className={`mt-3 font-serif text-2xl ${accent ? 'text-[#d8ba77]' : 'text-archive-50'}`}>{value}</p></div>
}

function DayLog({ date, sessions, gameById }: { date: string; sessions: SessionWithGame[]; gameById: Map<number, GameWithStats> }): React.ReactElement {
  const dayDuration = sessions.reduce((sum, session) => sum + session.duration_seconds, 0)
  return (
    <article className="border border-white/[0.065] bg-white/[0.02]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] px-4 py-3"><div className="flex items-center gap-2"><CalendarDays size={14} className="text-[#d8ba77]" /><h3 className="text-sm font-medium text-archive-200">{new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</h3></div><span className="text-xs text-archive-500">{sessions.length} 次 · {formatDuration(dayDuration)}</span></header>
      <div className="divide-y divide-white/[0.055]">
        {sessions.map((session) => {
          const game = gameById.get(session.game_id)
          return <Link key={session.id} to={`/games/${session.game_id}`} className="group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white/[0.035]"><div className="flex min-w-0 items-center gap-3"><span className="bg-white/[0.055] p-2 text-archive-500 transition-colors group-hover:bg-[#c9a35a]/10 group-hover:text-[#ead7aa]"><Gamepad2 size={14} /></span><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium text-archive-200 group-hover:text-archive-50">{session.game_display_name || '未知游戏'}</p>{game && <StatusBadge status={game.status as GameStatus} />}{game?.archive_status === 'archived' && <span className="hidden text-[10px] text-[#d8ba77] sm:inline">已留档</span>}</div><p className="mt-1 truncate text-xs text-archive-500">{formatTime(session.started_at)}{session.ended_at ? ` – ${formatTime(session.ended_at)}` : ' – 进行中'} · {session.exe_name}</p></div></div><div className="shrink-0 text-right"><p className="text-xs font-medium text-archive-200">{formatDuration(session.duration_seconds)}</p>{session.end_reason && <p className="mt-1 text-[10px] text-archive-600">{SESSION_END_REASON_LABELS[session.end_reason]}</p>}</div></Link>
        })}
      </div>
    </article>
  )
}
