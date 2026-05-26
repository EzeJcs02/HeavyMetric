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

      <main className="relative px-6 pb-24 pt-36">
        <div className="pointer-events-none absolute left-1/2 top-24 h-[540px] w-[720px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[140px]" />
        <div className="pointer-events-none absolute right-0 top-40 h-[420px] w-[420px] rounded-full bg-emerald-400/5 blur-[120px]" />

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div className="relative z-10 flex flex-col gap-8">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-[#00f5a0]" />
                <span className="font-mono text-xs text-neutral-500">
                  v2.5 — Plataforma Operativa 360
                </span>
              </div>

              <h1 className="mb-6 max-w-2xl text-5xl font-black leading-[1.05] tracking-tighter md:text-7xl">
                Operación, activos y postventa en un{' '}
                <span className="bg-gradient-to-r from-amber-400 via-zinc-400 to-blue-500 bg-clip-text text-transparent">
                  solo sistema.
                </span>
              </h1>

              <p className="max-w-xl text-lg leading-relaxed text-neutral-500 md:text-xl">
                HeavyMetric centraliza clientes, activos, OTs, stock, tesorería,
                proveedores, aprobaciones y continuidad operativa para PyMEs
                industriales, talleres, rental y flotas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link to="/login">
                <button className="h-14 rounded-xl bg-white px-8 text-lg font-bold text-black transition-colors hover:bg-neutral-200">
                  Iniciar sesión
                </button>
              </Link>

              <button className="h-14 rounded-xl border border-neutral-700 bg-neutral-950/40 px-8 text-lg font-bold text-white transition-colors hover:border-cyan-300/40 hover:bg-neutral-900">
                Solicitar Demo
              </button>
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-4 border-t border-neutral-800 pt-8">
              <div>
                <div className="font-mono text-2xl font-black text-amber-400">360°</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                  Operación
                </div>
              </div>

              <div>
                <div className="font-mono text-2xl font-black text-cyan-300">LIVE</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                  Alertas
                </div>
              </div>

              <div>
                <div className="font-mono text-2xl font-black text-emerald-300">IA</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                  Silenciosa
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <HeroOperations />
          </div>
        </div>
      </main>

      <section className="border-t border-neutral-900 bg-black/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.30em] text-neutral-600">
              Ecosistema operativo
            </div>
            <h2 className="mb-4 text-3xl font-black tracking-tight md:text-5xl">
              Todo conectado. Sin planillas aisladas.
            </h2>
            <p className="text-lg text-neutral-500">
              Una plataforma para vender, operar, mantener, cobrar y decidir.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <div
                key={mod.t}
                className="group rounded-2xl border border-neutral-800/80 bg-neutral-950/50 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-neutral-900/70"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700/70 bg-neutral-900 font-mono text-lg text-cyan-200 transition-transform group-hover:scale-105">
                  {mod.i}
                </div>
                <h3 className="mb-2 text-lg font-black">{mod.t}</h3>
                <p className="text-sm leading-relaxed text-neutral-500">{mod.d}</p>
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