import { useLocation } from 'react-router-dom'

export default function Placeholder({ title, description, isOwnerOnly = false }) {
  const location = useLocation()
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{title || 'Módulo en desarrollo'}</h1>
            <span className="text-[10px] font-mono bg-hm-surface2/50 px-1.5 py-0.5 rounded border border-hm-border text-hm-muted uppercase tracking-widest mt-1">BASE PREPARADA</span>
          </div>
          <p className="text-sm text-hm-muted mt-1">{description || 'La arquitectura visual y base de datos para este módulo están siendo implementadas.'}</p>
        </div>
      </div>

      <div>
        <div className="flex flex-col items-center justify-center p-12 text-center bg-hm-surface2/10 border border-hm-border/30 rounded-xl border-dashed">
          <div className="w-16 h-16 rounded-full bg-hm-surface2/30 flex items-center justify-center mb-4 text-hm-muted/50">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-hm-text mb-2">Fundamentos listos</h2>
          <p className="text-sm text-hm-muted max-w-md">
            Este módulo es estratégico para el sistema operativo de la PyME. Las reglas de negocio, los accesos por rol y la base de datos están preparados, la interfaz visual se desplegará próximamente.
          </p>
          <div className="mt-6 font-mono text-xs text-hm-muted/50 bg-hm-surface2/20 px-3 py-1.5 rounded">
            RUTA INTERNA: {location.pathname} {isOwnerOnly && '(Solo Gerencia)'}
          </div>
        </div>
      </div>
    </div>
  )
}
