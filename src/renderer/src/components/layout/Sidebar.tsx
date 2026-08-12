import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { GameWithStats } from '@shared/types'
import { getLibraryGameList, toggleLibraryOpen } from '../../lib/libraryNavigation'
import {
  LayoutDashboard,
  Gamepad2,
  Search,
  Image,
  Clock,
  Settings,
} from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  end?: boolean
}

const DASHBOARD_NAV_ITEM: NavItem = {
  to: '/',
  icon: <LayoutDashboard size={18} />,
  label: '总览',
  end: true,
}

const NAV_ITEMS: NavItem[] = [
  { to: '/discover', icon: <Search size={18} />, label: '发现候选' },
  { to: '/screenshots', icon: <Image size={18} />, label: '截图箱' },
  { to: '/timeline', icon: <Clock size={18} />, label: '时间线' },
  { to: '/settings', icon: <Settings size={18} />, label: '设置' },
]

export default function Sidebar(): React.ReactElement {
  const [libraryOpen, setLibraryOpen] = useState(false)
  const { data: games = [] } = useQuery<GameWithStats[]>({
    queryKey: ['games', 'sidebar'],
    queryFn: () => window.api.game.getAll(),
    staleTime: 30_000,
  })
  const libraryGames = getLibraryGameList(games)

  return (
    <aside className="w-[220px] min-w-[220px] h-screen bg-archive-950 border-r border-archive-700/40 flex flex-col select-none">
      <div className="px-5 py-6 border-b border-archive-700/30">
        <h1 className="text-lg font-bold text-archive-100 tracking-wide">PlayVault</h1>
        <p className="text-xs text-archive-500 mt-0.5">游戏档案馆</p>
      </div>

      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-0.5">
        <NavLink
          to={DASHBOARD_NAV_ITEM.to}
          end={DASHBOARD_NAV_ITEM.end}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          {DASHBOARD_NAV_ITEM.icon}
          <span className="text-sm">{DASHBOARD_NAV_ITEM.label}</span>
        </NavLink>

        <div className="mt-2 pt-2 border-t border-archive-700/30">
          <div className="flex items-center">
            <NavLink
              to="/games"
              end
              className={({ isActive }) =>
                `sidebar-link flex-1 ${isActive ? 'active' : ''}`
              }
              title="查看全部游戏"
              onClick={() => setLibraryOpen(toggleLibraryOpen)}
            >
              <Gamepad2 size={18} />
              <span className="text-sm flex-1">游戏库</span>
              <span className="text-archive-500 text-[10px] mr-1">{games.length}</span>
            </NavLink>
          </div>

          {libraryOpen && (
            <div className="ml-4 mt-1 space-y-0.5">
              {libraryGames.length === 0 ? (
                <p className="px-2 py-1 text-[10px] text-archive-600">暂无游戏</p>
              ) : (
                libraryGames.map((game) => (
                  <NavLink
                    key={game.id}
                    to={`/games/${game.id}`}
                    className={({ isActive }) =>
                      `block px-2 py-1 text-xs rounded truncate transition-colors ${
                        isActive
                          ? 'text-accent-teal bg-accent-teal/10 font-medium'
                          : 'text-archive-500 hover:text-archive-300 hover:bg-archive-800/30'
                      }`
                    }
                    title={game.display_name}
                  >
                    {game.display_name}
                  </NavLink>
                ))
              )}
            </div>
          )}
        </div>

        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-archive-700/30">
        <p className="text-[10px] text-archive-600">PlayVault v1.0</p>
      </div>
    </aside>
  )
}
