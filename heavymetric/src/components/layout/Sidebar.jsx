import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Icon = ({ path, path2 }) => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path} />
    {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path2} />}
  </svg>
)

const ICONS = {
  '/':              <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  '/mi-jornada':    <Icon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  '/dashboard':     <Icon path="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />,
  '/leads':         <Icon path="M13 10V3L4 14h7v7l9-11h-7z" />,
  '/cotizaciones':  <Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
  '/taller':        <Icon path="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
  '/alquileres':    <Icon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  '/ventas':        <Icon path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  '/clientes':      <Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  '/precios':       <Icon path="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />,
  '/facturacion':   <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  '/usuarios':      <Icon path="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
  '/reportes':      <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  '/repuestos':     <Icon path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  '/proveedores':   <Icon path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  '/tesoreria':     <Icon path="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
  '/ceo':           <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  '/perfil':        <Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  '/configuracion': <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" path2="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
}

export default function Sidebar({ onNavigate }) {
  const { isOwner, canEdit, perfil } = useAuth()
  const logoUrl = perfil?.organizaciones?.logo_url
  const orgNombre = perfil?.organizaciones?.nombre_comercial || 'HeavyMetric'

  const GROUPS = [
    {
      label: null, // Sin label para Home
      items: [
        { to: '/app', label: 'Centro de Operaciones' },
      ]
    },
    {
      label: 'Operaciones',
      items: [
        { to: '/app/taller', label: 'Taller / OTs' },
        ...(canEdit ? [{ to: '/app/alquileres', label: 'Alquileres' }] : []),
      ]
    },
    {
      label: 'Comercial',
      hide: !canEdit,
      items: [
        { to: '/app/leads', label: 'Leads CRM' },
        { to: '/app/clientes', label: 'Clientes' },
        { to: '/app/cotizaciones', label: 'Cotizaciones' },
      ]
    },
    {
      label: 'Supply',
      hide: !canEdit,
      items: [
        { to: '/app/ventas', label: 'Inventario' },
        { to: '/app/repuestos', label: 'Repuestos' },
        { to: '/app/proveedores', label: 'Proveedores' },
      ]
    },
    {
      label: 'Administración',
      hide: !canEdit,
      items: [
        { to: '/app/facturacion', label: 'Facturación / Cobros' },
        { to: '/app/tesoreria', label: 'Tesorería PYME' },
        { to: '/app/reportes', label: 'Reportes' },
      ]
    },
    {
      label: 'Gerencia',
      hide: !isOwner,
      items: [
        { to: '/app/ceo', label: 'CEO Dashboard' },
        { to: '/app/precios', label: 'Tarifas / Precios' },
        { to: '/app/usuarios', label: 'Usuarios' },
      ]
    },
    {
      label: 'Usuario',
      items: [
        { to: '/app/mi-jornada', label: 'Mi Jornada' },
        { to: '/app/perfil', label: 'Mi Perfil' },
        ...(isOwner ? [{ to: '/app/configuracion', label: 'Configuración' }] : []),
      ]
    }
  ]

  return (
    <div className="w-56 bg-hm-surface border-r border-hm-border flex flex-col h-screen sticky top-0 overflow-y-auto custom-scrollbar">
      <div className="px-5 py-5 border-b border-hm-border/50 sticky top-0 bg-hm-surface z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-hm-accent/15 border border-hm-accent/30 flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl
              ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover rounded-lg" />
              : <span className="text-hm-accent text-[11px] font-black tracking-tight">HM</span>
            }
          </div>
          <div>
            <div className="text-sm font-bold text-hm-text leading-none truncate max-w-[120px]">{orgNombre}</div>
            <div className="text-[10px] font-mono text-hm-muted mt-0.5">v2.5</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 flex flex-col px-3 py-4 gap-6">
        {GROUPS.filter(g => !g.hide).map((group, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            {group.label && (
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest px-2 mb-1">
                {group.label}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map(m => (
                <NavLink
                  key={m.to}
                  to={m.to}
                  end={m.to === '/app'}
                  onClick={onNavigate}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150
                    ${isActive
                      ? 'bg-hm-accent/10 text-hm-accent font-semibold'
                      : 'text-hm-muted font-medium hover:text-hm-text hover:bg-hm-surface2'
                    }
                  `}
                >
                  {ICONS[m.to]}
                  {m.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  )
}
