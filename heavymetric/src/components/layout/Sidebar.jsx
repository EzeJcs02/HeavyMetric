import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Icon = ({ path, path2 }) => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path} />
    {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path2} />}
  </svg>
)

const ICONS = {
  '/':            <Icon path="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />,
  '/taller':      <Icon path="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
  '/alquileres':  <Icon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  '/ventas':      <Icon path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  '/clientes':    <Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  '/precios':     <Icon path="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />,
  '/facturacion': <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
}

export default function Sidebar() {
  const { isOwner, canEdit } = useAuth()

  const modules = [
    { to: '/', label: 'DASHBOARD' },
    { to: '/taller', label: 'TALLER' },
    ...(canEdit ? [{ to: '/alquileres', label: 'ALQUILERES' }] : []),
    { to: '/ventas', label: 'INVENTARIO' },
    ...(canEdit ? [{ to: '/clientes', label: 'CLIENTES' }] : []),
    ...(isOwner ? [{ to: '/precios', label: 'PRECIOS' }] : []),
    ...(canEdit ? [{ to: '/facturacion', label: 'FACTURACIÓN' }] : []),
  ]

  return (
    <div className="w-[210px] bg-hm-surface border-r border-hm-border flex flex-col h-screen sticky top-0">
      <div className="p-6 font-bold tracking-widest text-lg text-hm-text">
        HM<span className="text-hm-accent">.</span>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 px-3 py-2">
        {modules.map(m => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.to === '/'}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded text-xs font-bold tracking-wider transition-all
              ${isActive
                ? 'bg-hm-surface2 text-hm-accent border-l-2 border-hm-accent pl-[10px]'
                : 'text-hm-muted hover:text-hm-text hover:bg-hm-surface2/50 border-l-2 border-transparent pl-[10px]'
              }
            `}
          >
            {ICONS[m.to]}
            {m.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-5 border-t border-hm-border">
        <div className="text-[10px] text-hm-muted font-bold tracking-widest uppercase">
          HEAVYMETRIC v2.5
        </div>
      </div>
    </div>
  )
}
