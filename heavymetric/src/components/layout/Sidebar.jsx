import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useRubro } from '../../context/RubroContext'

const Icon = ({ path, path2 }) => (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d={path} />
    {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d={path2} />}
  </svg>
)

const ICONS = {
  '/app':                   <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  '/app/mi-jornada':        <Icon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  '/app/taller':            <Icon path="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
  '/app/aprobaciones':      <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  '/app/postventa':         <Icon path="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />,
  '/app/activo360':         <Icon path="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
  '/app/repuestos':         <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
  '/app/stock':             <Icon path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  '/app/documentacion':     <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  '/app/mantenimiento':     <Icon path="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  '/app/leads':             <Icon path="M13 10V3L4 14h7v7l9-11h-7z" />,
  '/app/clientes':          <Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  '/app/cotizaciones':      <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
  '/app/ventas':            <Icon path="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />,
  '/app/alquileres':        <Icon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  '/app/tesoreria':         <Icon path="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
  '/app/facturacion':       <Icon path="M9 14l6-6m-4 0h4v4M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  '/app/cobranzas':         <Icon path="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />,
  '/app/proveedores':       <Icon path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  '/app/estado-resultados': <Icon path="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  '/app/ceo':               <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  '/app/rentabilidad':      <Icon path="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
  '/app/riesgos':           <Icon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
  '/app/alertas':           <Icon path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  '/app/ia-silenciosa':     <Icon path="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  '/app/usuarios':          <Icon path="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
  '/app/configuracion':     <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" path2="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  '/app/roles':             <Icon path="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
  '/app/integraciones':     <Icon path="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
}

const FallbackLogo = () => (
  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-300/15 bg-[#07090d]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,245,160,0.16),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(37,99,235,0.18),transparent_40%)]" />
    <span className="relative bg-gradient-to-br from-zinc-100 via-zinc-400 to-zinc-700 bg-clip-text font-mono text-xl font-black text-transparent">
      ∞
    </span>
  </div>
)

export default function Sidebar({ onNavigate }) {
  const { isOwner, canEdit, perfil, hasModule, user } = useAuth()
  const { taxonomia } = useRubro()

  const logoUrl = perfil?.organizaciones?.logo_url
  const orgNombre = perfil?.organizaciones?.nombre_comercial || 'HeavyMetric'
  const displayUser = perfil?.nombre_completo || user?.email || ''

  const groups = [
    {
      label: null,
      items: [
        { to: '/app', label: 'Centro de Operaciones' },
      ],
    },
    {
      label: 'Operación',
      items: [
        { to: '/app/mi-jornada', label: 'Mi Jornada' },
        hasModule('taller') ? { to: '/app/taller', label: `${taxonomia.taller} / OTs` } : null,
        (canEdit && hasModule('taller')) ? { to: '/app/aprobaciones', label: 'Workflow' } : null,
        { to: '/app/postventa', label: 'Postventa', prep: true },
      ].filter(Boolean),
    },
    {
      label: 'Activos y Stock',
      items: [
        { to: '/app/activo360', label: `${taxonomia.activoSingular} 360` },
        hasModule('inventario') ? { to: '/app/repuestos', label: 'Repuestos' } : null,
        hasModule('inventario') ? { to: '/app/stock', label: 'Stock', prep: true } : null,
        { to: '/app/documentacion', label: 'Documentación', prep: true },
        { to: '/app/mantenimiento', label: 'Mantenimiento', prep: true },
      ].filter(Boolean),
    },
    {
      label: 'Comercial',
      hide: !canEdit,
      items: [
        hasModule('crm') ? { to: '/app/leads', label: 'Leads CRM' } : null,
        { to: '/app/clientes', label: 'Clientes' },
        hasModule('crm') ? { to: '/app/cotizaciones', label: 'Cotizaciones' } : null,
        hasModule('ventas') ? { to: '/app/ventas', label: 'Ventas / Inventario' } : null,
        hasModule('alquileres') ? { to: '/app/alquileres', label: 'Rental' } : null,
      ].filter(Boolean),
    },
    {
      label: 'Finanzas',
      hide: !canEdit,
      items: [
        hasModule('tesoreria') ? { to: '/app/tesoreria', label: 'Tesorería' } : null,
        { to: '/app/facturacion', label: 'Facturación' },
        { to: '/app/cobranzas', label: 'Cobranzas', prep: true },
        hasModule('tesoreria') ? { to: '/app/proveedores', label: 'Proveedores' } : null,
        { to: '/app/estado-resultados', label: 'Estado de Resultados', prep: true },
      ].filter(Boolean),
    },
    {
      label: 'Inteligencia',
      hide: !isOwner,
      items: [
        { to: '/app/ceo', label: 'CEO Dashboard' },
        { to: '/app/rentabilidad', label: 'Rentabilidad', prep: true },
        { to: '/app/riesgos', label: 'Riesgos', prep: true },
        { to: '/app/alertas', label: 'Alertas', prep: true },
        { to: '/app/ia-silenciosa', label: 'IA Silenciosa', prep: true },
      ].filter(Boolean),
    },
    {
      label: 'Sistema',
      hide: !isOwner,
      items: [
        { to: '/app/usuarios', label: 'Usuarios' },
        { to: '/app/configuracion', label: 'Configuración' },
        { to: '/app/integraciones', label: 'Integraciones' },
        { to: '/app/roles', label: 'Roles', prep: true },
      ].filter(Boolean),
    },
  ]

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-white/5 bg-[#07090d] text-neutral-300">
      {/* Ambient glow top-left */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(0,212,255,0.07),transparent_30%)]" />

      {/* Header: org logo + name + live badge */}
      <div className="relative z-10 border-b border-white/5 bg-[#07090d]/90 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-9 w-9 shrink-0 rounded-xl border border-white/10 object-cover" />
          ) : (
            <FallbackLogo />
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black leading-none tracking-tight text-white">
              {orgNombre}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)]" />
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-500/80">
                Live System
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
        <div className="flex flex-col gap-5">
          {groups
            .filter((g) => !g.hide && g.items.length > 0)
            .map((group, idx) => (
              <div key={`${group.label || 'root'}-${idx}`} className="space-y-0.5">
                {group.label && (
                  <div className="px-2 pb-1.5 pt-0.5 font-mono text-[9px] uppercase tracking-[0.24em] text-neutral-700">
                    {group.label}
                  </div>
                )}

                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/app'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group relative flex items-center justify-between overflow-hidden rounded-xl px-2.5 py-2 text-sm transition-all duration-150 ${
                        isActive
                          ? 'border border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-200'
                          : 'border border-transparent text-neutral-500 hover:border-white/[0.06] hover:bg-white/[0.03] hover:text-neutral-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active left bar */}
                        <span
                          className={`absolute left-0 top-1/2 h-4 w-px -translate-y-1/2 rounded-full transition-all duration-150 ${
                            isActive ? 'bg-cyan-300 opacity-100' : 'opacity-0'
                          }`}
                        />

                        {/* Icon + label */}
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                              isActive
                                ? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-300'
                                : item.prep
                                ? 'border-white/[0.04] bg-black/10 text-neutral-700 group-hover:text-neutral-500'
                                : 'border-white/[0.06] bg-black/20 text-neutral-600 group-hover:text-neutral-300'
                            }`}
                          >
                            {ICONS[item.to] || <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                          </span>

                          <span className={`truncate ${item.prep ? 'opacity-50' : ''}`}>
                            {item.label}
                          </span>
                        </span>

                        {/* Prep badge */}
                        {item.prep && (
                          <span className="ml-1 shrink-0 rounded border border-white/[0.07] bg-white/[0.03] px-1.5 py-px font-mono text-[8px] uppercase tracking-wider text-neutral-700 opacity-0 transition-opacity group-hover:opacity-100">
                            Prep
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
        </div>
      </nav>

      {/* Footer workspace */}
      <div className="relative z-10 border-t border-white/5 bg-[#07090d]/90 p-3">
        <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.20em] text-neutral-700">
            Workspace
          </div>
          <div className="mt-1 truncate text-xs font-semibold text-neutral-400">
            {displayUser}
          </div>
        </div>
      </div>
    </aside>
  )
}
