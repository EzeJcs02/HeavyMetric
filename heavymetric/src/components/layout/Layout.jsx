import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Topbar from './Topbar'
import AlertasBanner from './AlertasBanner'
import AsistenteIA from '../AsistenteIA'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  return (
    <div className="flex flex-col h-screen bg-hm-bg text-hm-text font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-hm-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <Topbar />
      <AlertasBanner />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {!isHome && (
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-hm-muted hover:text-hm-text text-sm mb-5 transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Inicio
            </button>
          )}
          <Outlet />
        </div>
      </main>
      <AsistenteIA />
    </div>
  )
}
