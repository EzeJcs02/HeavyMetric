import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Topbar from './Topbar'
import AlertasBanner from './AlertasBanner'
import AsistenteIA from '../AsistenteIA'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  const normalizedPath = location.pathname.replace(/\/$/, '')

  const isHome =
    normalizedPath === '' ||
    normalizedPath === '/app'

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-hm-bg font-sans text-hm-text">
      <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-hm-accent/5 blur-[120px]" />

      <Topbar />
      <AlertasBanner />

      <main className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">

          {!isHome && (
            <button
              onClick={() => navigate('/app')}
              className="group mb-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-hm-muted transition-colors hover:text-hm-text"
            >
              <svg
                className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>

              Centro de Operaciones
            </button>
          )}

          <Outlet />
        </div>
      </main>

      <AsistenteIA />
    </div>
  )
}