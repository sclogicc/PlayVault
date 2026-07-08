import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout(): React.ReactElement {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-archive-900">
        <div className="p-6 max-w-[1200px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
