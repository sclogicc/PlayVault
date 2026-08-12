import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { GameWithStats } from '@shared/types'
import { getLibraryGameList, toggleLibraryOpen } from '../../lib/libraryNavigation'
import {
  Clock3,
  Gamepad2,
  Image,
  LayoutDashboard,
  Search,
  Settings,
  ChevronDown,
  Sparkles,
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
  { to: '/timeline', icon: <Clock3 size={18} />, label: '时间线' },
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
    <aside className="relative flex h-screen w-[244px] min-w-[244px] flex-col overflow-hidden border-r border-white/[0.06] bg-archive-950/80 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_18%_0%,rgba(139,92,246,0.2),transparent_58%)]" />

      <div className="relative border-b border-white/[0.055] px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-violet-300/20 bg-gradient-to-br from-violet-400 to-accent-violet text-white shadow-[0_8px_20px_rgba(109,40,217,0.35)]">
            <Gamepad2 size={20} strokeWidth={2.3} />
          </div>
          <div>
            <h1 className="text-[17px] font-bold tracking-tight text-archive-50">PlayVault</h1>
            <p className="mt-0.5 text-[11px] tracking-wide text-archive-500">个人游戏档案馆</p>
          </div>
        </div>
      </div>

      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavLink
          to={DASHBOARD_NAV_ITEM.to}
          end={DASHBOARD_NAV_ITEM.end}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          {DASHBOARD_NAV_ITEM.icon}
          <span className="text-sm">{DASHBOARD_NAV_ITEM.label}</span>
        </NavLink>

        <div className="mt-5 border-t border-white/[0.055] pt-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-archive-500">游戏库</p>
          <NavLink
            to="/games"
            end
            className={({ isActive }) => `sidebar-link group ${isActive ? 'active' : ''}`}
            title="查看全部游戏"
            onClick={() => setLibraryOpen(toggleLibraryOpen)}
          >
            <Gamepad2 size={18} />
            <span className="flex-1 text-sm">全部游戏</span>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-archive-400 group-hover:text-archive-200">{games.length}</span>
            <ChevronDown
              size={14}
              className={`text-archive-500 transition-transform duration-200 ${libraryOpen ? 'rotate-180' : ''}`}
            />
          </NavLink>

          {libraryOpen && (
            <div className="mt-1 space-y-0.5 border-l border-white/[0.06] pl-3 ml-4 animate-soft-enter">
              {libraryGames.length === 0 ? (
                <p className="px-2 py-2 text-[11px] text-archive-600">尚未建立游戏档案</p>
              ) : (
                libraryGames.map((game) => (
                  <NavLink
                    key={game.id}
                    to={`/games/${game.id}`}
                    className={({ isActive }) =>
                      `block rounded-lg px-2.5 py-2 text-xs transition-colors ${
                        isActive
                          ? 'bg-accent-violet/12 text-violet-200'
                          : 'text-archive-500 hover:bg-white/[0.045] hover:text-archive-200'
                      }`
                    }
                    title={game.display_name}
                  >
                    <span className="block truncate">{game.display_name}</span>
                  </NavLink>
                ))
              )}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-white/[0.055] pt-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-archive-500">档案工具</p>
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
        </div>
      </nav>

      <div className="relative mx-3 mb-3 rounded-panel border border-white/[0.06] bg-white/[0.035] p-3.5">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 rounded-lg bg-accent-violet/12 p-1.5 text-violet-300">
            <Sparkles size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-archive-200">本地优先</p>
            <p className="mt-1 text-[11px] leading-4 text-archive-500">你的游戏记录与截图档案仅保存在本机。</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
