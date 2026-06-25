import { createContext, useContext, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { rubrosTaxonomia, RUBRO_DEFAULT } from '../config/rubrosTaxonomia'

const RubroContext = createContext(null)

export function RubroProvider({ children }) {
  const { rubro } = useAuth()

  const taxonomia = useMemo(() => {
    return rubrosTaxonomia[rubro] || rubrosTaxonomia[RUBRO_DEFAULT]
  }, [rubro])

  const hasCapability = (key) => {
    return Boolean(taxonomia?.capabilities?.[key])
  }

  const getTiposActivo = () => {
    return taxonomia?.tiposActivo || []
  }

  return (
    <RubroContext.Provider
      value={{
        rubro,
        taxonomia,
        hasCapability,
        getTiposActivo,
      }}
    >
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