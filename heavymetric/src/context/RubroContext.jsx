import { createContext, useContext, useMemo } from 'react'
import { useAuth } from './AuthContext'

const RubroContext = createContext(null)

const taxonomiasPorRubro = {
  maquinaria: {
    activoSingular: 'Máquina',
    activoPlural: 'Máquinas',
    medidor: 'Horómetro',
    medidorUnidad: 'hs',
    taller: 'Taller',
  },
  flota: {
    activoSingular: 'Vehículo',
    activoPlural: 'Vehículos',
    medidor: 'Kilometraje',
    medidorUnidad: 'km',
    taller: 'Taller',
  },
  talleres: {
    activoSingular: 'Vehículo',
    activoPlural: 'Vehículos',
    medidor: 'Kilometraje',
    medidorUnidad: 'km',
    taller: 'Taller',
  },
  rental: {
    activoSingular: 'Equipo',
    activoPlural: 'Equipos',
    medidor: 'Uso',
    medidorUnidad: 'hs',
    taller: 'Mantenimiento',
  },
  agro: {
    activoSingular: 'Unidad',
    activoPlural: 'Unidades',
    medidor: 'Horómetro',
    medidorUnidad: 'hs',
    taller: 'Taller',
  },
  mineria: {
    activoSingular: 'Equipo',
    activoPlural: 'Equipos',
    medidor: 'Horómetro',
    medidorUnidad: 'hs',
    taller: 'Taller',
  },
  logistica: {
    activoSingular: 'Vehículo',
    activoPlural: 'Flota',
    medidor: 'Kilometraje',
    medidorUnidad: 'km',
    taller: 'Taller',
  },
  concesionarias: {
    activoSingular: 'Vehículo',
    activoPlural: 'Vehículos',
    medidor: 'Kilometraje',
    medidorUnidad: 'km',
    taller: 'Servicio',
  },
  distribucion: {
    activoSingular: 'Vehículo',
    activoPlural: 'Vehículos',
    medidor: 'Kilometraje',
    medidorUnidad: 'km',
    taller: 'Taller',
  },
  servicios_tecnicos: {
    activoSingular: 'Equipo',
    activoPlural: 'Equipos',
    medidor: 'Uso',
    medidorUnidad: 'ciclos',
    taller: 'Laboratorio',
  }
}

export function RubroProvider({ children }) {
  const { rubro } = useAuth()

  const taxonomia = useMemo(() => {
    return taxonomiasPorRubro[rubro] || taxonomiasPorRubro['maquinaria']
  }, [rubro])

  return (
    <RubroContext.Provider value={{ taxonomia }}>
      {children}
    </RubroContext.Provider>
  )
}

export const useRubro = () => {
  const context = useContext(RubroContext)
  if (!context) {
    throw new Error("useRubro debe ser usado dentro de un RubroProvider")
  }
  return context
}
