import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { GameWithStats } from '@shared/types'
import { getLibraryGameList, toggleLibraryOpen } from '../../lib/libraryNavigation'
import {
  Archive,
  ChevronDown,
  Clock3,
  Gamepad2,
  HardDrive,
  Image,
  LayoutDashboard,
  Search,
  Settings,
} from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  end?: boolean
}

const UTILITY_NAV_ITEMS: NavItem[] = [
  { to: '/archives', icon: <Archive size={17} />, label: '历史档案' },
  { to: '/discover', icon: <Search size={17} />, label: '发现候选' },
  { to: '/screenshots', icon: <Image size={17} />, label: '截图' },
  { to: '/timeline', icon: <Clock3 size={17} />, label: '时间线' },
  { to: '/settings', icon: <Settings size={17} />, label: '设置' },
]

function navClass(isActive: boolean): string {
  return `group relative flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition-colors ${
    isActive
      ? 'border-[#c9a35a] bg-white/[0.045] text-[#ead7aa]'
      : 'border-transparent text-archive-500 hover:bg-white/[0.03] hover:text-archive-200'
  }`
}

export default function Sidebar(): React.ReactElement {
  const [libraryOpen, setLibraryOpen] = useState(false)
  const { data: games = [] } = useQuery<GameWithStats[]>({
    queryKey: ['games', 'sidebar'],
    queryFn: () => window.api.game.getAll(),
    staleTime: 30_000,
  })
  const libraryGames = getLibraryGameList(games)

  return (
    <aside className="flex h-screen w-[196px] min-w-[196px] flex-col border-r border-white/[0.075] bg-[#0b0d10]">
      <div className="px-5 pb-6 pt-7">
        <div className="flex items-center gap-2.5 text-archive-50">
          <span className="flex h-7 w-7 items-center justify-center border border-[#c9a35a]/55 text-[#d6b36a]">
            <Gamepad2 size={15} strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="font-serif text-[19px] tracking-[-0.02em]">PlayVault</h1>
            <p className="mt-0.5 text-[10px] tracking-[0.14em] text-archive-600">本地游戏档案</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pb-4">
        <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
          <LayoutDashboard size={17} strokeWidth={1.7} />
          <span>总览</span>
        </NavLink>

        <div className="mt-7">
          <p className="px-5 pb-2 text-[10px] font-medium tracking-[0.14em] text-archive-600">游戏库</p>
          <NavLink
            to="/games"
            end
            className={({ isActive }) => navClass(isActive)}
            onClick={() => setLibraryOpen(toggleLibraryOpen)}
          >
            <Gamepad2 size={17} strokeWidth={1.7} />
            <span className="flex-1">全部游戏</span>
            <span className="font-mono text-[10px] text-archive-600">{games.length}</span>
            <ChevronDown size={13} className={`text-archive-600 transition-transform ${libraryOpen ? 'rotate-180' : ''}`} />
          </NavLink>
          {libraryOpen && (
            <div className="ml-5 mt-1 border-l border-white/[0.075] py-1 pl-3 animate-soft-enter">
              {libraryGames.length === 0 ? (
                <p className="py-2 text-[11px] text-archive-600">尚未建立游戏档案</p>
              ) : (
                libraryGames.map((game) => (
                  <NavLink
                    key={game.id}
                    to={`/games/${game.id}`}
                    className={({ isActive }) => `block truncate py-1.5 pr-2 text-xs transition-colors ${isActive ? 'text-[#ead7aa]' : 'text-archive-600 hover:text-archive-200'}`}
                    title={game.display_name}
                  >
                    {game.display_name}
                  </NavLink>
                ))
              )}
            </div>
          )}
        </div>

        <div className="mt-7">
          <p className="px-5 pb-2 text-[10px] font-medium tracking-[0.14em] text-archive-600">档案工具</p>
          {UTILITY_NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navClass(isActive)}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="border-t border-white/[0.075] px-5 py-4">
        <div className="flex items-center justify-between text-[10px] tracking-[0.08em] text-archive-600">
          <span className="flex items-center gap-1.5"><HardDrive size={12} /> 本地存储</span>
          <span>仅本机</span>
        </div>
        <div className="mt-2 h-px bg-white/[0.08]">
          <div className="h-full w-[58%] bg-[#c9a35a]/75" />
        </div>
      </div>
    </aside>
  )
}
