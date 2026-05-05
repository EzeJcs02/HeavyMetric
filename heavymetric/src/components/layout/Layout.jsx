import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import AlertasBanner from './AlertasBanner'
import AsistenteIA from '../AsistenteIA'

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-hm-bg text-hm-text font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-hm-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <Topbar />
      <AlertasBanner />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <AsistenteIA />
    </div>
  )
}
