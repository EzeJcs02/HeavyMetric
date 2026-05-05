import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Icon = ({ path, path2 }) => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path} />
    {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path2} />}
  </svg>
)

const ICONS = {
  '/':            <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  '/dashboard':   <Icon path="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />,
  '/taller':      <Icon path="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
  '/alquileres':  <Icon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  '/ventas':      <Icon path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  '/clientes':    <Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  '/precios':     <Icon path="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />,
  '/facturacion': <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  '/usuarios':    <Icon path="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
  '/reportes':    <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
}

export default function Sidebar({ onNavigate }) {
  const { isOwner, canEdit } = useAuth()

  const modules = [
    { to: '/', label: 'Inicio' },
    ...(canEdit ? [{ to: '/dashboard', label: 'Resumen' }] : []),
    { to: '/taller', label: 'Taller' },
    ...(canEdit ? [{ to: '/alquileres', label: 'Alquileres' }] : []),
    { to: '/ventas', label: 'Inventario' },
    ...(canEdit ? [{ to: '/clientes', label: 'Clientes' }] : []),
    ...(isOwner ? [{ to: '/precios', label: 'Precios' }] : []),
    ...(canEdit ? [{ to: '/facturacion', label: 'Facturación' }] : []),
    ...(canEdit ? [{ to: '/reportes', label: 'Reportes' }] : []),
    ...(isOwner ? [{ to: '/usuarios', label: 'Usuarios' }] : []),
  ]

  return (
    <div className="w-52 bg-hm-surface border-r border-hm-border flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-hm-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-hm-accent flex items-center justify-center shrink-0">
            <span className="text-hm-bg text-[11px] font-black tracking-tight">HM</span>
          </div>
          <div>
            <div className="text-sm font-bold text-hm-text leading-none">HeavyMetric</div>
            <div className="text-[10px] font-mono text-hm-muted mt-0.5">v2.5</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 px-2.5 py-3">
        {modules.map(m => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
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
      </nav>
    </div>
  )
}
