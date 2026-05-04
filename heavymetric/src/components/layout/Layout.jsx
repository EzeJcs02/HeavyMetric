import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AlertasBanner from './AlertasBanner'
import AsistenteIA from '../AsistenteIA'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-hm-bg text-hm-text overflow-hidden font-sans relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-hm-accent/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transition-transform duration-200
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-col flex-1 relative z-10 min-w-0">
        <Topbar onMenuToggle={() => setSidebarOpen(o => !o)} />
        <AlertasBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
        <AsistenteIA />
      </div>
    </div>
  )
}
