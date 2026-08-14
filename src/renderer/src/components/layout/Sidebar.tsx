import { NavLink } from 'react-router-dom'
import {
  Archive,
  Clock3,
  Gamepad2,
  HardDrive,
  Image,
  Search,
  Settings,
} from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { to: '/games', icon: <Gamepad2 size={18} strokeWidth={1.7} />, label: '游戏库' },
  { to: '/archives', icon: <Archive size={18} strokeWidth={1.7} />, label: '游玩回顾' },
  { to: '/screenshots', icon: <Image size={18} strokeWidth={1.7} />, label: '截图箱' },
]

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { to: '/timeline', icon: <Clock3 size={18} strokeWidth={1.7} />, label: '时间线' },
  { to: '/discover', icon: <Search size={18} strokeWidth={1.7} />, label: '发现候选' },
]

function navClass(isActive: boolean): string {
  return `group relative flex h-11 w-11 items-center justify-center border transition-colors ${
    isActive
      ? 'border-[#c9a35a]/70 bg-[#17140f] text-[#ead7aa]'
      : 'border-transparent text-archive-500 hover:border-white/[0.10] hover:bg-white/[0.035] hover:text-archive-200'
  }`
}

function NavButton({ item }: { item: NavItem }): React.ReactElement {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => navClass(isActive)}
      aria-label={item.label}
      title={item.label}
    >
      {item.icon}
      <span className="pointer-events-none absolute left-[calc(100%+10px)] z-30 hidden whitespace-nowrap border border-white/[0.10] bg-[#15171a] px-2.5 py-1.5 text-xs text-archive-200 shadow-lg group-hover:block">
        {item.label}
      </span>
    </NavLink>
  )
}

export default function Sidebar(): React.ReactElement {
  return (
    <aside className="flex h-screen w-[72px] min-w-[72px] flex-col items-center border-r border-white/[0.075] bg-[#0a0c0f] py-5">
      <NavLink
        to="/games"
        aria-label="PlayVault 游戏库"
        title="PlayVault"
        className="flex h-11 w-11 items-center justify-center border border-[#c9a35a]/55 text-[#d6b36a] transition-colors hover:bg-[#17140f]"
      >
        <Gamepad2 size={19} strokeWidth={1.7} />
      </NavLink>

      <nav className="mt-10 flex flex-col items-center gap-2" aria-label="主要导航">
        {MAIN_NAV_ITEMS.map((item) => <NavButton key={item.to} item={item} />)}
      </nav>

      <div className="my-6 h-px w-7 bg-white/[0.08]" />

      <nav className="flex flex-col items-center gap-2" aria-label="工具导航">
        {SECONDARY_NAV_ITEMS.map((item) => <NavButton key={item.to} item={item} />)}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-3">
        <NavLink to="/settings" className={({ isActive }) => navClass(isActive)} aria-label="设置" title="设置">
          <Settings size={18} strokeWidth={1.7} />
        </NavLink>
        <span className="flex h-8 w-8 items-center justify-center text-archive-700" title="仅本地存储">
          <HardDrive size={14} />
        </span>
      </div>
    </aside>
  )
}
