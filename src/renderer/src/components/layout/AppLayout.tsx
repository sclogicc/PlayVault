/* 视觉基线：侧栏是内容空间的低对比边缘；F11 沉浸时撤去导航，让场景档案独占画面。 */
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout(): React.ReactElement {
  const [immersive, setImmersive] = useState(false)

  useEffect(() => {
    void window.api.window.getImmersive().then(setImmersive)
    return window.api.window.onImmersiveChange(setImmersive)
  }, [])

  return (
    <div className={`flex h-screen overflow-hidden bg-[var(--pv-void)] text-archive-100 transition-colors duration-300 ${immersive ? 'is-immersive' : ''}`}>
      {!immersive && <Sidebar />}
      <main className="relative min-w-0 flex-1 overflow-hidden bg-[var(--pv-void)] transition-colors duration-300">
        <div className="h-full overflow-x-hidden overflow-y-auto">
          <div className="animate-soft-enter">
            <Outlet />
          </div>
        </div>
        {immersive && <div className="scene-immersive-hint">沉浸浏览 · 按 <kbd>F11</kbd> 或 <kbd>Esc</kbd> 退出</div>}
      </main>
    </div>
  )
}
