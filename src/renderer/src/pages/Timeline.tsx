import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock3, Gamepad2, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SessionWithGame } from '@shared/types'
import { SESSION_END_REASON_LABELS } from '@shared/constants'

const RANGE_OPTIONS = [7, 30, 90]

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

export default function Timeline(): React.ReactElement {
  const [days, setDays] = useState(30)
  const end = new Date()
  end.setDate(end.getDate() + 1)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))

  const { data: sessions = [], isLoading } = useQuery<SessionWithGame[]>({
    queryKey: ['sessions', 'timeline', days],
    queryFn: () => window.api.session.getByDateRange(toSqliteDate(start), toSqliteDate(end)),
  })

  const groups = sessions.reduce<Record<string, SessionWithGame[]>>((result, session) => {
    const date = session.started_at.slice(0, 10)
    ;(result[date] ??= []).push(session)
    return result
  }, {})

  const totalDuration = sessions.reduce((sum, session) => sum + session.duration_seconds, 0)

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-violet">游玩足迹</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-archive-50">时间线</h2>
          <p className="mt-2 text-sm text-archive-400">按日期回顾每一次由 PlayVault 保存的游玩记录。</p>
        </div>
        <div className="surface-toolbar flex gap-1.5 p-1.5">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${days === option ? 'bg-accent-violet text-white shadow-[0_6px_16px_rgba(109,40,217,0.28)]' : 'text-archive-400 hover:bg-white/[0.06] hover:text-archive-200'}`}
            >
              近 {option} 天
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-panel border border-white/[0.065] bg-white/[0.035] px-5 py-4">
          <div className="flex items-center gap-2 text-archive-500"><History size={15} /><span className="text-xs font-medium">记录次数</span></div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-archive-50">{sessions.length}</p>
        </div>
        <div className="rounded-panel border border-white/[0.065] bg-white/[0.035] px-5 py-4">
          <div className="flex items-center gap-2 text-archive-500"><Clock3 size={15} /><span className="text-xs font-medium">累计游玩</span></div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-archive-50">{formatDuration(totalDuration)}</p>
        </div>
      </section>

      {isLoading ? (
        <div className="empty-state text-sm text-archive-500">正在载入你的游戏时间线…</div>
      ) : Object.keys(groups).length === 0 ? (
        <div className="empty-state">
          <CalendarDays size={42} className="mx-auto text-archive-600" />
          <p className="mt-4 text-sm text-archive-300">这个时间段内没有游玩记录</p>
          <p className="mt-1 text-xs text-archive-500">绑定游戏可执行文件后，启动游戏即可自动生成记录。</p>
        </div>
      ) : (
        <div className="relative space-y-6 before:absolute before:bottom-8 before:left-[22px] before:top-8 before:w-px before:bg-white/[0.075]">
          {Object.entries(groups).map(([date, daySessions]) => {
            const dailyDuration = daySessions.reduce((sum, session) => sum + session.duration_seconds, 0)
            return (
              <section key={date} className="relative pl-11">
                <span className="absolute left-[15px] top-6 h-4 w-4 rounded-full border-4 border-archive-950 bg-accent-violet shadow-[0_0_0_1px_rgba(167,139,250,0.35)]" />
                <div className="card">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] pb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-xl border border-violet-300/15 bg-violet-400/10 p-2 text-violet-200"><CalendarDays size={15} /></span>
                      <div>
                        <h3 className="text-sm font-semibold text-archive-100">{new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</h3>
                        <p className="mt-0.5 text-xs text-archive-500">{daySessions.length} 条游玩记录</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/[0.055] px-3 py-1.5 text-xs font-medium text-archive-300">合计 {formatDuration(dailyDuration)}</span>
                  </div>
                  <div className="space-y-2">
                    {daySessions.map((session) => (
                      <Link key={session.id} to={`/games/${session.game_id}`} className="group flex items-center justify-between gap-4 rounded-archive border border-transparent bg-black/[0.13] p-3.5 transition-all hover:border-white/[0.08] hover:bg-white/[0.055]">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="rounded-lg bg-white/[0.055] p-2 text-archive-400 transition-colors group-hover:bg-violet-400/10 group-hover:text-violet-200"><Gamepad2 size={15} /></span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-archive-200 group-hover:text-archive-50">{session.game_display_name || '未知游戏'}</p>
                            <p className="mt-1 truncate text-xs text-archive-500">{formatTime(session.started_at)}{session.ended_at ? ` – ${formatTime(session.ended_at)}` : ' – 进行中'} · {session.exe_name}</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-medium text-archive-200">{formatDuration(session.duration_seconds)}</p>
                          {session.end_reason && <p className="mt-1 text-[10px] text-archive-600">{SESSION_END_REASON_LABELS[session.end_reason]}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
