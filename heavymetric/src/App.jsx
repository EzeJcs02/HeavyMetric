import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DolarProvider } from './context/DolarContext'
import { RubroProvider } from './context/RubroContext'
import { Toaster } from 'sonner'
import Layout from './components/layout/Layout'
import Placeholder from './components/layout/Placeholder'

const Login = lazy(() => import('./pages/auth/Login'))
const Setup = lazy(() => import('./pages/auth/Setup'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const Landing = lazy(() => import('./pages/public/Landing'))
const Home = lazy(() => import('./pages/home/Home'))
const MiJornada = lazy(() => import('./pages/jornada/MiJornada'))
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const Leads = lazy(() => import('./pages/leads/Leads'))
const Cotizaciones = lazy(() => import('./pages/cotizaciones/Cotizaciones'))
const Taller = lazy(() => import('./pages/taller/Taller'))
const Alquileres = lazy(() => import('./pages/alquileres/Alquileres'))
const Ventas = lazy(() => import('./pages/ventas/Ventas'))
const Repuestos = lazy(() => import('./pages/repuestos/Repuestos'))
const Proveedores = lazy(() => import('./pages/proveedores/Proveedores'))
const CEODashboard = lazy(() => import('./pages/dashboard/CEODashboard'))
const Clientes = lazy(() => import('./pages/clientes/Clientes'))
const Precios = lazy(() => import('./pages/precios/Precios'))
const Facturacion = lazy(() => import('./pages/facturacion/Facturacion'))
const Tesoreria = lazy(() => import('./pages/tesoreria/Tesoreria'))
const Usuarios = lazy(() => import('./pages/usuarios/Usuarios'))
const Reportes = lazy(() => import('./pages/reportes/Reportes'))
const Configuracion = lazy(() => import('./pages/configuracion/Configuracion'))
const Perfil = lazy(() => import('./pages/perfil/Perfil'))
const Aprobaciones = lazy(() => import('./pages/aprobaciones/Aprobaciones'))
const Remitos = lazy(() => import('./pages/remitos/Remitos'))
const Activo360 = lazy(() => import('./pages/activos/Activo360'))
const AppCampo = lazy(() => import('./pages/campo/AppCampo'))
const OTMobileList = lazy(() => import('./pages/campo/OTMobileList'))
const OTMobileDetail = lazy(() => import('./pages/campo/OTMobileDetail'))
const Integraciones = lazy(() => import('./pages/integraciones/Integraciones'))
const Portal = lazy(() => import('./pages/portal/Portal'))
const NotFound = lazy(() => import('./pages/NotFound'))

const PAGE_TITLES = {
  '/': 'Bienvenido',
  '/app': 'Inicio',
  '/app/mi-jornada': 'Mi Jornada',
  '/app/dashboard': 'Panel operativo',
  '/app/taller': 'Taller y Servicio',
  '/app/alquileres': 'Rental',
  '/app/ventas': 'Ventas',
  '/app/clientes': 'Clientes',
  '/app/precios': 'Precios',
  '/app/facturacion': 'Documentos y Cobranzas',
  '/login': 'Iniciar sesión',
  '/app/usuarios': 'Usuarios y accesos',
  '/app/reportes': 'Reportes',
  '/app/leads': 'CRM',
  '/app/cotizaciones': 'Cotizaciones',
  '/setup': 'Configuración inicial',
  '/app/repuestos': 'Inventario',
  '/app/proveedores': 'Gestión de Proveedores',
  '/app/tesoreria': 'Tesorería',
  '/app/ceo': 'Gerencia',
  '/app/configuracion': 'Configuración',
  '/app/perfil': 'Mi Perfil',
  '/app/activo360': 'Activos',
  '/app/activos': 'Activos',
  '/app/postventa': 'Postventa',
  '/app/stock': 'Inventario',
  '/app/documentacion': 'Documentación',
  '/app/mantenimiento': 'Planes de mantenimiento',
  '/app/cobranzas': 'Cobranzas',
  '/app/estado-resultados': 'Estado de Resultados',
  '/app/rentabilidad': 'Rentabilidad',
  '/app/riesgos': 'Riesgos',
  '/app/alertas': 'Alertas',
  '/app/ia-silenciosa': 'Automatización operativa',
  '/app/roles': 'Roles y permisos',
  '/app/remitos': 'Remitos',
  '/app/integraciones': 'Integraciones',
}

function AppLoader() {
  return (
    <div className="min-h-screen bg-hm-bg flex items-center justify-center text-hm-muted font-mono text-sm">
      Cargando módulo...
    </div>
  )
}

function TitleUpdater() {
  const location = useLocation()

  useEffect(() => {
    const label = PAGE_TITLES[location.pathname] ?? 'HeavyMetric'
    document.title = `${label} — HeavyMetric`
  }, [location.pathname])

  return null
}

function Guard({ children, soloOwner, soloSupervisor, soloCliente, module, permission }) {
  const {
    user,
    perfil,
    loading,
    isOwner,
    canEdit,
    isCliente,
    hasModule,
    can,
  } = useAuth()

  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-hm-bg flex items-center justify-center text-hm-muted font-mono text-sm">
        Cargando HeavyMetric...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (perfil && !perfil.organization_id && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  if (isCliente && location.pathname !== '/portal') {
    return <Navigate to="/portal" replace />
  }

  if (soloOwner && !isOwner) return <Navigate to="/app" replace />
  if (soloSupervisor && !canEdit && !isOwner) return <Navigate to="/app" replace />
  if (soloCliente && !isCliente) return <Navigate to="/app" replace />

  if (module && !isOwner && !hasModule(module)) return <Navigate to="/app" replace />
  if (permission && !can(permission)) return <Navigate to="/app" replace />

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

            <Suspense fallback={<AppLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/setup" element={<Guard><Setup /></Guard>} />
                <Route path="/" element={<Landing />} />

                <Route path="/app" element={<Guard><Layout /></Guard>}>
                  <Route index element={<Guard permission="home.view"><Home /></Guard>} />
                  <Route path="mi-jornada" element={<Guard permission="mi_jornada.view"><MiJornada /></Guard>} />
                  <Route path="dashboard" element={<Guard soloSupervisor permission="dashboard.view"><Dashboard /></Guard>} />
                  <Route path="leads" element={<Guard soloSupervisor module="crm" permission="crm.view"><Leads /></Guard>} />
                  <Route path="cotizaciones" element={<Guard soloSupervisor module="crm" permission="cotizaciones.view"><Cotizaciones /></Guard>} />
                  <Route path="taller" element={<Guard module="taller" permission="taller.view"><Taller /></Guard>} />
                  <Route path="alquileres" element={<Guard soloSupervisor module="alquileres"><Alquileres /></Guard>} />
                  <Route path="ventas" element={<Guard soloSupervisor module="ventas" permission="ventas.view"><Ventas /></Guard>} />
                  <Route path="repuestos" element={<Guard soloSupervisor module="inventario" permission="inventario.view"><Repuestos /></Guard>} />
                  <Route path="proveedores" element={<Guard soloSupervisor module="tesoreria" permission="proveedores.view"><Proveedores /></Guard>} />
                  <Route path="ceo" element={<Guard soloOwner><CEODashboard /></Guard>} />
                  <Route path="clientes" element={<Guard soloSupervisor permission="clientes.view"><Clientes /></Guard>} />
                  <Route path="precios" element={<Guard soloOwner><Precios /></Guard>} />
                  <Route path="facturacion" element={<Guard soloSupervisor permission="facturacion.view"><Facturacion /></Guard>} />
                  <Route path="tesoreria" element={<Guard soloSupervisor module="tesoreria" permission="tesoreria.view"><Tesoreria /></Guard>} />
                  <Route path="usuarios" element={<Guard soloOwner><Usuarios /></Guard>} />
                  <Route path="reportes" element={<Guard soloSupervisor permission="reportes.view"><Reportes /></Guard>} />
                  <Route path="configuracion" element={<Guard soloOwner><Configuracion /></Guard>} />
                  <Route path="perfil" element={<Guard><Perfil /></Guard>} />
                  <Route path="aprobaciones" element={<Guard soloSupervisor permission="aprobaciones.view"><Aprobaciones /></Guard>} />
                  <Route path="remitos" element={<Guard soloSupervisor permission="remitos.view"><Remitos /></Guard>} />

                  <Route path="activo360" element={<Guard soloSupervisor permission="activo.view"><Activo360 /></Guard>} />
                  <Route path="activos" element={<Navigate to="/app/activo360" replace />} />

                  <Route
                    path="postventa"
                    element={
                      <Guard soloSupervisor permission="postventa.view">
                        <Placeholder
                          title="Postventa"
                          description="Seguimiento de servicios, garantías, oportunidades y atención posterior a la venta."
                        />
                      </Guard>
                    }
                  />

                  <Route
                    path="stock"
                    element={
                      <Guard soloSupervisor>
                        <Placeholder
                          title="Inventario"
                          description="Control avanzado de stock, rotación, mínimos, reservas y reposición."
                        />
                      </Guard>
                    }
                  />

                  <Route
                    path="documentacion"
                    element={
                      <Guard soloSupervisor>
                        <Placeholder
                          title="Documentación"
                          description="Repositorio de documentos operativos, técnicos, comerciales y administrativos."
                        />
                      </Guard>
                    }
                  />

                  <Route
                    path="mantenimiento"
                    element={
                      <Guard soloSupervisor>
                        <Placeholder
                          title="Planes de mantenimiento"
                          description="Configuración de servicios preventivos por horas, kilómetros o tiempo."
                        />
                      </Guard>
                    }
                  />

                  <Route
                    path="cobranzas"
                    element={
                      <Guard soloSupervisor>
                        <Placeholder
                          title="Cobranzas"
                          description="Seguimiento de mora, promesas de pago y reclamos financieros."
                        />
                      </Guard>
                    }
                  />

                  <Route
                    path="estado-resultados"
                    element={
                      <Guard soloSupervisor>
                        <Placeholder
                          title="Estado de Resultados"
                          description="Análisis financiero detallado de ingresos, egresos y resultado operativo."
                        />
                      </Guard>
                    }
                  />

                  <Route
                    path="rentabilidad"
                    element={
                      <Guard soloOwner>
                        <Placeholder
                          title="Rentabilidad"
                          description="Métricas de retorno por activo, cliente, trabajo, venta o proyecto."
                          isOwnerOnly
                        />
                      </Guard>
                    }
                  />

                  <Route
                    path="riesgos"
                    element={
                      <Guard soloOwner>
                        <Placeholder
                          title="Riesgos"
                          description="Visibilidad de riesgos operativos, comerciales y financieros."
                          isOwnerOnly
                        />
                      </Guard>
                    }
                  />

                  <Route
                    path="alertas"
                    element={
                      <Guard soloOwner>
                        <Placeholder
                          title="Alertas"
                          description="Configuración de eventos críticos, notificaciones y reglas preventivas."
                          isOwnerOnly
                        />
                      </Guard>
                    }
                  />

                  <Route
                    path="ia-silenciosa"
                    element={
                      <Guard soloOwner>
                        <Placeholder
                          title="Automatización operativa"
                          description="Reglas inteligentes, alertas y análisis preventivo sobre la operación."
                          isOwnerOnly
                        />
                      </Guard>
                    }
                  />

                  <Route
                    path="roles"
                    element={
                      <Guard soloOwner>
                        <Placeholder
                          title="Roles y permisos"
                          description="Configuración jerárquica de accesos, perfiles y autorizaciones."
                          isOwnerOnly
                        />
                      </Guard>
                    }
                  />

                  <Route path="integraciones" element={<Guard soloOwner><Integraciones /></Guard>} />
                </Route>

                <Route path="/campo" element={<Guard module="campo" permission="campo.view"><AppCampo /></Guard>}>
                  <Route index element={<OTMobileList />} />
                  <Route path="ot/:id" element={<OTMobileDetail />} />
                </Route>

                <Route path="portal" element={<Guard soloCliente permission="portal.view"><Portal /></Guard>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </DolarProvider>
      </RubroProvider>
    </AuthProvider>
  )
}
