import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AsistenteIA from '../AsistenteIA'

export default function Layout() {
  return (
    <div className="flex h-screen bg-hm-bg text-hm-text overflow-hidden font-sans relative">
      {/* Subtle global glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-hm-accent/5 rounded-full blur-[120px] pointer-events-none" />
      
      <Sidebar />
      <div className="flex flex-col flex-1 relative z-10">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
        <AsistenteIA />
      </div>
    </div>
  )
}
