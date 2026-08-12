import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Archive, CalendarDays, Clock3, Image, Loader2, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GameWithStats } from '@shared/types'
import { toFileUrl } from '../lib/fileUrl'

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
  const { data: archives = [], isLoading } = useQuery<GameWithStats[]>({
    queryKey: ['archives', search],
    queryFn: () => window.api.game.getArchived({ search: search.trim() || undefined }),
  })

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-violet">个人历史档案</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-archive-50">封存的游戏经历</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-archive-400">已经清理游戏文件的作品仍会留在这里。时长、游玩日期、会话记录和你主动保留的画面都不会随安装目录消失。</p>
        </div>
        <label className="surface-toolbar flex min-w-[230px] items-center gap-2 px-3.5 py-2.5">
          <Search size={16} className="text-archive-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索历史档案" className="min-w-0 flex-1 bg-transparent text-sm text-archive-100 outline-none placeholder:text-archive-600" />
        </label>
      </header>

      {isLoading ? (
        <div className="empty-state text-sm text-archive-500"><Loader2 size={22} className="mx-auto mb-3 animate-spin" />正在载入历史档案…</div>
      ) : archives.length === 0 ? (
        <div className="empty-state py-20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-200"><Archive size={25} /></div>
          <h3 className="mt-5 text-base font-medium text-archive-200">这里会保存你完成过的游戏经历</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-archive-500">在游戏详情页选择“封存游戏”后，即使之后删除游戏文件，PlayVault 仍会保留这段经历的自动档案。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {archives.map((game) => <ArchiveCard key={game.id} game={game} />)}
        </div>
      )}
    </div>
  )
}

function ArchiveCard({ game }: { game: GameWithStats }): React.ReactElement {
  const [imageError, setImageError] = useState(false)
  const coverPath = game.archive_cover_path || game.cover_path
  const backgroundPath = game.archive_background_path || game.background_path

  return (
    <Link to={`/games/${game.id}`} className="group relative min-h-[248px] overflow-hidden rounded-panel border border-white/[0.075] bg-archive-850 shadow-panel transition-all duration-200 hover:-translate-y-1 hover:border-violet-300/30 hover:shadow-float">
      {backgroundPath && !imageError ? (
        <img src={toFileUrl(backgroundPath)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-500 group-hover:scale-[1.05]" onError={() => setImageError(true)} />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(139,92,246,0.18),transparent_48%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-archive-950 via-archive-950/85 to-archive-950/15" />
      <div className="relative flex h-full min-h-[248px] flex-col justify-between p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/20 bg-archive-950/65 px-2.5 py-1 text-[11px] font-medium text-violet-200 backdrop-blur-sm"><Archive size={12} /> 已封存</span>
          <span className="text-[11px] text-archive-400">{formatDate(game.archived_at)}</span>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.14] bg-archive-900 shadow-[0_10px_22px_rgba(0,0,0,0.38)]">
            {coverPath && !imageError ? <img src={toFileUrl(coverPath)} alt={`${game.display_name} 封面`} className="h-full w-full object-cover" onError={() => setImageError(true)} /> : <Archive size={22} className="text-archive-600" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold tracking-tight text-archive-50">{game.display_name}</p>
            <p className="mt-1 text-xs text-archive-400">保留了一段本地游戏经历</p>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.09] pt-3">
              <ArchiveFact icon={<Clock3 size={12} />} label="累计" value={formatDuration(game.total_duration)} />
              <ArchiveFact icon={<CalendarDays size={12} />} label="最后游玩" value={formatDate(game.last_played_at)} />
              <ArchiveFact icon={<Image size={12} />} label="截图" value={`${game.screenshot_count} 张`} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

function ArchiveFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }): React.ReactElement {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[10px] text-archive-500">{icon}{label}</p>
      <p className="mt-1 truncate text-[11px] font-medium text-archive-200" title={value}>{value}</p>
    </div>
  )
}
