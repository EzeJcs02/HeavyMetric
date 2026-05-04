import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DolarProvider } from './context/DolarContext'
import { Toaster } from 'sonner'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Setup from './pages/auth/Setup'
import Dashboard from './pages/dashboard/Dashboard'
import Taller from './pages/taller/Taller'
import Alquileres from './pages/alquileres/Alquileres'
import Ventas from './pages/ventas/Ventas'
import Precios from './pages/precios/Precios'
import Facturacion from './pages/facturacion/Facturacion'
import Clientes from './pages/clientes/Clientes'

function Guard({ children, soloOwner, soloSupervisor }) {
  const { user, perfil, loading, isOwner, canEdit } = useAuth()
  const location = useLocation()
  
  if (loading) return <div className="min-h-screen bg-hm-bg flex items-center justify-center text-hm-muted font-mono text-sm">Cargando HeavyMetric...</div>
  if (!user) return <Navigate to="/login" replace />
  
  // Si está logueado pero no tiene organización, y no estamos ya en /setup, redirigir a /setup
  if (perfil && !perfil.organization_id && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  if (soloOwner && !isOwner) return <Navigate to="/" replace />
  if (soloSupervisor && !canEdit) return <Navigate to="/" replace />
  
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <DolarProvider>
        <BrowserRouter>
          <Toaster richColors position="top-right" theme="dark" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Guard><Setup /></Guard>} />
            <Route path="/" element={<Guard><Layout /></Guard>}>
              <Route index element={<Dashboard />} />
              <Route path="taller" element={<Taller />} />
              <Route path="alquileres" element={<Guard soloSupervisor><Alquileres /></Guard>} />
              <Route path="ventas" element={<Ventas />} />
              <Route path="clientes" element={<Guard soloSupervisor><Clientes /></Guard>} />
              <Route path="precios" element={<Guard soloOwner><Precios /></Guard>} />
              <Route path="facturacion" element={<Guard soloSupervisor><Facturacion /></Guard>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DolarProvider>
    </AuthProvider>
  )
}
