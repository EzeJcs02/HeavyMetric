import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DolarProvider } from './context/DolarContext'
import { Toaster } from 'sonner'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Setup from './pages/auth/Setup'
import ResetPassword from './pages/auth/ResetPassword'
import Leads from './pages/leads/Leads'
import Cotizaciones from './pages/cotizaciones/Cotizaciones'
import Home from './pages/home/Home'
import Dashboard from './pages/dashboard/Dashboard'
import Taller from './pages/taller/Taller'
import Alquileres from './pages/alquileres/Alquileres'
import Ventas from './pages/ventas/Ventas'
import Precios from './pages/precios/Precios'
import Facturacion from './pages/facturacion/Facturacion'
import Clientes from './pages/clientes/Clientes'
import Usuarios from './pages/usuarios/Usuarios'
import Reportes from './pages/reportes/Reportes'
import Configuracion from './pages/configuracion/Configuracion'
import Perfil from './pages/perfil/Perfil'
import Portal from './pages/portal/Portal'
import NotFound from './pages/NotFound'

const PAGE_TITLES = {
  '/':              'Inicio',
  '/dashboard':     'Dashboard',
  '/taller':        'Taller',
  '/alquileres':    'Alquileres',
  '/ventas':        'Inventario',
  '/clientes':      'Clientes',
  '/precios':       'Precios',
  '/facturacion':   'Facturación',
  '/login':         'Iniciar sesión',
  '/usuarios':      'Usuarios',
  '/reportes':      'Reportes',
  '/leads':         'Leads CRM',
  '/cotizaciones':  'Cotizaciones',
  '/setup':         'Configuración inicial',
  '/configuracion': 'Configuración',
  '/perfil':        'Mi Perfil',
}

function TitleUpdater() {
  const location = useLocation()
  useEffect(() => {
    const label = PAGE_TITLES[location.pathname] ?? 'HeavyMetric'
    document.title = `${label} — HeavyMetric`
  }, [location.pathname])
  return null
}

function Guard({ children, soloOwner, soloSupervisor, soloCliente }) {
  const { user, perfil, loading, isOwner, canEdit, isCliente } = useAuth()
  const location = useLocation()

  if (loading) return <div className="min-h-screen bg-hm-bg flex items-center justify-center text-hm-muted font-mono text-sm">Cargando HeavyMetric...</div>
  if (!user) return <Navigate to="/login" replace />

  if (perfil && !perfil.organization_id && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  // Clientes solo pueden acceder al portal
  if (isCliente && location.pathname !== '/portal') return <Navigate to="/portal" replace />

  if (soloOwner && !isOwner) return <Navigate to="/" replace />
  if (soloSupervisor && !canEdit) return <Navigate to="/" replace />
  if (soloCliente && !isCliente) return <Navigate to="/" replace />

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <DolarProvider>
        <BrowserRouter>
          <TitleUpdater />
          <Toaster richColors position="top-right" theme="dark" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/setup" element={<Guard><Setup /></Guard>} />
            <Route path="/" element={<Guard><Layout /></Guard>}>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Guard soloSupervisor><Dashboard /></Guard>} />
              <Route path="leads" element={<Guard soloSupervisor><Leads /></Guard>} />
              <Route path="cotizaciones" element={<Guard soloSupervisor><Cotizaciones /></Guard>} />
              <Route path="taller" element={<Taller />} />
              <Route path="alquileres" element={<Guard soloSupervisor><Alquileres /></Guard>} />
              <Route path="ventas" element={<Ventas />} />
              <Route path="clientes" element={<Guard soloSupervisor><Clientes /></Guard>} />
              <Route path="precios" element={<Guard soloOwner><Precios /></Guard>} />
              <Route path="facturacion" element={<Guard soloSupervisor><Facturacion /></Guard>} />
              <Route path="usuarios" element={<Guard soloOwner><Usuarios /></Guard>} />
              <Route path="reportes" element={<Guard soloSupervisor><Reportes /></Guard>} />
              <Route path="configuracion" element={<Guard soloOwner><Configuracion /></Guard>} />
              <Route path="perfil" element={<Guard><Perfil /></Guard>} />
            </Route>
            <Route path="portal" element={<Guard soloCliente><Portal /></Guard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DolarProvider>
    </AuthProvider>
  )
}
