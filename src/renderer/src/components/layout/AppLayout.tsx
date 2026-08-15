import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout(): React.ReactElement {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0a09] text-archive-100">
      <Sidebar />
      <main className="relative min-w-0 flex-1 overflow-hidden">
        <div className="h-full overflow-x-hidden overflow-y-auto">
          <div className="animate-soft-enter">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
