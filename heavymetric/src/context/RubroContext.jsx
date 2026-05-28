import { createContext, useContext, useMemo } from 'react'
import { useAuth } from './AuthContext'

const RubroContext = createContext(null)

const baseCapabilities = {
  clientes: true,
  activos: true,
  ot: true,
  stock: true,
  appCampo: true,
  tesoreria: true,
  alquileres: false,
  flotaCliente: true,
  medidorUso: true,
}

const taxonomiasPorRubro = {
  maquinaria: {
    rubroLabel: 'Maquinaria',
    activoSingular: 'Máquina',
    activoPlural: 'Máquinas',
    activoAsociado: 'Máquina asociada',
    flotaCliente: 'Flota del cliente',
    medidor: 'Horómetro',
    medidorUnidad: 'hs',
    taller: 'Taller',
    ordenTrabajo: 'Orden de trabajo',
    tecnico: 'Técnico',
    servicioCampo: 'Servicio a campo',
    repuesto: 'Repuesto',
    capabilities: {
      ...baseCapabilities,
      alquileres: true,
    },
  },

  flota: {
    rubroLabel: 'Flota',
    activoSingular: 'Vehículo',
    activoPlural: 'Vehículos',
    activoAsociado: 'Vehículo asociado',
    flotaCliente: 'Flota del cliente',
    medidor: 'Kilometraje',
    medidorUnidad: 'km',
    taller: 'Taller',
    ordenTrabajo: 'Orden de trabajo',
    tecnico: 'Técnico',
    servicioCampo: 'Asistencia en ruta / campo',
    repuesto: 'Repuesto',
    capabilities: {
      ...baseCapabilities,
    },
  },

  talleres: {
    rubroLabel: 'Taller',
    activoSingular: 'Vehículo',
    activoPlural: 'Vehículos',
    activoAsociado: 'Vehículo intervenido',
    flotaCliente: 'Vehículos del cliente',
    medidor: 'Kilometraje',
    medidorUnidad: 'km',
    taller: 'Taller',
    ordenTrabajo: 'Orden de reparación',
    tecnico: 'Mecánico',
    servicioCampo: 'Servicio externo',
    repuesto: 'Repuesto',
    capabilities: {
      ...baseCapabilities,
      alquileres: false,
    },
  },

  rental: {
    rubroLabel: 'Rental',
    activoSingular: 'Equipo',
    activoPlural: 'Equipos',
    activoAsociado: 'Equipo asociado',
    flotaCliente: 'Equipos vinculados',
    medidor: 'Uso',
    medidorUnidad: 'hs',
    taller: 'Mantenimiento',
    ordenTrabajo: 'Orden de servicio',
    tecnico: 'Técnico',
    servicioCampo: 'Servicio a campo',
    repuesto: 'Repuesto',
    capabilities: {
      ...baseCapabilities,
      alquileres: true,
    },
  },

  agro: {
    rubroLabel: 'Agro',
    activoSingular: 'Unidad',
    activoPlural: 'Unidades',
    activoAsociado: 'Unidad asociada',
    flotaCliente: 'Unidades del cliente',
    medidor: 'Horómetro',
    medidorUnidad: 'hs',
    taller: 'Taller',
    ordenTrabajo: 'Orden de trabajo',
    tecnico: 'Técnico',
    servicioCampo: 'Servicio en campo',
    repuesto: 'Repuesto',
    capabilities: {
      ...baseCapabilities,
    },
  },

  mineria: {
    rubroLabel: 'Minería',
    activoSingular: 'Equipo crítico',
    activoPlural: 'Equipos críticos',
    activoAsociado: 'Equipo crítico asociado',
    flotaCliente: 'Activos críticos del cliente',
    medidor: 'Horómetro',
    medidorUnidad: 'hs',
    taller: 'Taller',
    ordenTrabajo: 'Orden de intervención',
    tecnico: 'Técnico',
    servicioCampo: 'Intervención en sitio',
    repuesto: 'Repuesto crítico',
    capabilities: {
      ...baseCapabilities,
    },
  },

  logistica: {
    rubroLabel: 'Logística',
    activoSingular: 'Unidad',
    activoPlural: 'Flota',
    activoAsociado: 'Unidad asociada',
    flotaCliente: 'Flota del cliente',
    medidor: 'Kilometraje',
    medidorUnidad: 'km',
    taller: 'Taller',
    ordenTrabajo: 'Orden de mantenimiento',
    tecnico: 'Técnico',
    servicioCampo: 'Asistencia operativa',
    repuesto: 'Repuesto',
    capabilities: {
      ...baseCapabilities,
    },
  },

  servicios_tecnicos: {
    rubroLabel: 'Servicios técnicos',
    activoSingular: 'Equipo',
    activoPlural: 'Equipos',
    activoAsociado: 'Equipo intervenido',
    flotaCliente: 'Equipos del cliente',
    medidor: 'Uso',
    medidorUnidad: 'ciclos',
    taller: 'Laboratorio',
    ordenTrabajo: 'Orden de servicio',
    tecnico: 'Técnico',
    servicioCampo: 'Visita técnica',
    repuesto: 'Insumo',
    capabilities: {
      ...baseCapabilities,
      stock: true,
    },
  },
}

export function RubroProvider({ children }) {
  const { rubro } = useAuth()

  const taxonomia = useMemo(() => {
    return taxonomiasPorRubro[rubro] || taxonomiasPorRubro.maquinaria
  }, [rubro])

  const hasCapability = (key) => {
    return Boolean(taxonomia?.capabilities?.[key])
  }

  return (
    <RubroContext.Provider value={{ taxonomia, hasCapability }}>
      {children}
    </RubroContext.Provider>
  )
}

export const useRubro = () => {
  const context = useContext(RubroContext)

  if (!context) {
    throw new Error('useRubro debe ser usado dentro de un RubroProvider')
  }

  return context
}