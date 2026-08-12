import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout(): React.ReactElement {
  return (
    <div className="flex h-screen overflow-hidden bg-archive-950">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">
        <div className="pointer-events-none fixed inset-0 left-[244px] -z-0 overflow-hidden">
          <div className="absolute right-[12%] top-[-18rem] h-[42rem] w-[42rem] rounded-full bg-violet-600/10 blur-[130px] animate-ambient-pulse" />
          <div className="absolute bottom-[-20rem] left-[12%] h-[36rem] w-[36rem] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 py-6 lg:px-8 lg:py-8">
          <div className="animate-soft-enter">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
