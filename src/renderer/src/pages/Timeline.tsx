import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CalendarDays, Gamepad2 } from "lucide-react"
import { Link } from "react-router-dom"
import type { SessionWithGame } from "@shared/types"
import { SESSION_END_REASON_LABELS } from "@shared/constants"

const RANGE_OPTIONS = [7, 30, 90]

function toSqliteDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return year + "-" + month + "-" + day + " 00:00:00"
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? hours + " 小时 " + minutes + " 分钟" : minutes + " 分钟"
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
}

export default function Timeline(): React.ReactElement {
  const [days, setDays] = useState(30)
  const end = new Date()
  end.setDate(end.getDate() + 1)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))

  const { data: sessions = [], isLoading } = useQuery<SessionWithGame[]>({
    queryKey: ["sessions", "timeline", days],
    queryFn: () => window.api.session.getByDateRange(toSqliteDate(start), toSqliteDate(end)),
  })

  const groups = sessions.reduce<Record<string, SessionWithGame[]>>((result, session) => {
    const date = session.started_at.slice(0, 10)
    ;(result[date] ??= []).push(session)
    return result
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-archive-100">时间线</h2>
          <p className="text-sm text-archive-500 mt-0.5">按日期回顾每一次已记录的游玩。</p>
        </div>
        <div className="flex gap-1.5">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setDays(option)}
              className={"px-3 py-1.5 text-xs rounded-archive border " + (days === option ? "bg-accent-teal/20 text-accent-teal border-accent-teal/30" : "bg-archive-800 text-archive-400 border-archive-700/50")}
            >
              近 {option} 天
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="card text-center py-12 text-archive-500">加载中...</div>
      ) : Object.keys(groups).length === 0 ? (
        <div className="card text-center py-16">
          <CalendarDays size={44} className="text-archive-700 mx-auto mb-3" />
          <p className="text-archive-400">这个时间段内没有游玩记录。</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([date, daySessions]) => {
            const total = daySessions.reduce((sum, session) => sum + session.duration_seconds, 0)
            return (
              <section key={date} className="card">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-archive-700/50">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={15} className="text-accent-teal" />
                    <h3 className="text-sm font-medium text-archive-200">{new Date(date + "T00:00:00").toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}</h3>
                  </div>
                  <span className="text-xs text-archive-400">合计 {formatDuration(total)}</span>
                </div>
                <div className="space-y-2">
                  {daySessions.map((session) => (
                    <Link key={session.id} to={"/games/" + session.game_id} className="flex items-center justify-between gap-4 p-3 rounded bg-archive-850 hover:bg-archive-700/60 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Gamepad2 size={15} className="text-archive-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-archive-200 truncate">{session.game_display_name || "未知游戏"}</p>
                          <p className="text-xs text-archive-500 mt-0.5">{formatTime(session.started_at)}{session.ended_at ? " - " + formatTime(session.ended_at) : " - 进行中"} · {session.exe_name}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-archive-200">{formatDuration(session.duration_seconds)}</p>
                        {session.end_reason && <p className="text-[10px] text-archive-600 mt-0.5">{SESSION_END_REASON_LABELS[session.end_reason]}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
