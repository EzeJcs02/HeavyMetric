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
  '/app': <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
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
  const { isOwner, canEdit, perfil } = useAuth()
  const { taxonomia } = useRubro()

  const logoUrl = perfil?.organizaciones?.logo_url
  const orgNombre = perfil?.organizaciones?.nombre_comercial || 'HeavyMetric'

  const groups = [
    {
      label: null,
      items: [{ to: '/app', label: 'Centro de Operaciones', important: true }],
    },
    {
      label: 'Operación',
      items: [
        { to: '/app/mi-jornada', label: 'Mi Jornada' },
        { to: '/app/taller', label: `${taxonomia.taller} / OTs` },
        { to: '/app/aprobaciones', label: 'Workflow' },
      ],
    },
    {
      label: 'Activos',
      items: [
        { to: '/app/activo360', label: `${taxonomia.activoSingular} 360` },
        { to: '/app/repuestos', label: 'Repuestos' },
        { to: '/app/stock', label: 'Stock' },
      ],
    },
    {
      label: 'Comercial',
      hide: !canEdit,
      items: [
        { to: '/app/clientes', label: 'Clientes' },
        { to: '/app/cotizaciones', label: 'Cotizaciones' },
        { to: '/app/ventas', label: 'Ventas' },
      ],
    },
    {
      label: 'Finanzas',
      hide: !canEdit,
      items: [
        { to: '/app/tesoreria', label: 'Tesorería' },
        { to: '/app/proveedores', label: 'Proveedores' },
      ],
    },
    {
      label: 'Inteligencia',
      hide: !isOwner,
      items: [
        { to: '/app/ceo', label: 'CEO Dashboard' },
        { to: '/app/ia-silenciosa', label: 'IA Silenciosa' },
      ],
    },
  ]

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-white/5 bg-[#07090d] text-neutral-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(0,212,255,0.08),transparent_28%)]" />

      <div className="relative z-10 border-b border-white/5 bg-[#07090d]/90 px-5 py-5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-9 w-9 shrink-0 rounded-xl border border-white/10 object-cover"
            />
          ) : (
            <FallbackLogo />
          )}

          <div className="min-w-0">
            <div className="truncate text-sm font-black leading-none tracking-tight text-white">
              {orgNombre}
            </div>

            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-neutral-600">
              Industrial OS · v2.5
            </div>
          </div>
        </div>
      </div>

      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-5">
          {groups
            .filter((group) => !group.hide && group.items.length > 0)
            .map((group, index) => (
              <div key={`${group.label || 'main'}-${index}`} className="space-y-1">
                {group.label && (
                  <div className="px-3 pb-1 font-mono text-[9px] uppercase tracking-[0.24em] text-neutral-700">
                    {group.label}
                  </div>
                )}

                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/app'}
                      onClick={onNavigate}
                      className={({ isActive }) => `
                        group relative flex items-center justify-between overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all duration-200
                        ${
                          isActive
                            ? 'border border-cyan-300/20 bg-cyan-300/10 text-cyan-200'
                            : 'border border-transparent text-neutral-500 hover:border-white/5 hover:bg-white/[0.035] hover:text-neutral-200'
                        }
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`absolute left-0 top-1/2 h-5 w-px -translate-y-1/2 rounded-full transition-opacity ${
                              isActive ? 'bg-cyan-300 opacity-100' : 'bg-transparent opacity-0'
                            }`}
                          />

                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                                isActive
                                  ? 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200'
                                  : 'border-white/5 bg-black/20 text-neutral-600 group-hover:text-neutral-300'
                              }`}
                            >
                              {ICONS[item.to] || <div className="h-2 w-2 rounded-full bg-current" />}
                            </span>

                            <span className="truncate">{item.label}</span>
                          </span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </nav>

      <div className="relative z-10 border-t border-white/5 bg-[#07090d]/90 p-4">
        <div className="rounded-2xl border border-white/5 bg-black/25 p-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.20em] text-neutral-600">
            Workspace
          </div>

          <div className="mt-1 truncate text-xs font-semibold text-neutral-300">
            {perfil?.email || 'admin@knock.com'}
          </div>
        </div>
      </div>
    </aside>
  )
}
