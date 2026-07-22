import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { GameWithStats } from '@shared/types'
import type { GameStatus } from '@shared/constants'
import { isLibraryCategoryActive } from '../../lib/libraryNavigation'
import {
  LayoutDashboard,
  Gamepad2,
  Search,
  Image,
  Clock,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

// ========== Category Definitions ==========

interface CategoryDef {
  key: string
  label: string
  status?: GameStatus
}

const LIBRARY_CATEGORIES: CategoryDef[] = [
  { key: 'in_progress', label: '未通关', status: 'in_progress' },
  { key: 'completed', label: '已通关', status: 'completed' },
]

// ========== Nav Items (non-library) ==========

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
  {
    to: '/discover',
    icon: <Search size={18} />,
    label: '发现候选',
  },
  {
    to: '/screenshots',
    icon: <Image size={18} />,
    label: '截图箱',
  },
  {
    to: '/timeline',
    icon: <Clock size={18} />,
    label: '时间线',
  },
  {
    to: '/settings',
    icon: <Settings size={18} />,
    label: '设置',
  },
]

// ========== Component ==========

export default function Sidebar(): React.ReactElement {
  const location = useLocation()

  const [libraryOpen, setLibraryOpen] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['in_progress']),
  )

  // Load all games (lightweight: just name + status)
  const { data: games = [] } = useQuery<GameWithStats[]>({
    queryKey: ['games', 'sidebar'],
    queryFn: () => window.api.game.getAll(),
    staleTime: 30_000,
  })

  // Group games by status
  const grouped = {
    all: games,
    not_started: games.filter((g) => g.status === 'not_started'),
    in_progress: games.filter((g) => g.status === 'in_progress'),
    completed: games.filter((g) => g.status === 'completed'),
  }

  const toggleCategory = (key: string): void => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <aside className="w-[220px] min-w-[220px] h-screen bg-archive-950 border-r border-archive-700/40 flex flex-col select-none">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-archive-700/30">
        <h1 className="text-lg font-bold text-archive-100 tracking-wide">
          PlayVault
        </h1>
        <p className="text-xs text-archive-500 mt-0.5">游戏档案馆</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-0.5">
        {/* Dashboard stays first; the library is the primary daily entry. */}
        <NavLink
          to={DASHBOARD_NAV_ITEM.to}
          end={DASHBOARD_NAV_ITEM.end}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? 'active' : ''}`
          }
        >
          {DASHBOARD_NAV_ITEM.icon}
          <span className="text-sm">{DASHBOARD_NAV_ITEM.label}</span>
        </NavLink>

        {/* Library follows the dashboard. */}
        <div className="mt-2 pt-2 border-t border-archive-700/30">
          {/* Library header (expandable) */}
          <button
            onClick={() => setLibraryOpen(!libraryOpen)}
            className="sidebar-link w-full"
          >
            <Gamepad2 size={18} />
            <span className="text-sm flex-1 text-left">游戏库</span>
            <span className="text-archive-500 text-[10px] mr-1">
              {games.length}
            </span>
            {libraryOpen ? (
              <ChevronDown size={12} className="text-archive-500" />
            ) : (
              <ChevronRight size={12} className="text-archive-500" />
            )}
          </button>

          {libraryOpen && (
            <div className="ml-2 mt-0.5 space-y-0.5">
              {LIBRARY_CATEGORIES.map((cat) => {
                const catGames = grouped[cat.key]
                const isExpanded = expandedCategories.has(cat.key)
                const categoryPath =
                  cat.key === 'all'
                    ? '/games'
                    : `/games?status=${cat.key}`

                return (
                  <div key={cat.key}>
                    {/* Category header */}
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleCategory(cat.key)}
                        className="p-0.5 text-archive-600 hover:text-archive-300 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown size={10} />
                        ) : (
                          <ChevronRight size={10} />
                        )}
                      </button>
                      <NavLink
                        to={categoryPath}
                        end
                        className={() =>
                          `flex-1 flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                            isLibraryCategoryActive(
                              cat.key,
                              location.pathname,
                              location.search,
                            )
                              ? 'text-accent-teal bg-accent-teal/10'
                              : 'text-archive-400 hover:text-archive-200 hover:bg-archive-800/50'
                          }`
                        }
                      >
                        <span>{cat.label}</span>
                      </NavLink>
                      <span className="text-[10px] text-archive-600 mr-1">
                        {catGames.length}
                      </span>
                    </div>

                    {/* Game list under category */}
                    {isExpanded && (
                      <div className="ml-4 space-y-0.5">
                        {catGames.length === 0 ? (
                          <p className="text-[10px] text-archive-600 px-2 py-1">
                            暂无
                          </p>
                        ) : (
                          catGames.map((game) => (
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
                )
              })}
            </div>
          )}
        </div>

        {/* Secondary nav items */}
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            {item.icon}
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}

      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-archive-700/30">
        <p className="text-[10px] text-archive-600">PlayVault v1.0</p>
      </div>
    </aside>
  )
}
