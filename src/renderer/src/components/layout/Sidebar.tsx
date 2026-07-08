import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Gamepad2,
  Image,
  Clock,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/', label: '总览', icon: LayoutDashboard },
  { to: '/games', label: '游戏库', icon: Gamepad2 },
  { to: '/screenshots', label: '截图箱', icon: Image },
  { to: '/timeline', label: '时间线', icon: Clock },
  { to: '/settings', label: '设置', icon: Settings },
]

export default function Sidebar(): React.ReactElement {
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
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={18} />
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
