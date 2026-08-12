import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Games from './pages/Games'
import Archives from './pages/Archives'
import GameDetail from './pages/GameDetail'
import Discover from './pages/Discover'
import Screenshots from './pages/Screenshots'
import Timeline from './pages/Timeline'
import Settings from './pages/Settings'

export default function App(): React.ReactElement {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="games" element={<Games />} />
          <Route path="archives" element={<Archives />} />
          <Route path="games/:gameId" element={<GameDetail />} />
          <Route path="discover" element={<Discover />} />
          <Route path="screenshots" element={<Screenshots />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
