import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Archive,
  CalendarDays,
  Clock3,
  Image,
  Loader2,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GameWithStats } from '@shared/types'
import { toFileUrl } from '../lib/fileUrl'

type ArchiveSortOrder = 'desc' | 'asc'

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours} 小时 ${minutes} 分钟` : `${minutes} 分钟`
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value.replace(' ', 'T')).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function Archives(): React.ReactElement {
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<ArchiveSortOrder>('desc')
  const { data: archives = [], isLoading } = useQuery<GameWithStats[]>({
    queryKey: ['archives', search, sortOrder],
    queryFn: () => window.api.game.getArchived({
      search: search.trim() || undefined,
      sortOrder,
    }),
  })

  return (
    <div className="space-y-7">
      <header className="relative overflow-hidden rounded-panel border border-white/[0.07] bg-[radial-gradient(circle_at_88%_0%,rgba(109,40,217,0.17),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] px-6 py-7 shadow-panel sm:px-8">
        <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-violet">个人历史档案</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight text-archive-50">封存的游戏经历</h2>
              <span className="rounded-full border border-violet-300/15 bg-violet-400/10 px-2.5 py-1 text-xs font-medium text-violet-200">{archives.length} 段经历</span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-archive-400">游戏可以清理，经历仍然留在这里。按封存时间翻阅你完成过的作品与自动沉淀的游玩痕迹。</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="surface-toolbar flex min-w-[220px] items-center gap-2 px-3.5 py-2.5">
              <Search size={16} className="text-archive-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索历史档案" className="min-w-0 flex-1 bg-transparent text-sm text-archive-100 outline-none placeholder:text-archive-600" />
            </label>
            <div className="surface-toolbar flex items-center gap-1 p-1">
              <button type="button" onClick={() => setSortOrder('desc')} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${sortOrder === 'desc' ? 'bg-accent-violet text-white shadow-[0_5px_14px_rgba(109,40,217,0.28)]' : 'text-archive-400 hover:bg-white/[0.06] hover:text-archive-200'}`}>最新封存</button>
              <button type="button" onClick={() => setSortOrder('asc')} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${sortOrder === 'asc' ? 'bg-accent-violet text-white shadow-[0_5px_14px_rgba(109,40,217,0.28)]' : 'text-archive-400 hover:bg-white/[0.06] hover:text-archive-200'}`}>最早封存</button>
            </div>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="empty-state text-sm text-archive-500"><Loader2 size={22} className="mx-auto mb-3 animate-spin" />正在整理历史档案…</div>
      ) : archives.length === 0 ? (
        <div className="empty-state py-20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-200"><Archive size={25} /></div>
          <h3 className="mt-5 text-base font-medium text-archive-200">这里会保存你完成过的游戏经历</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-archive-500">在游戏详情页选择“封存游戏”后，即使之后删除游戏文件，PlayVault 仍会保留这段经历的自动档案。</p>
        </div>
      ) : (
        <section aria-label="历史档案画廊" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {archives.map((game) => <ArchiveCard key={game.id} game={game} />)}
        </section>
      )}
    </div>
  )
}

function ArchiveCard({ game }: { game: GameWithStats }): React.ReactElement {
  const [imageError, setImageError] = useState(false)
  const posterPath = game.archive_cover_path || game.cover_path || game.archive_background_path || game.background_path

  return (
    <Link to={`/games/${game.id}`} className="group block min-w-0">
      <article className="overflow-hidden rounded-[18px] border border-white/[0.075] bg-archive-850 shadow-[0_14px_30px_rgba(0,0,0,0.22)] transition-all duration-250 group-hover:-translate-y-1.5 group-hover:border-violet-300/35 group-hover:shadow-[0_22px_45px_rgba(0,0,0,0.42)]">
        <div className="relative aspect-[3/4.25] overflow-hidden bg-[radial-gradient(circle_at_55%_10%,rgba(139,92,246,0.26),transparent_45%),linear-gradient(145deg,#172338,#080e16)]">
          {posterPath && !imageError ? (
            <img src={toFileUrl(posterPath)} alt={`${game.display_name} 封面`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.07]" onError={() => setImageError(true)} />
          ) : (
            <div className="flex h-full w-full items-center justify-center"><Archive size={34} className="text-violet-300/50" /></div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,9,15,0.10)_18%,rgba(5,9,15,0.18)_44%,rgba(5,9,15,0.94)_100%)]" />
          <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200/20 bg-archive-950/68 px-2 py-1 text-[10px] font-medium text-violet-100 backdrop-blur-md"><Archive size={10} /> 已封存</span>
            <span className="rounded-full border border-white/[0.12] bg-archive-950/55 px-2 py-1 text-[10px] text-archive-300 backdrop-blur-md">{formatDate(game.archived_at)}</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16">
            <p className="line-clamp-2 text-base font-semibold leading-5 tracking-tight text-white drop-shadow-md">{game.display_name}</p>
            <p className="mt-1.5 text-[11px] text-archive-300">封存于 {formatDate(game.archived_at)}</p>
          </div>
          <div className="absolute inset-x-3 bottom-3 translate-y-3 rounded-xl border border-white/[0.11] bg-archive-950/82 p-2.5 opacity-0 backdrop-blur-md transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="grid grid-cols-3 gap-2">
              <ArchiveFact icon={<Clock3 size={11} />} label="累计" value={formatDuration(game.total_duration)} />
              <ArchiveFact icon={<CalendarDays size={11} />} label="最后游玩" value={formatDate(game.last_played_at)} />
              <ArchiveFact icon={<Image size={11} />} label="截图" value={`${game.screenshot_count} 张`} />
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

function ArchiveFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }): React.ReactElement {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[9px] text-archive-500">{icon}{label}</p>
      <p className="mt-1 truncate text-[10px] font-medium text-archive-100" title={value}>{value}</p>
    </div>
  )
}
