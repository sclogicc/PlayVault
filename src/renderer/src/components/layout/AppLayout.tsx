import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import UpdateBanner from './UpdateBanner'

export default function AppLayout(): React.ReactElement {
  return (
    <div className="flex h-screen overflow-hidden bg-[#090a0c] text-archive-100">
      <Sidebar />
      <main className="relative min-w-0 flex-1 overflow-hidden">
        <UpdateBanner />
        <div className="h-full overflow-x-hidden overflow-y-auto">
          <div className="animate-soft-enter">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
