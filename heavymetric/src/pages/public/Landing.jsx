import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import HeroOperations from '../../components/landing/HeroOperations'

const modules = [
  { t: 'Cliente 360', d: 'Historial comercial, postventa, deuda, equipos y oportunidades.', i: '◎' },
  { t: 'Activo 360', d: 'Fichas técnicas, horómetros, disponibilidad y continuidad operativa.', i: '∞' },
  { t: 'OT 360', d: 'Órdenes de trabajo, técnicos, repuestos, checklists y garantías.', i: '⌁' },
  { t: 'Stock Inteligente', d: 'Mínimos, inmovilizado, rotación, filtros y alertas de compra.', i: '▣' },
  { t: 'Tesorería PyME', d: 'Caja, bancos, pagos, cobranzas, mora, E-Cheqs y flujo proyectado.', i: '$' },
  { t: 'Workflow', d: 'Aprobaciones silenciosas para descuentos, compras, pagos y riesgos.', i: '✓' },
]

const LogoMark = ({ small = false }) => (
  <div
    className={`relative flex ${
      small ? 'h-8 w-8 rounded-lg' : 'h-11 w-11 rounded-xl'
    } items-center justify-center overflow-hidden border border-neutral-700/70 bg-neutral-950`}
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(0,245,160,0.18),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(37,99,235,0.18),transparent_40%)]" />
    <span
      className={`relative bg-gradient-to-br from-zinc-100 via-zinc-400 to-zinc-600 bg-clip-text font-mono ${
        small ? 'text-lg' : 'text-2xl'
      } font-black text-transparent`}
    >
      ∞
    </span>
  </div>
)

export default function Landing() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0c0e] font-mono text-neutral-500">
        Cargando...
      </div>
    )
  }

  if (user) return <Navigate to="/app" replace />

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b0c0e] text-white selection:bg-cyan-300 selection:text-black">
      <header className="fixed top-0 z-50 w-full border-b border-neutral-800/70 bg-[#0b0c0e]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <div className="text-xl font-black tracking-tight">HeavyMetric</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-neutral-500">
                Operations System
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden text-sm font-medium text-neutral-500 transition-colors hover:text-white sm:block"
            >
              Iniciar Sesión
            </Link>

            <Link to="/login">
              <Button variant="primary">Entrar al Sistema</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="px-6 pb-24 pt-28">
        <div className="mx-auto max-w-7xl">
          <HeroOperations />
        </div>
      </main>

      <section className="relative border-t border-neutral-900 py-24 overflow-hidden bg-[#070809]">
        {/* Video Background (using optimized 360p version for performance and fluidity) */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <video 
            src="https://assets.mixkit.co/videos/7163/7163-360.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover opacity-50"
          />
          {/* Overlay gradient to blend with surrounding sections and make text readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b0c0e] via-black/30 to-[#0b0c0e]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.30em] text-neutral-500">
              Ecosistema operativo
            </div>
            <h2 className="mb-4 text-3xl font-black tracking-tight md:text-5xl text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]">
              Todo conectado. Sin planillas aisladas.
            </h2>
            <p className="text-lg text-neutral-300 [text-shadow:0_1px_5px_rgba(0,0,0,0.8)]">
              Una plataforma para vender, operar, mantener, cobrar y decidir.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <div
                key={mod.t}
                className="group rounded-2xl border border-white/5 bg-[#0e1013]/90 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[#121418]/95 shadow-xl"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800/80 bg-neutral-950 font-mono text-lg text-cyan-200 transition-transform group-hover:scale-105">
                  {mod.i}
                </div>
                <h3 className="mb-2 text-lg font-black text-white">{mod.t}</h3>
                <p className="text-sm leading-relaxed text-neutral-400">{mod.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-900 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 font-mono text-xs text-neutral-600 md:flex-row">
          <div className="flex items-center gap-2">
            <LogoMark small />
            <span>© 2026 HeavyMetric — Operations System.</span>
          </div>

          <div className="flex gap-4">
            <a href="#" className="transition-colors hover:text-white">
              Términos
            </a>
            <a href="#" className="transition-colors hover:text-white">
              Privacidad
            </a>
            <a href="#" className="transition-colors hover:text-white">
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}