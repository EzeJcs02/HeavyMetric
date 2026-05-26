import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'

export default function Landing() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('activos')

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
              <div className="flex border-b border-white/10 bg-[#161616] px-4 gap-1">
                <button 
                  onClick={() => setActiveTab('activos')} 
                  className={`px-4 py-3 text-xs font-bold font-mono transition-all border-b-2 -mb-[1px] flex items-center gap-1.5 ${activeTab === 'activos' ? 'border-hm-accent text-hm-accent' : 'border-transparent text-hm-muted hover:text-white'}`}
                >
                  🚜 Activos
                </button>
                <button 
                  onClick={() => setActiveTab('taller')} 
                  className={`px-4 py-3 text-xs font-bold font-mono transition-all border-b-2 -mb-[1px] flex items-center gap-1.5 ${activeTab === 'taller' ? 'border-hm-accent text-hm-accent' : 'border-transparent text-hm-muted hover:text-white'}`}
                >
                  🔧 Taller
                </button>
                <button 
                  onClick={() => setActiveTab('stock')} 
                  className={`px-4 py-3 text-xs font-bold font-mono transition-all border-b-2 -mb-[1px] flex items-center gap-1.5 ${activeTab === 'stock' ? 'border-hm-accent text-hm-accent' : 'border-transparent text-hm-muted hover:text-white'}`}
                >
                  📦 Stock
                </button>
              </div>

              <div className="relative h-[350px] w-full overflow-hidden bg-black">
                <video 
                  src="https://assets.mixkit.co/videos/7163/7163-720.mp4" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen"
                />
                
                {/* Cyberpunk Grid / Scanline overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_4px,3px_100%] pointer-events-none" />

                {/* CCTV Badges */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-2.5 py-1 rounded bg-black/75 border border-white/10 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[9px] font-mono tracking-wider text-white uppercase font-bold">FEED_CAM04 // ACTIVO</span>
                </div>

                <div className="absolute top-4 right-4 flex items-center gap-2 px-2.5 py-1 rounded bg-black/75 border border-white/10 backdrop-blur-md text-[9px] font-mono text-hm-muted">
                  <span>REC 🟢</span>
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end gap-3 bg-gradient-to-t from-black via-black/40 to-transparent">
                  {activeTab === 'activos' && (
                    <div className="backdrop-blur-md bg-black/60 border border-white/10 p-5 rounded-xl max-w-sm transition-all duration-300 border-l-hm-accent border-l-4">
                      <div className="text-[10px] font-mono text-hm-accent uppercase mb-1 tracking-widest font-black">Telemetría de Activos</div>
                      <h4 className="text-base font-black text-white mb-2">Excavadora Oruga CAT 320D</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono mt-3">
                        <div>
                          <span className="text-hm-muted block text-[10px]">OPERARIO</span>
                          <span className="text-white font-bold">Marcos Benítez</span>
                        </div>
                        <div>
                          <span className="text-hm-muted block text-[10px]">HORÓMETRO</span>
                          <span className="text-white font-bold">3,542.8 hs</span>
                        </div>
                        <div>
                          <span className="text-hm-muted block text-[10px]">PRESIÓN HIDR.</span>
                          <span className="text-green-400 font-bold">210 bar (Normal)</span>
                        </div>
                        <div>
                          <span className="text-hm-muted block text-[10px]">UBICACIÓN</span>
                          <span className="text-white font-bold">Frente 2, Minera</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'taller' && (
                    <div className="backdrop-blur-md bg-black/60 border border-white/10 p-5 rounded-xl max-w-sm transition-all duration-300 border-l-blue-500 border-l-4">
                      <div className="text-[10px] font-mono text-blue-500 uppercase mb-1 tracking-widest font-black">Taller / Postventa</div>
                      <h4 className="text-base font-black text-white mb-2">Orden de Trabajo #4829</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono mt-3">
                        <div>
                          <span className="text-hm-muted block text-[10px]">TIPO</span>
                          <span className="text-white font-bold">Preventivo 250h</span>
                        </div>
                        <div>
                          <span className="text-hm-muted block text-[10px]">ESTADO</span>
                          <span className="text-yellow-500 font-bold">En Proceso</span>
                        </div>
                        <div>
                          <span className="text-hm-muted block text-[10px]">MECÁNICO</span>
                          <span className="text-white font-bold">Gómez, Ariel</span>
                        </div>
                        <div>
                          <span className="text-hm-muted block text-[10px]">PROGRESO</span>
                          <span className="text-white font-bold">75% completado</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'stock' && (
                    <div className="backdrop-blur-md bg-black/60 border border-white/10 p-5 rounded-xl max-w-sm transition-all duration-300 border-l-red-500 border-l-4">
                      <div className="text-[10px] font-mono text-red-500 uppercase mb-1 tracking-widest font-black">Control de Stock</div>
                      <h4 className="text-base font-black text-white mb-2">Repuestos Críticos</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono mt-3">
                        <div>
                          <span className="text-hm-muted block text-[10px]">ARTÍCULO</span>
                          <span className="text-white font-bold">Filtro de Aire CAT</span>
                        </div>
                        <div>
                          <span className="text-hm-muted block text-[10px]">DISPONIBLE</span>
                          <span className="text-red-500 font-bold">0 unids</span>
                        </div>
                        <div>
                          <span className="text-hm-muted block text-[10px]">EN CAMINO</span>
                          <span className="text-white font-bold">12 unids (Vía Aérea)</span>
                        </div>
                        <div>
                          <span className="text-hm-muted block text-[10px]">PROVEEDOR</span>
                          <span className="text-white font-bold">Finning S.A.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
