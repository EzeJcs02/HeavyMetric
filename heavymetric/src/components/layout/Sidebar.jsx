import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useRubro } from '../../context/RubroContext'

const Icon = ({ path, path2 }) => (
  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={path} />
    {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={path2} />}
  </svg>
)

const ICONS = {
  '/app':            <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  '/app/mi-jornada': <Icon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  '/app/taller':     <Icon path="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
  '/app/aprobaciones':<Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  '/app/activo360':  <Icon path="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
  '/app/repuestos':  <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
  '/app/leads':      <Icon path="M13 10V3L4 14h7v7l9-11h-7z" />,
  '/app/clientes':   <Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  '/app/cotizaciones':<Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
  '/app/alquileres': <Icon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  '/app/tesoreria':  <Icon path="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
  '/app/facturacion':<Icon path="M9 14l6-6m-4 0h4v4M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  '/app/ceo':        <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  '/app/alertas':    <Icon path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  '/app/configuracion':<Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" path2="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
}

function NavItem({ to, label, badge, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-1.5 text-[12.5px] font-medium rounded-md mx-2 transition-colors ${
          isActive
            ? 'bg-hm-accent/10 text-hm-accent border-l-2 border-hm-accent rounded-l-none -ml-px pl-[11px]'
            : 'text-hm-muted hover:bg-hm-surface2 hover:text-hm-text border-l-2 border-transparent -ml-px pl-[11px]'
        }`
      }
    >
      {ICONS[to]}
      <span className="truncate">{label}</span>
      {badge && (
        <span className="ml-auto font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded bg-hm-accent/10 text-hm-accent">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

function GroupLabel({ children }) {
  return (
    <div className="px-4 pt-3 pb-1 font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-hm-muted/60">
      {children}
    </div>
  )
}

export default function Sidebar({ onNavigate }) {
  const { isOwner, canEdit, perfil, hasModule, user } = useAuth()
  const { taxonomia } = useRubro()

  const logoUrl = perfil?.organizaciones?.logo_url
  const orgNombre = perfil?.organizaciones?.nombre_comercial || 'HeavyMetric'
  const displayUser = perfil?.nombre_completo || user?.email || ''

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r border-hm-border bg-hm-surface h-screen sticky top-0 overflow-y-auto">

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-hm-border">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-hm-border bg-hm-surface2">
          {logoUrl
            ? <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
            : <span className="font-mono text-[11px] font-bold text-hm-accent">{orgNombre.slice(0, 2).toUpperCase()}</span>
          }
        </div>
        <div>
          <div className="text-[12.5px] font-semibold text-hm-text leading-none truncate">{orgNombre}</div>
          <div className="font-mono text-[8.5px] text-hm-muted mt-0.5">HeavyMetric v2</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        <NavItem to="/app" label="Dashboard" end />
        <NavItem to="/app/mi-jornada" label="Mi Jornada" />

        <GroupLabel>Operación</GroupLabel>
        {hasModule('taller') && <NavItem to="/app/taller" label={`${taxonomia.taller} / OTs`} />}
        {canEdit && hasModule('taller') && <NavItem to="/app/aprobaciones" label="Workflow" />}
        {hasModule('alquileres') && <NavItem to="/app/alquileres" label="Alquileres" />}

        <GroupLabel>Activos y Stock</GroupLabel>
        <NavItem to="/app/activo360" label={`${taxonomia.activoSingular} 360`} />
        {hasModule('inventario') && <NavItem to="/app/repuestos" label="Repuestos" />}

        {canEdit && (
          <>
            <GroupLabel>Comercial</GroupLabel>
            {hasModule('crm') && <NavItem to="/app/leads" label="Leads CRM" />}
            <NavItem to="/app/clientes" label="Clientes" />
            {hasModule('crm') && <NavItem to="/app/cotizaciones" label="Cotizaciones" />}
          </>
        )}

        {canEdit && (
          <>
            <GroupLabel>Finanzas</GroupLabel>
            <NavItem to="/app/tesoreria" label="Tesorería" />
            <NavItem to="/app/facturacion" label="Facturación" />
          </>
        )}

        {isOwner && (
          <>
            <GroupLabel>Gestión</GroupLabel>
            <NavItem to="/app/ceo" label="CEO Dashboard" />
            <NavItem to="/app/alertas" label="Alertas" />
            <NavItem to="/app/configuracion" label="Configuración" />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-hm-border flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-hm-border bg-hm-surface2 font-mono text-[10px] font-bold text-hm-accent">
          {displayUser.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-semibold text-hm-text truncate">{displayUser}</div>
          <div className="font-mono text-[8.5px] text-hm-muted">{perfil?.rol || 'user'}</div>
        </div>
      </div>
    </aside>
  )
}
