import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Archive, CalendarDays, Clock3, Image, Loader2, Search } from 'lucide-react'
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
  return new Date(value.replace(' ', 'T')).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Archives(): React.ReactElement {
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<ArchiveSortOrder>('desc')
  const { data: archives = [], isLoading } = useQuery<GameWithStats[]>({
    queryKey: ['archives', search, sortOrder],
    queryFn: () => window.api.game.getArchived({ search: search.trim() || undefined, sortOrder }),
  })

  return (
    <div className="min-h-full bg-[#090a0c] px-8 py-9 sm:px-12 lg:px-16">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-white/[0.075] pb-7">
        <div>
          <p className="text-[11px] font-medium tracking-[0.17em] text-[#d8ba77]">长期保存的回顾</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h1 className="font-serif text-4xl tracking-[-0.025em] text-archive-50 sm:text-5xl">历史档案</h1>
            <span className="text-sm text-archive-500">{archives.length} 段经历</span>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-archive-400">游戏文件可以清理，游玩痕迹仍会留在这里。按封存时间翻阅你完成过的作品。</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <label className="relative min-w-[220px] border-b border-white/[0.11] py-2 pl-6">
            <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-archive-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索历史档案" className="w-full bg-transparent text-sm text-archive-100 outline-none placeholder:text-archive-600" />
          </label>
          <div className="flex items-center gap-4 text-xs">
            <button type="button" onClick={() => setSortOrder('desc')} className={`border-b pb-1.5 transition-colors ${sortOrder === 'desc' ? 'border-[#c9a35a] text-[#ead7aa]' : 'border-transparent text-archive-500 hover:text-archive-200'}`}>最新封存</button>
            <button type="button" onClick={() => setSortOrder('asc')} className={`border-b pb-1.5 transition-colors ${sortOrder === 'asc' ? 'border-[#c9a35a] text-[#ead7aa]' : 'border-transparent text-archive-500 hover:text-archive-200'}`}>最早封存</button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="py-24 text-center text-sm text-archive-500"><Loader2 size={22} className="mx-auto mb-3 animate-spin" />正在整理历史档案…</div>
      ) : archives.length === 0 ? (
        <div className="py-28 text-center"><Archive size={30} className="mx-auto text-archive-600" /><h2 className="mt-5 font-serif text-2xl text-archive-200">这里会保存你完成过的游戏经历</h2><p className="mt-2 text-sm text-archive-500">在游戏详情页选择“封存游戏”后，PlayVault 会保留这段经历的自动档案。</p></div>
      ) : (
        <section aria-label="历史档案画廊" className="grid grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-x-5 gap-y-9 py-8 sm:grid-cols-[repeat(auto-fill,minmax(184px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(204px,1fr))]">
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
      <article className="media-frame relative aspect-[2/3] border border-white/[0.085] bg-[#15171a] shadow-[0_16px_34px_rgba(0,0,0,0.34)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-[#c9a35a]/70 group-hover:shadow-[0_24px_44px_rgba(0,0,0,0.48)]">
        {posterPath && !imageError ? (
          <img src={toFileUrl(posterPath)} alt={`${game.display_name} 封面`} className="media-image transition-transform duration-500 group-hover:scale-[1.055]" onError={() => setImageError(true)} />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#1a1c1f]"><Archive size={34} className="text-archive-600" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070809] via-[#070809]/15 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-2 text-[10px]">
          <span className="border border-[#c9a35a]/45 bg-black/55 px-1.5 py-1 text-[#ead7aa]">已封存</span>
          <span className="text-archive-300">{formatDate(game.archived_at)}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="truncate text-[15px] font-medium text-white">{game.display_name}</p>
          <p className="mt-2 border-t border-white/[0.11] pt-2 text-[11px] text-archive-300">封存于 {formatDate(game.archived_at)}</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 grid translate-y-full grid-cols-3 gap-2 bg-[#c9a35a] px-3 py-2.5 text-[#17120a] transition-transform duration-200 group-hover:translate-y-0">
          <ArchiveFact icon={<Clock3 size={11} />} label="累计" value={formatDuration(game.total_duration)} />
          <ArchiveFact icon={<CalendarDays size={11} />} label="最后游玩" value={formatDate(game.last_played_at)} />
          <ArchiveFact icon={<Image size={11} />} label="截图" value={`${game.screenshot_count} 张`} />
        </div>
      </article>
    </Link>
  )
}

function ArchiveFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }): React.ReactElement {
  return <div className="min-w-0"><p className="flex items-center gap-1 text-[9px] opacity-70">{icon}{label}</p><p className="mt-1 truncate text-[10px] font-medium" title={value}>{value}</p></div>
}
