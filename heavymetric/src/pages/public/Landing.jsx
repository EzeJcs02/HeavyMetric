import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'

const modules = [
  {
    t: 'Taller / OTs',
    d: 'Órdenes de trabajo, técnicos, repuestos y garantías con descuento automático de stock.',
    color: '#D97706',
    icon: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
  },
  {
    t: 'Alquileres',
    d: 'Contratos, horómetros, checklist entrada/salida y facturación automática al cierre.',
    color: '#3B82F6',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    t: 'CRM 360',
    d: 'Historial de clientes, deuda, cotizaciones, leads y actividad comercial en un solo panel.',
    color: '#10B981',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    t: 'Stock Inteligente',
    d: 'Mínimos, semáforo de alerta, rotación y órdenes de compra automáticas por rotura.',
    color: '#DC2626',
    icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
  },
  {
    t: 'Tesorería PyME',
    d: 'Caja, bancos, cobranzas, mora, flujo proyectado y tipo de cambio BNA en tiempo real.',
    color: '#10B981',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  },
  {
    t: 'CEO Dashboard',
    d: 'P&L, utilización de flota, top clientes, alertas ejecutivas y resultado neto en tiempo real.',
    color: '#8B5CF6',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
]

const LogoMark = ({ small = false }) => (
  <div
    className={`relative flex ${
      small ? 'h-8 w-8 rounded-lg' : 'h-11 w-11 rounded-xl'
    } items-center justify-center overflow-hidden border border-neutral-700/70 bg-neutral-950`}
  >
    <svg
      className={`relative text-amber-500 ${small ? 'h-3.5 w-3.5' : 'h-5 w-5'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  </div>
)

function OperationsHero() {
  const [tab, setTab] = useState('activos')

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/5 bg-[#07090d] shadow-[0_0_90px_rgba(217,119,6,0.06)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(217,119,6,0.08),transparent_35%),radial-gradient(circle_at_85%_75%,rgba(245,158,11,0.05),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(217,119,6,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(217,119,6,0.025)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.72)_100%)]" />

      <div className="relative z-10 grid min-h-[560px] grid-cols-1 lg:grid-cols-[0.9fr_1.45fr]">
        <div className="flex flex-col justify-center border-b border-white/5 p-8 lg:border-b-0 lg:border-r lg:p-12">
          <div className="mb-8 flex items-center gap-3">
            <LogoMark small />
            <div>
              <div className="text-sm font-black uppercase tracking-[0.24em] text-neutral-200">
                Heavy<span className="text-amber-400">Metric</span>
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-600">
                Operations · Intelligence · Continuity
              </div>
            </div>
          </div>

          <div className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-amber-400/75">
            <span className="h-px w-10 bg-amber-400/50" />
            Operational Command Layer
          </div>

          <h1 className="max-w-xl text-4xl font-light leading-tight tracking-tight text-neutral-100 md:text-5xl">
            <span className="font-semibold text-white">Control total</span> sobre maquinaria, taller, stock y tesorería.
          </h1>

          <div className="mt-8 space-y-3">
            {[
              ['Activos', '4.821 h horómetro', 'bg-amber-400'],
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
              <button className="rounded-lg border border-amber-400/60 px-6 py-3 font-mono text-xs uppercase tracking-[0.18em] text-amber-400 transition-colors hover:bg-amber-400/10">
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
                    ? 'border-amber-400 text-white'
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
                <div className="absolute bottom-8 left-[5%] right-[5%] h-px bg-amber-400/15" />

                <div className="absolute left-6 top-4 rounded border border-amber-400/30 bg-[#07090d] px-3 py-1 font-mono text-xs text-neutral-300">
                  <span className="text-amber-400">2.340</span> RPM
                </div>
                <div className="absolute right-8 top-4 rounded border border-amber-400/30 bg-[#07090d] px-3 py-1 font-mono text-xs text-neutral-300">
                  <span className="text-amber-400">87°C</span> Temp
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
                  <line x1="140" y1="60" x2="40" y2="30" stroke="rgba(217,119,6,0.25)" strokeWidth="0.75" strokeDasharray="3 3" />
                  <line x1="260" y1="55" x2="350" y2="20" stroke="rgba(217,119,6,0.25)" strokeWidth="0.75" strokeDasharray="3 3" />
                  <line x1="310" y1="115" x2="380" y2="90" stroke="rgba(217,119,6,0.2)" strokeWidth="0.75" strokeDasharray="3 3" />
                </svg>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  ['Horómetro', '4.821', 'horas totales', 'text-amber-400', 'border-l-amber-400'],
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
                  ['►', 'Cambio filtros + aceite motor', 'En proceso', 'text-amber-400'],
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
              <span className="text-amber-400">∞</span> HeavyMetric OS · v2.1.4 · Conectado
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
    <div className="min-h-screen overflow-x-hidden bg-[#0b0c0e] text-white selection:bg-amber-400 selection:text-black">
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

          <nav className="hidden items-center gap-7 lg:flex">
            <a href="#producto" className="text-sm font-medium text-neutral-500 transition-colors hover:text-white">Producto</a>
            <a href="#modulos" className="text-sm font-medium text-neutral-500 transition-colors hover:text-white">Módulos</a>
            <a href="#precios" className="text-sm font-medium text-neutral-500 transition-colors hover:text-white">Precios</a>
            <a href="#casos" className="text-sm font-medium text-neutral-500 transition-colors hover:text-white">Casos de uso</a>
          </nav>

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

      <main>
        <section className="relative flex min-h-[580px] items-center justify-center overflow-hidden px-6 pb-20 pt-40 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(217,119,6,0.07),transparent_45%),radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.05),transparent_40%),radial-gradient(ellipse_at_center,transparent_40%,rgba(11,12,14,0.9)_100%)]" />

          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-3.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-500">v2.4.0 · Producción activa</span>
            </div>

            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-neutral-100 md:text-6xl">
              El ERP que entiende<br />
              <span className="text-amber-500">maquinaria pesada</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-neutral-500">
              Gestión de flota, taller, alquileres, stock y tesorería en una sola plataforma. Hecho para empresas que operan con activos de alto valor.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/login">
                <button className="flex items-center gap-2 rounded-md bg-amber-600 px-6 py-3 font-mono text-[13.5px] font-bold text-[#09090B] transition-colors hover:bg-amber-500">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Solicitar demo gratuita
                </button>
              </Link>
              <a href="#producto">
                <button className="rounded-md border border-white/10 px-6 py-3 font-mono text-[13.5px] font-medium text-neutral-400 transition-colors hover:border-white/20 hover:text-white">
                  Ver el producto →
                </button>
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
              {['ISO TRACEABILITY', 'SUPABASE BACKEND', 'MODO OFFLINE-FIRST', 'IA DE AUDITORÍA'].map((tag, i) => (
                <span key={tag} className="flex items-center gap-5">
                  {i > 0 && <span className="h-[3px] w-[3px] rounded-full bg-neutral-800" />}
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-700">{tag}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-neutral-900 py-8">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-y-8 px-6 md:grid-cols-4 md:gap-0">
            {[
              ['24+', 'activos en flota gestionados', 'text-amber-500'],
              ['8', 'módulos operativos integrados', 'text-white'],
              ['ISO', 'trazabilidad certificable', 'text-emerald-500'],
              ['IA', 'auditoría con Claude Anthropic', 'text-white'],
            ].map(([value, label, color], i) => (
              <div key={label} className={`text-center md:px-8 ${i < 3 ? 'md:border-r md:border-neutral-900' : ''}`}>
                <div className={`font-mono text-3xl font-bold tracking-tight ${color}`}>{value}</div>
                <div className="mt-1 text-xs text-neutral-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="producto" className="px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <OperationsHero />
          </div>
        </section>
      </main>

      <section id="modulos" className="relative overflow-hidden border-t border-neutral-900 bg-[#070809] py-24">
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
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.30em] text-amber-500/70">
              Plataforma completa
            </div>
            <h2 className="mb-4 text-3xl font-black tracking-tight text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.8)] md:text-5xl">
              Todo lo que necesitás, integrado
            </h2>
            <p className="text-lg text-neutral-300 [text-shadow:0_1px_5px_rgba(0,0,0,0.8)]">
              Cada módulo conecta con los demás. Los datos fluyen solos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <div
                key={mod.t}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0e1013]/90 p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#121418]/95"
              >
                <div className="absolute inset-x-0 top-0 h-0.5 opacity-70 transition-opacity group-hover:opacity-100" style={{ background: mod.color }} />
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border transition-transform group-hover:scale-105"
                  style={{ borderColor: `${mod.color}33`, background: `${mod.color}12` }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke={mod.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={mod.icon} />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-black text-white">{mod.t}</h3>
                <p className="text-sm leading-relaxed text-neutral-400">{mod.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-2xl px-6 pt-24 text-center">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.30em] text-amber-500/70">
            Para tu empresa
          </div>
          <h2 className="mb-4 text-3xl font-black tracking-tight text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.8)] md:text-4xl">
            ¿Listo para tener el control?
          </h2>
          <p className="mb-7 text-base leading-relaxed text-neutral-400 [text-shadow:0_1px_5px_rgba(0,0,0,0.8)]">
            Implementación rápida, capacitación incluida y soporte directo del equipo de Antigravity AI.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/login">
              <button className="rounded-md bg-amber-600 px-6 py-3 font-mono text-[13.5px] font-bold text-[#09090B] transition-colors hover:bg-amber-500">
                Solicitar demo gratuita
              </button>
            </Link>
            <Link to="/login">
              <button className="rounded-md border border-white/10 px-6 py-3 font-mono text-[13.5px] font-medium text-neutral-400 transition-colors hover:border-white/20 hover:text-white">
                Hablar con ventas
              </button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-900 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 font-mono text-xs text-neutral-600 md:flex-row">
          <div className="flex items-center gap-2">
            <LogoMark small />
            <span>HeavyMetric · Knock S.A. · Desarrollado por Antigravity AI</span>
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