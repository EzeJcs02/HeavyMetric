import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const MODULES = [
  {
    to: '/dashboard',
    label: 'Resumen',
    description: 'KPIs y métricas generales',
    color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    iconColor: 'text-amber-400',
    roles: ['owner', 'supervisor'],
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    to: '/taller',
    label: 'Taller',
    description: 'Órdenes de trabajo',
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    iconColor: 'text-blue-400',
    roles: ['owner', 'supervisor', 'operativo'],
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    to: '/alquileres',
    label: 'Alquileres',
    description: 'Contratos y maquinaria',
    color: 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
    iconColor: 'text-violet-400',
    roles: ['owner', 'supervisor'],
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: '/ventas',
    label: 'Inventario',
    description: 'Stock y movimientos',
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    roles: ['owner', 'supervisor', 'operativo'],
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    to: '/clientes',
    label: 'Clientes',
    description: 'Gestión de clientes',
    color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    roles: ['owner', 'supervisor'],
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/facturacion',
    label: 'Facturación',
    description: 'Facturas y cobros',
    color: 'from-green-500/20 to-green-600/10 border-green-500/30',
    iconColor: 'text-green-400',
    roles: ['owner', 'supervisor'],
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/reportes',
    label: 'Reportes',
    description: 'Análisis y exportes',
    color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    iconColor: 'text-orange-400',
    roles: ['owner', 'supervisor'],
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/precios',
    label: 'Precios',
    description: 'Tarifas y lista de precios',
    color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30',
    iconColor: 'text-rose-400',
    roles: ['owner'],
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    to: '/usuarios',
    label: 'Usuarios',
    description: 'Cuentas y permisos',
    color: 'from-slate-500/20 to-slate-600/10 border-slate-500/30',
    iconColor: 'text-slate-400',
    roles: ['owner'],
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
]

export default function Home() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const rol = perfil?.rol

  const visibles = MODULES.filter(m => m.roles.includes(rol))

  return (
    <div className="min-h-full flex flex-col items-center justify-start px-8 py-12">
      <div className="w-full max-w-4xl">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-hm-text">
            Bienvenido, {perfil?.nombre || 'usuario'}
          </h1>
          <p className="text-sm text-hm-muted mt-1">Seleccioná un módulo para comenzar</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibles.map(m => (
            <button
              key={m.to}
              onClick={() => navigate(m.to)}
              className={`
                flex flex-col items-center gap-3 p-6 rounded-2xl border
                bg-gradient-to-br ${m.color}
                hover:scale-[1.03] hover:shadow-lg hover:shadow-black/30
                active:scale-[0.98] transition-all duration-150 text-center
              `}
            >
              <span className={m.iconColor}>{m.icon}</span>
              <div>
                <div className="text-hm-text font-semibold text-sm">{m.label}</div>
                <div className="text-hm-muted text-xs mt-0.5">{m.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
