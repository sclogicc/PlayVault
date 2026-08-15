/* 视觉基线：冷墨背景舞台与半透明指标层，媒体为主、统计退后，不使用暖金主按钮。 */
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, CalendarDays, Clock3, Gamepad2, Image, PlayCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GameWithStats, SessionWithGame } from '@shared/types'
import BackdropStage from '../components/media/BackdropStage'
import CoverFrame from '../components/media/CoverFrame'

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
    .slice(0, 7)
  const featuredGame = recentGames[0]

  return (
    <div className="pv-page !space-y-3 !p-4 sm:!p-6">
      <BackdropStage
        filePath={featuredGame?.background_path}
        crop={featuredGame?.background_crop}
        alt="最近游玩背景"
        className="h-[720px] min-h-[720px] rounded-2xl border border-white/[0.12] bg-[var(--pv-surface)] shadow-[0_22px_54px_rgba(0,0,0,0.24)]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,10,12,0.96)_0%,rgba(9,10,12,0.83)_31%,rgba(9,10,12,0.23)_70%,rgba(9,10,12,0.28)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#090a0c] via-[#090a0c]/78 to-transparent" />

        <div className="relative flex min-h-[720px] flex-col justify-between px-8 pb-10 pt-9 sm:px-12 lg:px-16 lg:pb-12 lg:pt-12">
          <div className="flex items-center justify-between gap-4">
            <p className="eyebrow">PLAYVAULT · 本地游戏档案</p>
            <Link to="/timeline" className="library-quiet-action inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
              <CalendarDays size={14} /> 查看时间线
            </Link>
          </div>

          <div className="max-w-2xl pb-8 pt-28 sm:pb-12">
            <p className="eyebrow">最近游玩</p>
            {featuredGame ? (
              <>
                <h1 className="mt-4 font-serif text-5xl leading-none tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl">{featuredGame.display_name}</h1>
                <div className="mt-5 h-px w-36 bg-[#b8dbe8]/70" />
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-archive-300">
                  <span className="inline-flex items-center gap-2"><Clock3 size={15} /> 已游玩 {formatDuration(featuredGame.total_duration)}</span>
                  <span>{formatRelativeDate(featuredGame.last_played_at)}</span>
                  <span>{featuredGame.screenshot_count} 张截图</span>
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-6">
                  <Link to={`/games/${featuredGame.id}`} className="btn-primary inline-flex items-center gap-2 px-5 py-2.5">
                    <PlayCircle size={16} /> 继续游玩
                  </Link>
                  <Link to={`/games/${featuredGame.id}`} className="inline-flex items-center gap-2 text-sm text-archive-200 transition-colors hover:text-white">
                    更多详情 <ArrowUpRight size={15} />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 className="mt-4 max-w-xl font-serif text-5xl leading-none tracking-[-0.035em] text-white sm:text-6xl">开始记录你的游戏经历</h1>
                <p className="mt-5 max-w-lg text-sm leading-7 text-archive-300">添加本地游戏并绑定可执行文件后，PlayVault 会安静记录每一次游玩，直到你将它封存为个人档案。</p>
                <Link to="/games" className="btn-primary mt-7 inline-flex items-center gap-2 px-5 py-2.5">
                  <Gamepad2 size={16} /> 前往游戏库
                </Link>
              </>
            )}
          </div>

          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-archive-200">最近游玩</p>
              <Link to="/games" className="inline-flex items-center gap-1 text-xs text-archive-400 transition-colors hover:text-[#d9eff7]">查看全部 <ArrowUpRight size={13} /></Link>
            </div>
            {isLoading ? (
              <p className="py-8 text-sm text-archive-500">正在载入你的游戏经历…</p>
            ) : recentGames.length === 0 ? (
              <p className="py-8 text-sm text-archive-500">暂无游玩历史。启动一次已绑定的游戏后，记录会出现在这里。</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-1 pr-8 scrollbar-none">
                {recentGames.map((game, index) => <ShelfGameCard key={game.id} game={game} featured={index === 0} />)}
              </div>
            )}
          </div>
        </div>
      </BackdropStage>

      <section className="pv-panel grid grid-cols-1 divide-y divide-white/[0.07] md:grid-cols-4 md:divide-x md:divide-y-0">
        <DashboardMetric label="今日游玩" value={formatDuration(sumDuration(todaySessions))} />
        <DashboardMetric label="近 7 天" value={formatDuration(sumDuration(weekSessions))} />
        <DashboardMetric label="近 30 天" value={formatDuration(sumDuration(sessions))} />
        <Link to="/screenshots" className="group flex min-h-[124px] flex-col justify-center px-8 py-6 transition-colors hover:bg-white/[0.025] sm:px-12">
          <span className="flex items-center gap-2 text-xs text-archive-500"><Image size={14} /> 截图整理</span>
          <span className="mt-2 text-2xl font-medium tracking-tight text-archive-100">{pendingCount} 张待整理</span>
          <span className="mt-2 inline-flex items-center gap-1 text-xs text-[#c5e1eb] opacity-0 transition-opacity group-hover:opacity-100">打开截图箱 <ArrowUpRight size={12} /></span>
        </Link>
      </section>
    </div>
  )
}

function DashboardMetric({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex min-h-[124px] flex-col justify-center px-8 py-6 sm:px-12">
      <span className="text-xs text-archive-500">{label}</span>
      <span className="mt-2 text-2xl font-medium tracking-tight text-archive-100">{value}</span>
    </div>
  )
}

function ShelfGameCard({ game, featured }: { game: GameWithStats; featured: boolean }): React.ReactElement {
  return (
    <Link to={`/games/${game.id}`} className={`group relative block w-[118px] shrink-0 overflow-hidden rounded-lg bg-[#141b24] shadow-[0_12px_28px_rgba(0,0,0,0.38)] transition-transform duration-300 hover:-translate-y-2 sm:w-[132px] ${featured ? 'ring-1 ring-[#c4e4ef]/65' : 'ring-1 ring-white/[0.08]'}`}>
      <CoverFrame
        filePath={game.cover_path}
        crop={game.cover_crop}
        alt={`${game.display_name} 封面`}
        className="relative"
        fallback={<div className="flex h-full items-center justify-center bg-[#1b1d20]"><Gamepad2 size={28} className="text-archive-600" /></div>}
      >
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/88 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
          <p className="truncate text-xs font-medium text-white">{game.display_name}</p>
          <p className="mt-1 text-[10px] text-archive-300">{formatDuration(game.total_duration)}</p>
        </div>
      </CoverFrame>
    </Link>
  )
}
