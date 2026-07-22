import { useQuery } from "@tanstack/react-query"
import { Clock3, Gamepad2, Image, PlayCircle } from "lucide-react"
import { Link } from "react-router-dom"
import type { GameWithStats, SessionWithGame } from "@shared/types"

function toSqliteDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return year + "-" + month + "-" + day + " 00:00:00"
}

function startOfDay(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0 分钟"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? hours + " 小时 " + minutes + " 分钟" : minutes + " 分钟"
}

function sumDuration(sessions: SessionWithGame[]): number {
  return sessions.reduce((total, session) => total + session.duration_seconds, 0)
}

export default function Dashboard(): React.ReactElement {
  const today = startOfDay()
  const week = new Date(today)
  week.setDate(week.getDate() - 6)
  const month = new Date(today)
  month.setDate(month.getDate() - 29)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: games = [] } = useQuery<GameWithStats[]>({
    queryKey: ["games", "dashboard"],
    queryFn: () => window.api.game.getAll(),
  })
  const { data: sessions = [], isLoading } = useQuery<SessionWithGame[]>({
    queryKey: ["sessions", "dashboard", toSqliteDate(month)],
    queryFn: () => window.api.session.getByDateRange(toSqliteDate(month), toSqliteDate(tomorrow)),
  })
  const { data: pendingCount = 0 } = useQuery<number>({
    queryKey: ["screenshots", "pending-count"],
    queryFn: () => window.api.screenshot.getPendingCount(),
  })

  const todaySessions = sessions.filter((session) => session.started_at >= toSqliteDate(today))
  const weekSessions = sessions.filter((session) => session.started_at >= toSqliteDate(week))
  const recentGames = [...games]
    .filter((game) => game.last_played_at)
    .sort((a, b) => (b.last_played_at ?? "").localeCompare(a.last_played_at ?? ""))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-archive-100">总览</h2>
        <p className="text-sm text-archive-500 mt-0.5">记录并回顾你的本地单机游戏经历。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="今日游玩" value={formatDuration(sumDuration(todaySessions))} icon={<Clock3 size={18} />} />
        <StatCard label="近 7 天" value={formatDuration(sumDuration(weekSessions))} icon={<PlayCircle size={18} />} />
        <StatCard label="近 30 天" value={formatDuration(sumDuration(sessions))} icon={<Gamepad2 size={18} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-archive-200">最近游玩</h3>
            <Link to="/timeline" className="text-xs text-accent-teal hover:underline">查看时间线</Link>
          </div>
          {isLoading ? (
            <p className="text-sm text-archive-500">加载中...</p>
          ) : recentGames.length === 0 ? (
            <p className="text-sm text-archive-500">暂无游玩历史。启动一次已绑定的游戏后，PlayVault 会自动开始记录。</p>
          ) : (
            <div className="space-y-2">
              {recentGames.map((game) => (
                <Link key={game.id} to={"/games/" + game.id} className="flex items-center justify-between gap-4 py-2.5 px-3 rounded bg-archive-850 hover:bg-archive-700/60 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-archive-200 truncate">{game.display_name}</p>
                    <p className="text-xs text-archive-500 mt-0.5">最近游玩：{new Date(game.last_played_at as string).toLocaleString("zh-CN")}</p>
                  </div>
                  <span className="text-xs text-archive-300 shrink-0">{formatDuration(game.total_duration)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Image size={16} className="text-accent-gold" />
            <h3 className="text-sm font-medium text-archive-200">截图箱</h3>
          </div>
          <p className="text-3xl font-semibold text-archive-100 mt-3">{pendingCount}</p>
          <p className="text-sm text-archive-500 mt-1">张截图等待整理</p>
          <Link to="/screenshots" className="mt-5 text-sm text-accent-teal hover:underline">打开截图箱</Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }): React.ReactElement {
  return (
    <div className="card">
      <div className="flex items-center justify-between text-archive-500">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-archive-100 mt-3">{value}</p>
    </div>
  )
}
