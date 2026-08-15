/* 视觉基线：冷墨档案墙，留档封面保留叙事感，筛选和排序降为透明工具层。 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Archive, Loader2, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GameWithStats } from '@shared/types'
import CoverFrame from '../components/media/CoverFrame'

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
    <div className="pv-page">
      <header className="pv-page-header">
        <div>
          <p className="eyebrow">游戏库筛选</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="pv-page-title">游玩回顾</h1>
            <span className="text-sm text-archive-500">{archives.length} 条已留档记录</span>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-archive-500">已留档只代表你保留了这段经历；游戏仍在游戏库中，可以继续游玩与补充记录。</p>
        </div>
        <div className="pv-toolbar flex flex-wrap items-center gap-2 p-2">
          <label className="relative min-w-[220px] rounded-md border border-white/[0.09] bg-black/[0.14] py-2 pl-8 pr-2">
            <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-archive-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索游玩回顾" className="w-full bg-transparent text-sm text-archive-100 outline-none placeholder:text-archive-600" />
          </label>
          <div className="flex items-center gap-1 text-xs">
            <button type="button" data-active={sortOrder === 'desc'} onClick={() => setSortOrder('desc')} className="pv-segment px-3 py-2">最新留档</button>
            <button type="button" data-active={sortOrder === 'asc'} onClick={() => setSortOrder('asc')} className="pv-segment px-3 py-2">最早留档</button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="py-24 text-center text-sm text-archive-500"><Loader2 size={22} className="mx-auto mb-3 animate-spin" />正在整理游玩回顾…</div>
      ) : archives.length === 0 ? (
        <div className="py-28 text-center"><Archive size={30} className="mx-auto text-archive-600" /><h2 className="mt-5 font-serif text-2xl text-archive-200">这里会显示已生成留档的游戏</h2><p className="mt-2 text-sm text-archive-500">在游戏详情页选择“生成游玩留档”后，它会同时保留在游戏库与这里。</p></div>
      ) : (
        <section aria-label="游玩回顾列表" className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-x-4 gap-y-7 py-7 sm:grid-cols-[repeat(auto-fill,minmax(166px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(184px,1fr))]">
          {archives.map((game) => <ArchiveCard key={game.id} game={game} />)}
        </section>
      )}
    </div>
  )
}

function ArchiveCard({ game }: { game: GameWithStats }): React.ReactElement {
  const posterPath = game.archive_cover_path || game.cover_path

  return (
    <Link to={`/games/${game.id}`} className="group block min-w-0">
      <CoverFrame
        filePath={posterPath}
        crop={game.cover_crop}
        alt={`${game.display_name} 封面`}
        className="relative overflow-hidden rounded-xl border border-white/[0.1] bg-[#151b24] shadow-[0_12px_26px_rgba(0,0,0,0.16)] transition-all duration-200 group-hover:-translate-y-1 group-hover:border-[#c7e4ee]/45 group-hover:shadow-[0_18px_34px_rgba(0,0,0,0.24)]"
        imageClassName="transition-transform duration-500"
        fallback={<div className="flex h-full items-center justify-center bg-[#1a1c1f]"><Archive size={34} className="text-archive-600" /></div>}
      >
        <div className="absolute left-2.5 top-2.5 rounded-md border border-[#c7e4ee]/25 bg-[#0b131d]/55 px-1.5 py-1 text-[10px] text-[#d9edf5] backdrop-blur">已留档</div>
      </CoverFrame>
      <div className="border-b border-white/[0.065] px-1 pb-3 pt-3">
        <p className="truncate text-sm font-medium text-archive-100">{game.display_name}</p>
        <p className="mt-1.5 text-[11px] text-archive-500">留档于 {formatDate(game.archived_at)} · {formatDuration(game.total_duration)}</p>
        {game.archive_note && <p className="mt-2 line-clamp-2 text-xs leading-5 text-archive-400">“{game.archive_note}”</p>}
      </div>
    </Link>
  )
}
