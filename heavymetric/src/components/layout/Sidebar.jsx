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
  '/app': <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  '/app/mi-jornada': <Icon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  '/app/taller': <Icon path="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
  '/app/aprobaciones': <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  '/app/postventa': <Icon path="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />,
  '/app/activo360': <Icon path="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
  '/app/repuestos': <Icon path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  '/app/leads': <Icon path="M13 10V3L4 14h7v7l9-11h-7z" />,
  '/app/clientes': <Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  '/app/cotizaciones': <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
  '/app/ventas': <Icon path="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />,
  '/app/alquileres': <Icon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  '/app/tesoreria': <Icon path="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
  '/app/facturacion': <Icon path="M9 14l6-6m-4 0h4v4M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  '/app/proveedores': <Icon path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  '/app/ceo': <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  '/app/alertas': <Icon path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  '/app/usuarios': <Icon path="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
  '/app/configuracion': <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" path2="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  '/app/integraciones': <Icon path="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
}

function NavItem({ to, label, badge, end = false, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
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
  const auth = useAuth()
  const {
    isOwner,
    canEdit,
    perfil,
    hasModule,
    hasPermission,
    can,
    canAccessModule,
    canAccessRoute,
    user,
  } = auth
  const { taxonomia, hasCapability } = useRubro()

  const logoUrl = perfil?.organizaciones?.logo_url
  const orgNombre = perfil?.organizaciones?.nombre_comercial || 'HeavyMetric'
  const displayUser = perfil?.nombre_completo || user?.email || ''

  const activoPlural = taxonomia?.activoPlural || taxonomia?.activoSingular || 'Activos'
  const permiteAlquileres = hasCapability?.('alquileres') === true

  const canDo = (resource, action = 'view') => {
    if (isOwner) return true
    if (typeof can === 'function') return can(resource, action)
    if (typeof hasPermission === 'function') return hasPermission(resource, action)
    return !!canEdit
  }

  const moduleEnabled = (moduleName) => {
    if (isOwner) return true
    if (typeof canAccessModule === 'function') return canAccessModule(moduleName)
    if (typeof hasModule === 'function') return hasModule(moduleName)
    return true
  }

  const routeAllowed = (route) => {
    if (isOwner) return true
    if (typeof canAccessRoute === 'function') return canAccessRoute(route)
    return true
  }

  const show = (route, moduleName, resource = moduleName) => {
    return routeAllowed(route) && moduleEnabled(moduleName) && canDo(resource, 'view')
  }

  const showComercial = show('/app/leads', 'crm', 'leads') || show('/app/clientes', 'crm', 'clientes') || show('/app/cotizaciones', 'crm', 'cotizaciones') || show('/app/ventas', 'ventas', 'ventas')
  const showAdministracion = show('/app/facturacion', 'tesoreria', 'facturacion') || show('/app/tesoreria', 'tesoreria', 'tesoreria') || show('/app/proveedores', 'tesoreria', 'proveedores') || show('/app/aprobaciones', 'tesoreria', 'aprobaciones')
  const showGerencia = show('/app/ceo', 'ceo', 'ceo') || show('/app/alertas', 'alertas', 'alertas')
  const showSistema = show('/app/usuarios', 'usuarios', 'usuarios') || show('/app/configuracion', 'configuracion', 'configuracion') || show('/app/integraciones', 'integraciones', 'integraciones')

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r border-hm-border bg-hm-surface h-screen sticky top-0 overflow-y-auto">
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

      <nav className="flex-1 py-2">
        {routeAllowed('/app') && <NavItem to="/app" label="Inicio" end onClick={onNavigate} />}
        {show('/app/mi-jornada', 'campo', 'jornada') && <NavItem to="/app/mi-jornada" label="Mi Jornada" onClick={onNavigate} />}

        <GroupLabel>Operaciones</GroupLabel>
        {show('/app/activo360', 'activos', 'activos') && <NavItem to="/app/activo360" label={activoPlural} onClick={onNavigate} />}
        {show('/app/taller', 'taller', 'taller') && <NavItem to="/app/taller" label="Taller y Servicio" onClick={onNavigate} />}
        {show('/app/repuestos', 'inventario', 'inventario') && <NavItem to="/app/repuestos" label="Inventario" onClick={onNavigate} />}
        {show('/app/postventa', 'postventa', 'postventa') && <NavItem to="/app/postventa" label="Postventa" badge="Base" onClick={onNavigate} />}
        {show('/app/alquileres', 'alquileres', 'alquileres') && permiteAlquileres && <NavItem to="/app/alquileres" label="Rental" onClick={onNavigate} />}

        {showComercial && (
          <>
            <GroupLabel>Comercial</GroupLabel>
            {show('/app/leads', 'crm', 'leads') && <NavItem to="/app/leads" label="CRM" onClick={onNavigate} />}
            {show('/app/clientes', 'crm', 'clientes') && <NavItem to="/app/clientes" label="Clientes" onClick={onNavigate} />}
            {show('/app/cotizaciones', 'crm', 'cotizaciones') && <NavItem to="/app/cotizaciones" label="Cotizaciones" onClick={onNavigate} />}
            {show('/app/ventas', 'ventas', 'ventas') && <NavItem to="/app/ventas" label="Ventas" onClick={onNavigate} />}
          </>
        )}

        {showAdministracion && (
          <>
            <GroupLabel>Administración</GroupLabel>
            {show('/app/facturacion', 'tesoreria', 'facturacion') && <NavItem to="/app/facturacion" label="Documentos y Cobranzas" onClick={onNavigate} />}
            {show('/app/tesoreria', 'tesoreria', 'tesoreria') && <NavItem to="/app/tesoreria" label="Tesorería" onClick={onNavigate} />}
            {show('/app/proveedores', 'tesoreria', 'proveedores') && <NavItem to="/app/proveedores" label="Proveedores" onClick={onNavigate} />}
            {show('/app/aprobaciones', 'tesoreria', 'aprobaciones') && <NavItem to="/app/aprobaciones" label="Aprobaciones" onClick={onNavigate} />}
          </>
        )}

        {showGerencia && (
          <>
            <GroupLabel>Gerencia</GroupLabel>
            {show('/app/ceo', 'ceo', 'ceo') && <NavItem to="/app/ceo" label="Gerencia" onClick={onNavigate} />}
            {show('/app/alertas', 'alertas', 'alertas') && <NavItem to="/app/alertas" label="Alertas" onClick={onNavigate} />}
          </>
        )}

        {showSistema && (
          <>
            <GroupLabel>Sistema</GroupLabel>
            {show('/app/usuarios', 'usuarios', 'usuarios') && <NavItem to="/app/usuarios" label="Usuarios y accesos" onClick={onNavigate} />}
            {show('/app/configuracion', 'configuracion', 'configuracion') && <NavItem to="/app/configuracion" label="Configuración" onClick={onNavigate} />}
            {show('/app/integraciones', 'integraciones', 'integraciones') && <NavItem to="/app/integraciones" label="Integraciones" onClick={onNavigate} />}
          </>
        )}
      </nav>

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
