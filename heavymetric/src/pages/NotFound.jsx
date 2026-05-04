import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-hm-bg flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-hm-border mb-6 select-none">404</div>
        <h1 className="text-2xl font-bold text-hm-text mb-2">Página no encontrada</h1>
        <p className="text-hm-muted text-sm mb-8">
          La ruta que buscás no existe o no tenés permisos para acceder.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-hm-accent text-hm-bg text-sm font-semibold rounded-lg hover:brightness-110 transition-all"
        >
          ← Volver al Dashboard
        </Link>
      </div>
    </div>
  )
}
