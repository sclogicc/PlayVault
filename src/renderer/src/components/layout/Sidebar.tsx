/* 视觉基线：导航作为低对比冷墨边缘，文字与计数清晰但不抢夺右侧页面内容。 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Archive,
  Clock3,
  FolderArchive,
  Gamepad2,
  HardDrive,
  Image,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  TriangleAlert,
  Heart,
  EyeOff,
} from 'lucide-react'
import type { GameWithStats } from '@shared/types'
import { parseLibraryScope, type LibraryScope } from '../../lib/libraryView'

interface NavItem {
  to: string
  icon: ReactNode
  label: string
  count?: number
  isActive?: boolean
}

const SIDEBAR_STORAGE_KEY = 'playvault.sidebar.expanded'

function getInitialExpandedState(): boolean {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'false'
}

function countByScope(games: GameWithStats[], scope: LibraryScope): number {
  if (scope === 'favorite') return games.filter((game) => game.is_favorite === 1 && game.is_hidden !== 1).length
  if (scope === 'in_progress') return games.filter((game) => game.status === 'in_progress' && game.is_hidden !== 1).length
  if (scope === 'recent') return games.filter((game) => Boolean(game.last_played_at) && game.is_hidden !== 1).length
  if (scope === 'archived') return games.filter((game) => game.archive_status === 'archived' && game.is_hidden !== 1).length
  if (scope === 'missing') return games.filter((game) => game.install_status === 'missing' && game.is_hidden !== 1).length
  if (scope === 'hidden') return games.filter((game) => game.is_hidden === 1).length
  return games.filter((game) => game.is_hidden !== 1).length
}

function navItemClass(active: boolean, expanded: boolean): string {
  return `group relative flex h-10 items-center gap-3 rounded-md border border-transparent transition-[background-color,color,border-color,transform] duration-200 ${expanded ? 'w-full px-3' : 'w-11 justify-center'} ${
    active
      ? 'border-l-2 border-l-[#cce8f6]/70 bg-[#cce8f6]/[0.055] text-[#ecf8fc]'
      : 'text-archive-400 hover:bg-white/[0.035] hover:text-[#e1f0f5]'
  }`
}

function LibraryLink({ item, expanded }: { item: NavItem; expanded: boolean }): React.ReactElement {
  return (
    <NavLink to={item.to} className={() => navItemClass(Boolean(item.isActive), expanded)} title={expanded ? undefined : item.label}>
      {item.icon}
      {expanded && <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>}
      {expanded && typeof item.count === 'number' && <span className="font-mono text-[11px] text-archive-500">{item.count}</span>}
      {!expanded && <span className="pointer-events-none absolute left-[calc(100%+10px)] z-30 hidden whitespace-nowrap rounded-md border border-white/[0.10] bg-[#16212b] px-2.5 py-1.5 text-xs text-archive-100 shadow-lg group-hover:block">{item.label}</span>}
    </NavLink>
  )
}

function DirectLink({ item, expanded }: { item: NavItem; expanded: boolean }): React.ReactElement {
  return (
    <NavLink to={item.to} className={({ isActive }) => navItemClass(isActive, expanded)} title={expanded ? undefined : item.label}>
      {item.icon}
      {expanded && <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>}
      {!expanded && <span className="pointer-events-none absolute left-[calc(100%+10px)] z-30 hidden whitespace-nowrap rounded-md border border-white/[0.10] bg-[#16212b] px-2.5 py-1.5 text-xs text-archive-100 shadow-lg group-hover:block">{item.label}</span>}
    </NavLink>
  )
}

export default function Sidebar(): React.ReactElement {
  const location = useLocation()
  const [expanded, setExpanded] = useState(getInitialExpandedState)
  const { data: games = [] } = useQuery<GameWithStats[]>({
    queryKey: ['games', 'sidebar-navigation'],
    queryFn: () => window.api.game.getAll({ includeHidden: true }),
  })

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(expanded))
  }, [expanded])

  const activeScope = location.pathname === '/games'
    ? parseLibraryScope(new URLSearchParams(location.search).get('scope'))
    : null

  const libraryItems = useMemo<NavItem[]>(() => [
    { to: '/games', icon: <Gamepad2 size={17} strokeWidth={1.7} />, label: '全部游戏', count: countByScope(games, 'all'), isActive: activeScope === 'all' },
    { to: '/games?scope=favorite', icon: <Heart size={17} strokeWidth={1.7} />, label: '收藏游戏', count: countByScope(games, 'favorite'), isActive: activeScope === 'favorite' },
    { to: '/games?scope=in_progress', icon: <Clock3 size={17} strokeWidth={1.7} />, label: '进行中', count: countByScope(games, 'in_progress'), isActive: activeScope === 'in_progress' },
    { to: '/games?scope=recent', icon: <Archive size={17} strokeWidth={1.7} />, label: '最近游玩', count: countByScope(games, 'recent'), isActive: activeScope === 'recent' },
    { to: '/games?scope=archived', icon: <FolderArchive size={17} strokeWidth={1.7} />, label: '已留档', count: countByScope(games, 'archived'), isActive: activeScope === 'archived' },
    { to: '/games?scope=missing', icon: <TriangleAlert size={17} strokeWidth={1.7} />, label: '路径失效', count: countByScope(games, 'missing'), isActive: activeScope === 'missing' },
    { to: '/games?scope=hidden', icon: <EyeOff size={17} strokeWidth={1.7} />, label: '已隐藏', count: countByScope(games, 'hidden'), isActive: activeScope === 'hidden' },
  ], [activeScope, games])

  const toolItems: NavItem[] = [
    { to: '/archives', icon: <Archive size={17} strokeWidth={1.7} />, label: '游玩回顾' },
    { to: '/screenshots', icon: <Image size={17} strokeWidth={1.7} />, label: '截图箱' },
    { to: '/timeline', icon: <Clock3 size={17} strokeWidth={1.7} />, label: '时间线' },
    { to: '/discover', icon: <Search size={17} strokeWidth={1.7} />, label: '发现候选' },
  ]

  return (
    <aside className={`pv-sidebar flex h-screen shrink-0 flex-col border-r py-4 transition-[width] duration-200 ${expanded ? 'w-[196px]' : 'w-[68px] items-center'}`}>
      <div className={`flex h-11 items-center ${expanded ? 'justify-between px-3' : 'justify-center'}`}>
        <NavLink to="/games" aria-label="PlayVault 游戏库" title="PlayVault" className="pv-sidebar-mark flex h-10 w-10 shrink-0 items-center justify-center transition-colors hover:bg-[#d9f1fb]/[0.15]">
          <Gamepad2 size={18} strokeWidth={1.7} />
        </NavLink>
        {expanded && <span className="ml-3 flex-1 text-[11px] font-medium tracking-[0.16em] text-archive-200">PLAYVAULT</span>}
        <button type="button" onClick={() => setExpanded((value) => !value)} className="flex h-8 w-8 shrink-0 items-center justify-center text-archive-500 transition-colors hover:bg-white/[0.04] hover:text-archive-100" title={expanded ? '折叠导航' : '展开导航'} aria-label={expanded ? '折叠导航' : '展开导航'}>
          {expanded ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
        </button>
      </div>

      <nav className={`mt-6 flex w-full flex-col gap-1 ${expanded ? 'px-3' : 'items-center'}`} aria-label="游戏资料导航">
        {expanded && <p className="mb-1 px-1 text-[10px] font-medium tracking-[0.16em] text-archive-500">游戏资料</p>}
        {libraryItems.map((item) => <LibraryLink key={item.to} item={item} expanded={expanded} />)}
      </nav>

      <div className={`my-5 h-px bg-white/[0.055] ${expanded ? 'mx-3' : 'w-7'}`} />

      <nav className={`flex w-full flex-col gap-1 ${expanded ? 'px-3' : 'items-center'}`} aria-label="日志工具导航">
        {expanded && <p className="mb-1 px-1 text-[10px] font-medium tracking-[0.16em] text-archive-500">日志工具</p>}
        {toolItems.map((item) => <DirectLink key={item.to} item={item} expanded={expanded} />)}
      </nav>

      <div className={`mt-auto flex w-full flex-col gap-2 ${expanded ? 'px-3' : 'items-center'}`}>
        <DirectLink item={{ to: '/settings', icon: <Settings size={17} strokeWidth={1.7} />, label: '设置' }} expanded={expanded} />
        {expanded ? (
          <span className="flex items-center gap-2 px-1 pb-1 text-[10px] text-archive-500"><HardDrive size={12} />仅本地存储</span>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center text-archive-500" title="仅本地存储"><HardDrive size={14} /></span>
        )}
      </div>
    </aside>
  )
}
