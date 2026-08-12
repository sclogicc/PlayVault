import { useQuery } from '@tanstack/react-query'
import { Clock3, Gamepad2, Image, ArrowUpRight, Sparkles, PlayCircle, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GameWithStats, SessionWithGame } from '@shared/types'
import { getCoverImageStyle, parseCoverCrop } from '@shared/coverCrop'
import { toFileUrl } from '../lib/fileUrl'

function toSqliteDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day} 00:00:00`
}

function startOfDay(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 分钟'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours} 小时 ${minutes} 分钟` : `${minutes} 分钟`
}

function sumDuration(sessions: SessionWithGame[]): number {
  return sessions.reduce((total, session) => total + session.duration_seconds, 0)
}

function formatRelativeDate(value: string | null): string {
  if (!value) return '尚未游玩'
  const date = new Date(value.replace(' ', 'T'))
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days <= 0) return '今天游玩'
  if (days === 1) return '昨天游玩'
  if (days < 7) return `${days} 天前游玩`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
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
    queryKey: ['games', 'dashboard'],
    queryFn: () => window.api.game.getAll(),
  })
  const { data: sessions = [], isLoading } = useQuery<SessionWithGame[]>({
    queryKey: ['sessions', 'dashboard', toSqliteDate(month)],
    queryFn: () => window.api.session.getByDateRange(toSqliteDate(month), toSqliteDate(tomorrow)),
  })
  const { data: pendingCount = 0 } = useQuery<number>({
    queryKey: ['screenshots', 'pending-count'],
    queryFn: () => window.api.screenshot.getPendingCount(),
  })

  const todaySessions = sessions.filter((session) => session.started_at >= toSqliteDate(today))
  const weekSessions = sessions.filter((session) => session.started_at >= toSqliteDate(week))
  const recentGames = [...games]
    .filter((game) => game.last_played_at)
    .sort((a, b) => (b.last_played_at ?? '').localeCompare(a.last_played_at ?? ''))
    .slice(0, 6)
  const featuredGame = recentGames[0]

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-violet">
            <Sparkles size={14} />
            你的游戏足迹
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-archive-50">欢迎回来</h2>
          <p className="mt-2 text-sm text-archive-400">从最近游玩的游戏开始，继续整理你的本地游戏经历。</p>
        </div>
        <Link to="/timeline" className="btn-secondary inline-flex items-center gap-2 rounded-archive">
          <CalendarDays size={15} />
          查看时间线
        </Link>
      </header>

      <section className="relative min-h-[270px] overflow-hidden rounded-panel border border-white/[0.09] bg-archive-850 shadow-panel">
        {featuredGame?.background_path && (
          <img
            src={toFileUrl(featuredGame.background_path)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-55"
            style={getCoverImageStyle(parseCoverCrop(featuredGame.background_crop))}
          />
        )}
        {featuredGame?.cover_path && !featuredGame.background_path && (
          <img
            src={toFileUrl(featuredGame.cover_path)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-35 blur-sm scale-110"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,14,22,0.96)_5%,rgba(8,14,22,0.74)_42%,rgba(8,14,22,0.18)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(8,14,22,0.72),transparent_55%)]" />
        <div className="relative flex min-h-[270px] max-w-2xl flex-col justify-end p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">继续回顾</p>
          {featuredGame ? (
            <>
              <h3 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{featuredGame.display_name}</h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-archive-200">已累计游玩 {formatDuration(featuredGame.total_duration)}，{formatRelativeDate(featuredGame.last_played_at)}。</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={`/games/${featuredGame.id}`} className="btn-primary inline-flex items-center gap-2 rounded-archive">
                  <PlayCircle size={16} />
                  打开游戏档案
                </Link>
                <Link to="/games" className="btn-secondary inline-flex items-center gap-2 rounded-archive bg-black/20">
                  查看全部游戏
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </>
          ) : (
            <>
              <h3 className="mt-3 text-3xl font-bold tracking-tight text-white">建立你的第一份游戏档案</h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-archive-300">添加本地游戏并绑定可执行文件后，PlayVault 会开始记录每一次游玩经历。</p>
              <div className="mt-6">
                <Link to="/games" className="btn-primary inline-flex items-center gap-2 rounded-archive">
                  <Gamepad2 size={16} />
                  前往游戏库
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="今日游玩" value={formatDuration(sumDuration(todaySessions))} caption="以已结束的游玩记录统计" icon={<Clock3 size={18} />} accent="violet" />
        <StatCard label="近 7 天" value={formatDuration(sumDuration(weekSessions))} caption="最近一周的累计时长" icon={<PlayCircle size={18} />} accent="teal" />
        <StatCard label="近 30 天" value={formatDuration(sumDuration(sessions))} caption={`${games.length} 个游戏已建立档案`} icon={<Gamepad2 size={18} />} accent="gold" />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="card overflow-hidden !p-0">
          <div className="flex items-center justify-between px-5 pb-2 pt-5 sm:px-6">
            <div>
              <h3 className="section-title">最近游玩</h3>
              <p className="section-description">从你的游戏档案中继续浏览</p>
            </div>
            <Link to="/games" className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 transition-colors hover:text-violet-200">
              全部游戏 <ArrowUpRight size={14} />
            </Link>
          </div>
          {isLoading ? (
            <p className="px-6 py-14 text-center text-sm text-archive-500">正在载入你的游戏经历…</p>
          ) : recentGames.length === 0 ? (
            <div className="m-5 empty-state">
              <Gamepad2 size={30} className="mx-auto text-archive-600" />
              <p className="mt-3 text-sm text-archive-300">暂无游玩历史</p>
              <p className="mt-1 text-xs text-archive-500">启动一次已绑定的游戏后，记录会自动出现在这里。</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 sm:p-6 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
              {recentGames.map((game) => <RecentGameCard key={game.id} game={game} />)}
            </div>
          )}
        </div>

        <div className="card flex min-h-[230px] flex-col justify-between overflow-hidden bg-[linear-gradient(145deg,rgba(117,81,224,0.18),rgba(29,39,53,0.82)_48%,rgba(29,39,53,0.95))]">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/10 text-violet-200">
              <Image size={18} />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">截图整理</p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-archive-50">{pendingCount}</p>
            <p className="mt-1 text-sm text-archive-400">张截图等待整理</p>
          </div>
          <Link to="/screenshots" className="mt-6 inline-flex items-center justify-between rounded-archive border border-white/[0.09] bg-black/15 px-3.5 py-2.5 text-sm font-medium text-archive-100 transition-colors hover:bg-white/[0.08]">
            打开截图箱 <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  caption,
  icon,
  accent,
}: {
  label: string
  value: string
  caption: string
  icon: React.ReactNode
  accent: 'violet' | 'teal' | 'gold'
}): React.ReactElement {
  const accentStyles = {
    violet: 'border-violet-300/15 bg-violet-400/10 text-violet-200',
    teal: 'border-teal-300/15 bg-teal-400/10 text-teal-200',
    gold: 'border-amber-300/15 bg-amber-400/10 text-amber-200',
  }

  return (
    <div className="card relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-archive-400">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-archive-50">{value}</p>
        </div>
        <span className={`rounded-xl border p-2.5 ${accentStyles[accent]}`}>{icon}</span>
      </div>
      <p className="mt-3 text-xs text-archive-500">{caption}</p>
    </div>
  )
}

function RecentGameCard({ game }: { game: GameWithStats }): React.ReactElement {
  return (
    <Link
      to={`/games/${game.id}`}
      className="group relative aspect-[2/3] overflow-hidden rounded-archive border border-white/[0.08] bg-archive-900 shadow-[0_10px_25px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-300/45 hover:shadow-glow"
    >
      {game.cover_path ? (
        <img
          src={toFileUrl(game.cover_path)}
          alt={`${game.display_name} 封面`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          style={getCoverImageStyle(parseCoverCrop(game.cover_crop))}
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_10%,rgba(139,92,246,0.28),transparent_45%),linear-gradient(150deg,#24344a,#111a27)]">
          <Gamepad2 size={34} className="text-archive-500" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-archive-950 via-archive-950/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="truncate text-sm font-semibold text-white">{game.display_name}</p>
        <p className="mt-1 text-xs text-archive-300">{formatDuration(game.total_duration)}</p>
      </div>
    </Link>
  )
}
