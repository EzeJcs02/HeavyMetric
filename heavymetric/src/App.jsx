import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DolarProvider } from './context/DolarContext'
import { RubroProvider } from './context/RubroContext'
import { Toaster } from 'sonner'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Setup from './pages/auth/Setup'
import ResetPassword from './pages/auth/ResetPassword'
import Leads from './pages/leads/Leads'
import Cotizaciones from './pages/cotizaciones/Cotizaciones'
import Home from './pages/home/Home'
import MiJornada from './pages/jornada/MiJornada'
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
import Repuestos from './pages/repuestos/Repuestos'
import Proveedores from './pages/proveedores/Proveedores'
import Tesoreria from './pages/tesoreria/Tesoreria'
import CEODashboard from './pages/dashboard/CEODashboard'
import Portal from './pages/portal/Portal'
import NotFound from './pages/NotFound'
import Landing from './pages/public/Landing'
import Aprobaciones from './pages/aprobaciones/Aprobaciones'
import Remitos from './pages/remitos/Remitos'
import Placeholder from './components/layout/Placeholder'
import Activo360 from './pages/activos/Activo360'
import AppCampo from './pages/campo/AppCampo'
import OTMobileList from './pages/campo/OTMobileList'
import OTMobileDetail from './pages/campo/OTMobileDetail'
import Integraciones from './pages/integraciones/Integraciones'

const PAGE_TITLES = {
  '/':              'Bienvenido',
  '/app':           'Centro de Operaciones',
  '/app/mi-jornada':    'Mi Jornada',
  '/app/dashboard':     'Dashboard',
  '/app/taller':        'Taller',
  '/app/alquileres':    'Rental',
  '/app/ventas':        'Ventas / Inventario',
  '/app/clientes':      'Clientes',
  '/app/precios':       'Precios',
  '/app/facturacion':   'Facturación',
  '/login':         'Iniciar sesión',
  '/app/usuarios':      'Usuarios',
  '/app/reportes':      'Reportes',
  '/app/leads':         'Leads CRM',
  '/app/cotizaciones':  'Cotizaciones',
  '/setup':         'Configuración inicial',
  '/app/repuestos':     'Repuestos / Stock',
  '/app/proveedores':   'Proveedores',
  '/app/tesoreria':     'Tesorería',
  '/app/ceo':           'CEO Dashboard',
  '/app/configuracion': 'Configuración',
  '/app/perfil':        'Mi Perfil',
  
  // Nuevas rutas refactor
  '/app/activo360':     'Activo 360',
  '/app/postventa':     'Postventa',
  '/app/stock':         'Stock',
  '/app/documentacion': 'Documentación',
  '/app/mantenimiento': 'Mantenimiento',
  '/app/cobranzas':     'Cobranzas',
  '/app/estado-resultados': 'Estado de Resultados',
  '/app/rentabilidad':  'Rentabilidad',
  '/app/riesgos':       'Riesgos',
  '/app/alertas':       'Alertas',
  '/app/ia-silenciosa': 'IA Silenciosa',
  '/app/roles':           'Roles',
  '/app/remitos':         'Remitos',
  '/app/integraciones':   'Integraciones',
}

function TitleUpdater() {
  const location = useLocation()
  useEffect(() => {
    const label = PAGE_TITLES[location.pathname] ?? 'HeavyMetric'
    document.title = `${label} — HeavyMetric`
  }, [location.pathname])
  return null
}

function Guard({ children, soloOwner, soloSupervisor, soloCliente, module }) {
  const { user, perfil, loading, isOwner, canEdit, isCliente, hasModule } = useAuth()
  const location = useLocation()

  if (loading) return <div className="min-h-screen bg-hm-bg flex items-center justify-center text-hm-muted font-mono text-sm">Cargando HeavyMetric...</div>
  if (!user) return <Navigate to="/login" replace />

  if (perfil && !perfil.organization_id && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  // Clientes solo pueden acceder al portal
  if (isCliente && location.pathname !== '/portal') return <Navigate to="/portal" replace />

  if (soloOwner && !isOwner) return <Navigate to="/app" replace />
  if (soloSupervisor && !canEdit) return <Navigate to="/app" replace />
  if (soloCliente && !isCliente) return <Navigate to="/app" replace />

  if (module && !hasModule(module)) return <Navigate to="/app" replace />

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <RubroProvider>
        <DolarProvider>
          <BrowserRouter>
          <TitleUpdater />
          <Toaster richColors position="top-right" theme="dark" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/setup" element={<Guard><Setup /></Guard>} />
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<Guard><Layout /></Guard>}>
              <Route index element={<Home />} />
              <Route path="mi-jornada" element={<Guard><MiJornada /></Guard>} />
              <Route path="dashboard" element={<Guard soloSupervisor><Dashboard /></Guard>} />
              <Route path="leads" element={<Guard soloSupervisor module="crm"><Leads /></Guard>} />
              <Route path="cotizaciones" element={<Guard soloSupervisor module="crm"><Cotizaciones /></Guard>} />
              <Route path="taller" element={<Guard module="taller"><Taller /></Guard>} />
              <Route path="alquileres" element={<Guard soloSupervisor module="alquileres"><Alquileres /></Guard>} />
              <Route path="ventas" element={<Guard module="ventas"><Ventas /></Guard>} />
              <Route path="repuestos" element={<Guard soloSupervisor module="inventario"><Repuestos /></Guard>} />
              <Route path="proveedores" element={<Guard soloSupervisor module="tesoreria"><Proveedores /></Guard>} />
              <Route path="ceo" element={<Guard soloOwner><CEODashboard /></Guard>} />
              <Route path="clientes" element={<Guard soloSupervisor><Clientes /></Guard>} />
              <Route path="precios" element={<Guard soloOwner><Precios /></Guard>} />
              <Route path="facturacion" element={<Guard soloSupervisor><Facturacion /></Guard>} />
              <Route path="tesoreria" element={<Guard soloSupervisor module="tesoreria"><Tesoreria /></Guard>} />
              <Route path="usuarios" element={<Guard soloOwner><Usuarios /></Guard>} />
              <Route path="reportes" element={<Guard soloSupervisor><Reportes /></Guard>} />
              <Route path="configuracion" element={<Guard soloOwner><Configuracion /></Guard>} />
              <Route path="perfil" element={<Guard><Perfil /></Guard>} />
              <Route path="aprobaciones" element={<Guard soloSupervisor><Aprobaciones /></Guard>} />
              <Route path="remitos" element={<Guard soloSupervisor><Remitos /></Guard>} />
              
              {/* Activo 360 */}
              <Route path="activo360" element={<Guard soloSupervisor><Activo360 /></Guard>} />
              
              {/* Placeholders Discretos */}
              <Route path="postventa" element={<Guard soloSupervisor><Placeholder title="Postventa y Reclamos" description="Gestión de tickets de postventa, garantías y atención al cliente." /></Guard>} />
              <Route path="stock" element={<Guard soloSupervisor><Placeholder title="Control de Stock" description="Administración avanzada de inventario inmovilizado y rotación." /></Guard>} />
              <Route path="documentacion" element={<Guard soloSupervisor><Placeholder title="Documentación Técnica" description="Repositorio de manuales, seguros y habilitaciones de activos." /></Guard>} />
              <Route path="mantenimiento" element={<Guard soloSupervisor><Placeholder title="Planes de Mantenimiento" description="Configuración de preventivos periódicos por horas/kms." /></Guard>} />
              <Route path="cobranzas" element={<Guard soloSupervisor><Placeholder title="Gestión de Cobranzas" description="Seguimiento de mora, promesas de pago y reclamos financieros." /></Guard>} />
              <Route path="estado-resultados" element={<Guard soloSupervisor><Placeholder title="Estado de Resultados" description="Análisis financiero detallado de ingresos vs egresos operativos." /></Guard>} />
              
              <Route path="rentabilidad" element={<Guard soloOwner><Placeholder title="Análisis de Rentabilidad" description="Métricas de retorno de inversión por activo, cliente o proyecto." isOwnerOnly /></Guard>} />
              <Route path="riesgos" element={<Guard soloOwner><Placeholder title="Matriz de Riesgos" description="Visibilidad de riesgos operativos, comerciales y financieros." isOwnerOnly /></Guard>} />
              <Route path="alertas" element={<Guard soloOwner><Placeholder title="Centro de Alertas" description="Configuración de notificaciones críticas del sistema." isOwnerOnly /></Guard>} />
              <Route path="ia-silenciosa" element={<Guard soloOwner><Placeholder title="Motor de IA Silenciosa" description="Reglas heurísticas y analítica predictiva sobre operaciones." isOwnerOnly /></Guard>} />
              <Route path="roles" element={<Guard soloOwner><Placeholder title="Roles y Permisos" description="Configuración de control de acceso avanzado." isOwnerOnly /></Guard>} />
              <Route path="integraciones" element={<Guard soloOwner><Integraciones /></Guard>} />
            </Route>
            
            {/* FASE I: APP CAMPO / TÉCNICOS */}
            <Route path="/campo" element={<Guard module="campo"><AppCampo /></Guard>}>
              <Route index element={<OTMobileList />} />
              <Route path="ot/:id" element={<OTMobileDetail />} />
            </Route>
            
            <Route path="portal" element={<Guard soloCliente><Portal /></Guard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </DolarProvider>
      </RubroProvider>
    </AuthProvider>
  )
}
