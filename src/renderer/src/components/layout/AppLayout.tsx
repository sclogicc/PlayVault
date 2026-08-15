import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout(): React.ReactElement {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--pv-void)] text-archive-100 transition-colors duration-300">
      <Sidebar />
      <main className="relative min-w-0 flex-1 overflow-hidden transition-colors duration-300">
        <div className="h-full overflow-x-hidden overflow-y-auto">
          <div className="animate-soft-enter">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
