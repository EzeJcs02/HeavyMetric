import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'

export default function Landing() {
  const { user, loading } = useAuth()

  if (loading) return <div className="min-h-screen bg-hm-bg flex items-center justify-center text-hm-muted font-mono">Cargando...</div>
  if (user) return <Navigate to="/app" replace />

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-hm-accent selection:text-black overflow-x-hidden font-sans">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-hm-accent/20 border border-hm-accent/50 flex items-center justify-center">
              <span className="text-hm-accent text-xs font-black tracking-tighter">HM</span>
            </div>
            <span className="font-bold text-xl tracking-tight">HeavyMetric</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-hm-muted hover:text-white transition-colors hidden sm:block">
              Iniciar Sesión
            </Link>
            <Link to="/login">
              <Button variant="primary" className="shadow-[0_0_15px_rgba(0,229,255,0.3)]">Entrar al Sistema</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="pt-32 pb-20 px-6 relative">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-hm-accent/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="flex flex-col gap-8 z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                <span className="w-2 h-2 rounded-full bg-hm-accent animate-pulse" />
                <span className="text-xs font-mono text-hm-muted">v2.5 Ya disponible — SaaS Industrial</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-6">
                Operación, activos <br/> y postventa en un <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-hm-accent to-blue-500">solo sistema.</span>
              </h1>
              <p className="text-lg md:text-xl text-hm-muted max-w-lg leading-relaxed">
                Plataforma modular para PyMEs industriales, talleres, rental, flotas y empresas de servicios. Centralizá clientes, activos, OTs, stock, proveedores, cobranzas, BI y alertas operativas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link to="/login">
                <button className="h-14 px-8 rounded-lg bg-white text-black font-bold text-lg hover:bg-gray-200 transition-colors">
                  Iniciar sesión
                </button>
              </Link>
              <button className="h-14 px-8 rounded-lg bg-transparent border border-white/20 text-white font-bold text-lg hover:bg-white/5 transition-colors">
                Solicitar Demo
              </button>
            </div>
            
            <div className="pt-8 border-t border-white/10 flex gap-8">
              <div>
                <div className="text-3xl font-black text-hm-accent mb-1">+500</div>
                <div className="text-xs font-mono text-hm-muted uppercase">Equipos gestionados</div>
              </div>
              <div>
                <div className="text-3xl font-black text-hm-accent mb-1">99%</div>
                <div className="text-xs font-mono text-hm-muted uppercase">Uptime Operativo</div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: MOCKUP & CARDS */}
          <div className="relative z-10 w-full h-[500px] flex items-center justify-center lg:justify-end">
            
            {/* Main Mockup */}
            <div className="absolute w-[110%] md:w-[90%] lg:w-[120%] right-0 md:-right-10 rounded-2xl bg-[#111] border border-white/10 shadow-2xl shadow-black/50 overflow-hidden group">
              <div className="h-8 bg-[#1a1a1a] border-b border-white/5 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <div className="p-6 grid grid-cols-3 gap-4 bg-gradient-to-br from-[#111] to-[#0a0a0a]">
                <div className="col-span-3 pb-4 border-b border-white/5 mb-2">
                  <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                  <div className="h-8 w-48 bg-white/5 rounded" />
                </div>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`p-4 rounded-xl border border-white/5 bg-white/[0.02] ${i === 0 ? 'border-hm-accent/30 bg-hm-accent/5' : ''}`}>
                    <div className="h-3 w-16 bg-white/10 rounded mb-4" />
                    <div className="h-6 w-24 bg-white/20 rounded" />
                  </div>
                ))}
                <div className="col-span-3 mt-4 h-32 rounded-xl bg-gradient-to-r from-hm-accent/20 to-transparent border border-hm-accent/10" />
              </div>
            </div>

            {/* Floating Cards */}
            <div className="absolute -left-10 top-20 bg-[#161616] p-4 rounded-xl border border-white/10 shadow-xl hidden md:block animate-[bounce_5s_infinite]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-green-500/20 flex items-center justify-center text-xl">✅</div>
                <div>
                  <div className="text-sm font-bold">OT #1459 Lista</div>
                  <div className="text-xs text-hm-muted">Excavadora CAT 320</div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-10 right-10 bg-[#161616] p-4 rounded-xl border border-white/10 shadow-xl hidden md:block animate-[bounce_6s_infinite_reverse]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-red-500/20 flex items-center justify-center text-xl">⚠️</div>
                <div>
                  <div className="text-sm font-bold">Stock Crítico</div>
                  <div className="text-xs text-hm-muted">Filtro de Aceite (2 unid)</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* MODULES GRID */}
      <section className="py-24 bg-black/50 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">Todo en un ecosistema.</h2>
            <p className="text-hm-muted text-lg">HeavyMetric reemplaza tus planillas y softwares desconectados.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { t: 'Activos y Flota', d: 'Fichas 360, horómetros, disponibilidad y health score.', i: '🚜' },
              { t: 'Taller y Postventa', d: 'Órdenes de Trabajo, mecánicos, checklist y garantías.', i: '🔧' },
              { t: 'CRM y Comercial', d: 'Leads, cotizaciones dinámicas y facturación automática.', i: '🤝' },
              { t: 'Stock e Inventario', d: 'Mínimos, inmovilizado, rotación e IA silenciosa.', i: '📦' },
              { t: 'Tesorería y Finanzas', d: 'Caja, bancos, cuentas a pagar, mora y E-Cheqs.', i: '💰' },
              { t: 'CEO Dashboard', d: 'Estado de Resultados, rentabilidad neta y reportes.', i: '📈' },
            ].map((mod, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-hm-accent/50 hover:bg-[#161616] transition-all cursor-default group">
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">{mod.i}</div>
                <h3 className="text-lg font-bold mb-2">{mod.t}</h3>
                <p className="text-sm text-hm-muted">{mod.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-hm-muted">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-hm-accent/20 border border-hm-accent/50 flex items-center justify-center">
              <span className="text-hm-accent text-[8px] font-black">HM</span>
            </div>
            <span>© 2026 HeavyMetric SaaS.</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
