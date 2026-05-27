import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'

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

function OperationsHero() {
  const [tab, setTab] = useState('activos')

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/5 bg-[#07090d] shadow-[0_0_90px_rgba(0,212,255,0.06)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,212,255,0.08),transparent_35%),radial-gradient(circle_at_85%_75%,rgba(0,245,160,0.05),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.72)_100%)]" />

      <div className="relative z-10 grid min-h-[560px] grid-cols-1 lg:grid-cols-[0.9fr_1.45fr]">
        <div className="flex flex-col justify-center border-b border-white/5 p-8 lg:border-b-0 lg:border-r lg:p-12">
          <div className="mb-8 flex items-center gap-3">
            <LogoMark small />
            <div>
              <div className="text-sm font-black uppercase tracking-[0.24em] text-neutral-200">
                Heavy<span className="text-cyan-300">Metric</span>
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-600">
                Operations · Intelligence · Continuity
              </div>
            </div>
          </div>

          <div className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-300/75">
            <span className="h-px w-10 bg-cyan-300/50" />
            Operational Command Layer
          </div>

          <h1 className="max-w-xl text-4xl font-light leading-tight tracking-tight text-neutral-100 md:text-5xl">
            <span className="font-semibold text-white">Control total</span> sobre maquinaria, taller, stock y tesorería.
          </h1>

          <div className="mt-8 space-y-3">
            {[
              ['Activos', '4.821 h horómetro', 'bg-cyan-300'],
              ['Taller', '3 OT en proceso', 'bg-emerald-300'],
              ['Stock', '4 ítems críticos', 'bg-amber-300'],
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center gap-4">
                <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
                <span className="w-24 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  {label}
                </span>
                <span className="font-mono text-sm text-neutral-300">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/login">
              <button className="rounded-lg border border-cyan-300/60 px-6 py-3 font-mono text-xs uppercase tracking-[0.18em] text-cyan-300 transition-colors hover:bg-cyan-300/10">
                Ver demo ↗
              </button>
            </Link>
            <Link to="/login">
              <button className="rounded-lg border border-white/10 px-6 py-3 font-mono text-xs uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:border-white/20 hover:text-white">
                Más información
              </button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col justify-center p-6 lg:p-8">
          <div className="mb-5 flex border-b border-white/5">
            {[
              ['activos', '◈ Activos'],
              ['taller', '⚙ Taller'],
              ['stock', '▦ Stock'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`border-b-2 px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                  tab === key
                    ? 'border-cyan-300 text-white'
                    : 'border-transparent text-neutral-600 hover:text-neutral-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'activos' && (
            <div className="space-y-4">
              <div className="relative h-[230px] overflow-hidden rounded-lg border border-white/5 bg-[#0d1016]">
                <div className="absolute bottom-8 left-[5%] right-[5%] h-px bg-cyan-300/15" />

                <div className="absolute left-6 top-4 rounded border border-cyan-300/30 bg-[#07090d] px-3 py-1 font-mono text-xs text-neutral-300">
                  <span className="text-cyan-300">2.340</span> RPM
                </div>
                <div className="absolute right-8 top-4 rounded border border-cyan-300/30 bg-[#07090d] px-3 py-1 font-mono text-xs text-neutral-300">
                  <span className="text-cyan-300">87°C</span> Temp
                </div>
                <div className="absolute bottom-16 right-6 rounded border border-amber-300/30 bg-[#07090d] px-3 py-1 font-mono text-xs text-neutral-300">
                  <span className="text-amber-300">⚠</span> Filtro
                </div>

                <svg viewBox="0 0 420 160" className="absolute inset-0 m-auto h-[82%] w-[90%]">
                  <g opacity="0.85">
                    <rect x="60" y="70" width="300" height="55" rx="6" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                    <rect x="80" y="50" width="140" height="30" rx="4" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <rect x="200" y="48" width="100" height="28" rx="3" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.75" />
                    <rect x="340" y="55" width="50" height="20" rx="3" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.75" />
                    <circle cx="110" cy="130" r="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                    <circle cx="310" cy="130" r="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                    <rect x="30" y="75" width="40" height="35" rx="3" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  </g>
                  <line x1="140" y1="60" x2="40" y2="30" stroke="rgba(0,212,255,0.25)" strokeWidth="0.75" strokeDasharray="3 3" />
                  <line x1="260" y1="55" x2="350" y2="20" stroke="rgba(0,212,255,0.25)" strokeWidth="0.75" strokeDasharray="3 3" />
                  <line x1="310" y1="115" x2="380" y2="90" stroke="rgba(0,212,255,0.2)" strokeWidth="0.75" strokeDasharray="3 3" />
                </svg>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  ['Horómetro', '4.821', 'horas totales', 'text-cyan-300', 'border-l-cyan-300'],
                  ['Próx. servicio', '179', 'horas restantes', 'text-emerald-300', 'border-l-emerald-300'],
                  ['P. hidráulica', '210', 'bar · revisar', 'text-amber-300', 'border-l-amber-300'],
                ].map(([label, value, sub, color, border]) => (
                  <div key={label} className={`rounded-lg border border-white/5 border-l-2 ${border} bg-[#0d1016] p-4`}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-600">{label}</div>
                    <div className={`mt-3 font-mono text-3xl font-black ${color}`}>{value}</div>
                    <div className="mt-1 font-mono text-xs text-neutral-600">{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'taller' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0d1016] p-5">
                <div>
                  <div className="font-mono text-lg font-black text-white">OT #2847</div>
                  <div className="mt-1 text-sm text-neutral-500">Ford F-250 · AAB-234 · KM 87.420 · Bahía 3</div>
                </div>
                <span className="rounded border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 font-mono text-xs uppercase text-emerald-300">
                  ● En proceso
                </span>
              </div>

              <div className="rounded-lg border border-white/5 bg-[#0d1016]">
                {[
                  ['✓', 'Diagnóstico inicial', '15 min', 'text-emerald-300'],
                  ['►', 'Cambio filtros + aceite motor', 'En proceso', 'text-cyan-300'],
                  ['○', 'Revisión frenos traseros', 'Pendiente', 'text-neutral-500'],
                  ['○', 'Test ruta final', 'Pendiente', 'text-neutral-500'],
                ].map(([icon, task, time, color]) => (
                  <div key={task} className="flex items-center gap-3 border-b border-white/5 px-5 py-4 last:border-b-0">
                    <span className={`font-mono ${color}`}>{icon}</span>
                    <span className="flex-1 text-sm text-neutral-300">{task}</span>
                    <span className="font-mono text-xs text-neutral-600">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'stock' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  ['4', 'Bajo mínimo', 'text-amber-300'],
                  ['1', 'Sin stock', 'text-red-400'],
                  ['$ 1.284.500', 'Valor inventario', 'text-neutral-200'],
                ].map(([value, label, color]) => (
                  <div key={label} className="rounded-lg border border-white/5 bg-[#0d1016] p-5">
                    <div className={`font-mono text-2xl font-black ${color}`}>{value}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-600">{label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  ['P550342', 'Filtro aceite Donaldson', '2', 'Crítico', 'text-amber-300'],
                  ['B2430X', 'Correa poly-v 8PK', '0', 'Sin stock', 'text-red-400'],
                  ['HY-7712', 'Sello hidráulico 80mm', '1', 'Crítico', 'text-amber-300'],
                  ['TR-4490', 'Pastillas freno trasero', '12', 'OK', 'text-emerald-300'],
                  ['OL-220W', 'Aceite motor 20W-50', '8', 'OK', 'text-emerald-300'],
                  ['GR-190', 'Grasa alta temp.', '3', 'Crítico', 'text-amber-300'],
                ].map(([ref, name, qty, status, color]) => (
                  <div key={ref} className="rounded-lg border border-white/5 bg-[#0d1016] p-4">
                    <div className="font-mono text-[10px] text-neutral-600">{ref}</div>
                    <div className="mt-1 min-h-10 text-sm font-semibold text-neutral-300">{name}</div>
                    <div className={`mt-3 font-mono text-2xl font-black ${color}`}>{qty}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600">{status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between font-mono text-[10px] text-neutral-700">
            <span>
              <span className="text-cyan-300">∞</span> HeavyMetric OS · v2.1.4 · Conectado
            </span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-emerald-300">
              ● Live System
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

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

      <main className="px-6 pb-20 pt-32">
        <div className="mx-auto max-w-7xl">
          <OperationsHero />
        </div>
      </main>

      <section className="relative overflow-hidden border-t border-neutral-900 bg-[#070809] py-24">
        <div className="pointer-events-none absolute inset-0 z-0 select-none">
          <video
            src="https://assets.mixkit.co/videos/7163/7163-720.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover opacity-80"
            style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b0c0e] via-[#0b0c0e]/30 to-[#0b0c0e]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.30em] text-neutral-500">
              Ecosistema operativo
            </div>
            <h2 className="mb-4 text-3xl font-black tracking-tight text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.8)] md:text-5xl">
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
                className="group rounded-2xl border border-white/5 bg-[#0e1013]/90 p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[#121418]/95"
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