import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'

export default function Landing() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('activos')
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [demoSubmitted, setDemoSubmitted] = useState(false)
  const [formData, setFormData] = useState({ name: '', company: '', email: '' })
  const [hoveredStat, setHoveredStat] = useState(null)

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
                Plataforma modular para PyMEs industriales, talleres, rental, flotas y empresas de servicios. Centralizá{' '}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-hm-accent/10 text-hm-accent border border-hm-accent/20 cursor-help hover:bg-hm-accent/20 transition-all font-bold" title="Gestión de contactos e historial comercial">clientes</span>,{' '}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-help hover:bg-blue-500/20 transition-all font-bold" title="Maquinarias, vehículos y herramientas">activos</span>,{' '}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 cursor-help hover:bg-yellow-500/20 transition-all font-bold" title="Órdenes de Trabajo y servicios de taller">OTs</span>,{' '}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20 cursor-help hover:bg-red-500/20 transition-all font-bold" title="Control de almacén, stock crítico y repuestos">stock</span>,{' '}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-green-500/10 text-green-400 border border-green-500/20 cursor-help hover:bg-green-500/20 transition-all font-bold" title="Compras, facturas y cuentas a pagar">proveedores</span>,{' '}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 cursor-help hover:bg-purple-500/20 transition-all font-bold" title="Cuentas a cobrar y pasarela de pago">cobranzas</span>,{' '}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 cursor-help hover:bg-indigo-500/20 transition-all font-bold" title="BI y tableros analíticos">BI</span>{' '}
                y{' '}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 cursor-help hover:bg-orange-500/20 transition-all font-bold animate-pulse" title="Notificaciones automáticas ante desvíos operativos">alertas operativas</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link to="/login">
                <button className="h-14 px-8 rounded-lg bg-white text-black font-bold text-lg hover:bg-gray-200 transition-colors shadow-lg">
                  Iniciar sesión
                </button>
              </Link>
              <button 
                onClick={() => { setShowDemoModal(true); setDemoSubmitted(false); }}
                className="h-14 px-8 rounded-lg bg-transparent border border-white/20 text-white font-bold text-lg hover:bg-white/5 hover:border-hm-accent/50 hover:text-hm-accent hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all"
              >
                Solicitar Demo
              </button>
            </div>
            
            <div className="pt-8 border-t border-white/10 flex gap-8 relative">
              <div 
                className="cursor-pointer group relative"
                onMouseEnter={() => setHoveredStat('equipos')}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <div className="text-3xl font-black text-hm-accent mb-1 group-hover:scale-105 transition-transform origin-left">+500</div>
                <div className="text-xs font-mono text-hm-muted uppercase border-b border-dashed border-white/10 group-hover:border-hm-accent/40 transition-colors pb-0.5">Equipos gestionados</div>
                
                {/* Popover Detail */}
                {hoveredStat === 'equipos' && (
                  <div className="absolute top-full left-0 mt-3 p-4 rounded-xl bg-[#161616] border border-white/10 shadow-2xl z-20 w-56 animate-fade-in">
                    <h5 className="text-xs font-bold font-mono text-white mb-2 uppercase tracking-wide">Distribución de Flota</h5>
                    <div className="space-y-1.5 text-xs font-mono text-hm-muted">
                      <div className="flex justify-between"><span>🚜 Viales y Minería</span> <span className="text-white font-bold">58%</span></div>
                      <div className="flex justify-between"><span>🚚 Logística y Camiones</span> <span className="text-white font-bold">27%</span></div>
                      <div className="flex justify-between"><span>🔌 Generadores/Otros</span> <span className="text-white font-bold">15%</span></div>
                    </div>
                  </div>
                )}
              </div>

              <div 
                className="cursor-pointer group relative"
                onMouseEnter={() => setHoveredStat('uptime')}
                onMouseLeave={() => setHoveredStat(null)}
              >
                <div className="text-3xl font-black text-hm-accent mb-1 group-hover:scale-105 transition-transform origin-left">99.8%</div>
                <div className="text-xs font-mono text-hm-muted uppercase border-b border-dashed border-white/10 group-hover:border-hm-accent/40 transition-colors pb-0.5">Uptime Operativo</div>

                {/* Sparkline Popover Detail */}
                {hoveredStat === 'uptime' && (
                  <div className="absolute top-full left-0 mt-3 p-4 rounded-xl bg-[#161616] border border-white/10 shadow-2xl z-20 w-64 animate-fade-in">
                    <h5 className="text-xs font-bold font-mono text-white mb-2 uppercase tracking-wide">Disponibilidad (Últ. 7 días)</h5>
                    <div className="h-10 w-full flex items-end gap-1 mb-2">
                      {[98.5, 99.1, 99.8, 99.4, 99.9, 99.7, 99.8].map((v, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div 
                            className="w-full bg-hm-accent rounded-t" 
                            style={{ height: `${(v - 95) * 8}px` }}
                          />
                          <span className="text-[8px] font-mono text-hm-muted mt-1">{i + 19}m</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] font-mono text-green-400 flex justify-between">
                      <span>SLA Comprometido: 99%</span>
                      <span className="font-bold">Real: 99.84%</span>
                    </div>
                  </div>
                )}
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
              { 
                t: 'Activos y Flota', 
                d: 'Fichas 360, horómetros, disponibilidad y health score.', 
                i: '🚜', 
                skills: ['Fichas 360', 'Horómetros', 'Health Score', 'GPS Link'] 
              },
              { 
                t: 'Taller y Postventa', 
                d: 'Órdenes de Trabajo, mecánicos, checklist y garantías.', 
                i: '🔧', 
                skills: ['Gestión OTs', 'Mecánicos', 'Checklists', 'Garantías'] 
              },
              { 
                t: 'CRM y Comercial', 
                d: 'Leads, cotizaciones dinámicas y facturación automática.', 
                i: '🤝', 
                skills: ['Embudo Ventas', 'Cotizaciones PDF', 'Facturación', 'Contratos'] 
              },
              { 
                t: 'Stock e Inventario', 
                d: 'Mínimos, inmovilizado, rotación e IA silenciosa.', 
                i: '📦', 
                skills: ['Stock Mínimo', 'Almacenes', 'Rotación', 'Predicción IA'] 
              },
              { 
                t: 'Tesorería y Finanzas', 
                d: 'Caja, bancos, cuentas a pagar, mora y E-Cheqs.', 
                i: '💰', 
                skills: ['Cuentas a Pagar', 'Conciliación', 'E-Cheqs', 'Mora Tracker'] 
              },
              { 
                t: 'CEO Dashboard', 
                d: 'Estado de Resultados, rentabilidad neta y reportes.', 
                i: '📈', 
                skills: ['E.R. en Vivo', 'Rentabilidad', 'Reportes BI', 'Alertas CEO'] 
              },
            ].map((mod, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-hm-accent/50 hover:bg-[#161616] transition-all cursor-default group flex flex-col justify-between min-h-[240px]">
                <div>
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">{mod.i}</div>
                  <h3 className="text-lg font-bold mb-2 text-white group-hover:text-hm-accent transition-colors">{mod.t}</h3>
                  <p className="text-sm text-hm-muted mb-4">{mod.d}</p>
                </div>
                
                {/* Feature Tags (Skills) */}
                <div className="flex flex-wrap gap-1.5 pt-4 border-t border-white/5 group-hover:border-hm-accent/20 transition-all">
                  {mod.skills.map((skill, si) => (
                    <span 
                      key={si} 
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 border border-white/5 text-hm-muted group-hover:text-white group-hover:border-white/10 transition-all hover:bg-hm-accent/15 hover:text-hm-accent hover:border-hm-accent/30"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
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

      {/* DEMO MODAL */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md p-8 rounded-2xl bg-[#111] border border-white/10 shadow-2xl">
            <button 
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 text-hm-muted hover:text-white text-xl font-bold font-mono transition-colors"
            >
              ✕
            </button>
            
            {!demoSubmitted ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setDemoSubmitted(true);
                }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h3 className="text-2xl font-black mb-2 text-white">Solicitar Demostración</h3>
                  <p className="text-sm text-hm-muted font-mono">Descubre cómo HeavyMetric puede optimizar tu operación.</p>
                </div>
                
                <div className="flex flex-col gap-4 text-sm font-mono">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-hm-muted text-xs">NOMBRE COMPLETO</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ej. Juan Pérez" 
                      className="bg-black border border-white/10 rounded-lg h-11 px-4 text-white focus:outline-none focus:border-hm-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-hm-muted text-xs">EMPRESA / ORGANIZACIÓN</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.company} 
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      placeholder="Ej. Minera del Norte S.A." 
                      className="bg-black border border-white/10 rounded-lg h-11 px-4 text-white focus:outline-none focus:border-hm-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-hm-muted text-xs">CORREO ELECTRÓNICO</label>
                    <input 
                      type="email" 
                      required 
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="juan@empresa.com" 
                      className="bg-black border border-white/10 rounded-lg h-11 px-4 text-white focus:outline-none focus:border-hm-accent"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="h-12 w-full rounded-lg bg-hm-accent text-black font-bold text-sm tracking-widest hover:bg-white transition-colors"
                >
                  ENVIAR SOLICITUD
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-3xl">✓</div>
                <div>
                  <h4 className="text-xl font-black text-white mb-2">¡Solicitud Recibida!</h4>
                  <p className="text-sm text-hm-muted font-mono max-w-xs mx-auto">
                    Hola {formData.name}, nos pondremos en contacto contigo a {formData.email} en menos de 24 horas hábiles.
                  </p>
                </div>
                <button 
                  onClick={() => setShowDemoModal(false)}
                  className="h-10 px-6 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs hover:bg-white/10 transition-colors mt-4"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
