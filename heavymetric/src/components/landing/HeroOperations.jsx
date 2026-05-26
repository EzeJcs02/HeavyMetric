import { useState } from 'react'

const tabs = {
  activos: {
    title: 'Activo 360',
    subtitle: 'Telemetría operativa y continuidad.',
    accent: 'text-amber-300',
    border: 'border-amber-300/30',
    glow: 'shadow-amber-400/10',
    code: 'ACTIVO360',
    stats: [
      ['Estado', 'Operativo'],
      ['Horómetro', '3.542 hs'],
      ['Ubicación', 'Campo Norte'],
      ['Health', '98%'],
    ],
  },

  taller: {
    title: 'OT 360',
    subtitle: 'Servicio técnico y postventa.',
    accent: 'text-cyan-300',
    border: 'border-cyan-300/30',
    glow: 'shadow-cyan-400/10',
    code: 'TALLER360',
    stats: [
      ['OT', '#4829'],
      ['Mecánico', 'Asignado'],
      ['Progreso', '74%'],
      ['SLA', 'Normal'],
    ],
  },

  stock: {
    title: 'Stock Inteligente',
    subtitle: 'Filtros, mínimos y reposición.',
    accent: 'text-emerald-300',
    border: 'border-emerald-300/30',
    glow: 'shadow-emerald-400/10',
    code: 'STOCKAI',
    stats: [
      ['Crítico', '3 ítems'],
      ['Proveedor', 'Activo'],
      ['Rotación', 'Normal'],
      ['Alertas', '2'],
    ],
  },
}

function HeavyMetricLogo() {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-neutral-700/80 bg-neutral-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,245,160,0.12),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(37,99,235,0.16),transparent_40%)]" />

        <span className="bg-gradient-to-br from-zinc-100 via-zinc-400 to-zinc-700 bg-clip-text font-mono text-4xl font-black text-transparent">
          ∞
        </span>
      </div>

      <div>
        <div className="bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-3xl font-black tracking-[0.08em] text-transparent">
          HEAVYMETRIC
        </div>

        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.35em] text-neutral-500">
          Operations • Intelligence • Continuity
        </div>
      </div>
    </div>
  )
}

function ActiveVisual() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute bottom-20 left-10 h-20 w-56 rounded-t-3xl border border-amber-300/20 bg-amber-300/5" />

      <div className="absolute bottom-12 left-16 h-16 w-16 rounded-full border-[10px] border-neutral-600/25" />
      <div className="absolute bottom-12 left-52 h-16 w-16 rounded-full border-[10px] border-neutral-600/25" />

      <div className="absolute bottom-32 left-48 h-4 w-52 origin-left -rotate-[24deg] rounded-full bg-amber-300/20" />

      <div className="absolute bottom-56 left-[330px] h-4 w-32 rotate-[20deg] rounded-full bg-amber-300/15" />

      <div className="absolute right-12 top-12 rounded-xl border border-neutral-700/70 bg-black/60 p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
          Hydraulic pressure
        </div>

        <div className="mt-2 font-mono text-2xl font-black text-emerald-300">
          NORMAL
        </div>
      </div>
    </div>
  )
}

function TallerVisual() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute bottom-20 left-10 h-24 w-72 rounded-2xl border border-cyan-300/20 bg-cyan-300/5" />

      <div className="absolute bottom-10 left-20 h-16 w-16 rounded-full border-[10px] border-neutral-600/25" />

      <div className="absolute bottom-10 left-72 h-16 w-16 rounded-full border-[10px] border-neutral-600/25" />

      <div className="absolute bottom-44 left-40 h-16 w-32 rounded-t-2xl border border-cyan-300/20 bg-neutral-900/50" />

      <div className="absolute right-12 top-16 w-56 rounded-2xl border border-neutral-700/70 bg-black/60 p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
          Orden de trabajo
        </div>

        <div className="mt-4 h-2 rounded-full bg-neutral-800">
          <div className="h-2 w-[72%] rounded-full bg-cyan-300" />
        </div>

        <div className="mt-3 font-mono text-xs text-neutral-400">
          SLA monitoreado
        </div>
      </div>
    </div>
  )
}

function StockVisual() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute left-12 top-20 grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-24 w-28 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3"
          >
            <div className="mx-auto h-12 w-12 rounded-full border-[10px] border-neutral-600/25" />

            <div className="mt-3 h-2 rounded bg-neutral-700/50" />
          </div>
        ))}
      </div>

      <div className="absolute bottom-12 right-12 rounded-2xl border border-red-400/30 bg-black/60 p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-300">
          Stock crítico
        </div>

        <div className="mt-2 font-mono text-xl font-black text-white">
          Filtros mínimos
        </div>

        <div className="mt-2 font-mono text-xs text-neutral-400">
          Reposición sugerida
        </div>
      </div>
    </div>
  )
}

function HeroScene({ activeTab }) {
  if (activeTab === 'taller') return <TallerVisual />
  if (activeTab === 'stock') return <StockVisual />

  return <ActiveVisual />
}

export default function HeroOperations() {
  const [activeTab, setActiveTab] = useState('activos')

  const tab = tabs[activeTab]

  return (
    <>
      <style>
        {`
          @keyframes hmFloat {
            0%,100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }

          @keyframes hmPulse {
            0%,100% { opacity: .35; }
            50% { opacity: 1; }
          }

          @keyframes hmScan {
            0% { transform: translateX(-120%); opacity: 0; }
            25% { opacity: .6; }
            75% { opacity: .6; }
            100% { transform: translateX(130%); opacity: 0; }
          }

          .hm-float {
            animation: hmFloat 6s ease-in-out infinite;
          }

          .hm-pulse {
            animation: hmPulse 2.5s ease-in-out infinite;
          }

          .hm-scan::before {
            content:'';
            position:absolute;
            inset:0;
            width:35%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(0,245,160,.08),
              transparent
            );
            animation: hmScan 5s ease-in-out infinite;
            pointer-events:none;
          }
        `}
      </style>

      <div className="relative flex h-[620px] w-full items-center justify-center">
        <div className="absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />

        <div className="absolute top-0">
          <HeavyMetricLogo />
        </div>

        <div className={`hm-float hm-scan relative mt-28 w-full max-w-[980px] overflow-hidden rounded-[32px] border ${tab.border} bg-neutral-950/80 shadow-2xl ${tab.glow} backdrop-blur-xl`}>
          <div className="flex h-14 items-center border-b border-neutral-800/70 bg-neutral-900/60 px-5">
            <div className="flex gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500/60" />
              <span className="h-3 w-3 rounded-full bg-amber-500/60" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/60" />
            </div>

            <div className="ml-8 flex gap-3">
              {Object.entries(tabs).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`rounded-full px-4 py-1 font-mono text-xs font-bold transition-all ${
                    activeTab === key
                      ? 'bg-white/10 text-white'
                      : 'text-neutral-500 hover:text-neutral-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2 rounded-full border border-neutral-700/70 bg-black/40 px-3 py-1">
              <span className="hm-pulse h-2 w-2 rounded-full bg-[#00f5a0]" />

              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                Live System
              </span>
            </div>
          </div>

          <div className="relative h-[520px] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_40%),linear-gradient(to_bottom,#0b0c0e,#050505)]">
            <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:28px_28px]" />

            <HeroScene activeTab={activeTab} />

            <div className="absolute bottom-8 left-8 w-[420px] rounded-3xl border border-neutral-700/70 bg-black/70 p-6 backdrop-blur-xl">
              <div className={`bg-gradient-to-r ${tab.gradient} bg-clip-text font-mono text-[10px] font-black uppercase tracking-[0.22em] text-transparent`}>
                {tab.code}
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                {tab.title}
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {tab.subtitle}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-5">
                {tab.stats.map(([label, value]) => (
                  <div key={label}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                      {label}
                    </div>

                    <div className={`mt-1 font-mono text-sm font-black ${tab.accent}`}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute right-8 top-8 rounded-2xl border border-neutral-700/70 bg-black/50 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                OPS STATUS
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="hm-pulse h-2 w-2 rounded-full bg-[#00f5a0]" />

                <span className="font-mono text-xs font-bold text-emerald-300">
                  ONLINE
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}