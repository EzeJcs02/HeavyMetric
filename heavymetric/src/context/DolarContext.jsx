import { createContext, useContext, useEffect, useState } from 'react'
import { getDolarBNA, formatARS, formatUSD, pesificar } from '../lib/dolar'
import { supabase } from '../lib/supabase'

const DolarContext = createContext(null)

export function DolarProvider({ children }) {
  const [dolar, setDolar] = useState(null)

  useEffect(() => {
    async function cargar() {
      try {
        // Quitamos .single() para evitar el error 406 si la tabla está vacía
        const { data, error } = await supabase
          .from('tipo_cambio')
          .select('*')
          .order('fecha', { ascending: false })
          .limit(1)

        if (data && data.length > 0) {
          setDolar(data[0])
          return
        }
      } catch (err) {
        console.warn('Error recuperando dólar de DB, intentando BNA Live...', err)
      }

      // Si no hay datos en DB, intentamos traerlo en vivo del BNA
      const live = await getDolarBNA()
      if (live) {
        setDolar({ venta: live.venta, compra: live.compra, fecha: live.fecha })
      }
    }
    cargar()
  }, [])

  return (
    <DolarContext.Provider value={{
      dolar,
      tcVenta: dolar?.venta ?? null,
      formatARS,
      formatUSD,
      toARS: (usd) => dolar ? pesificar(usd, dolar.venta) : null,
    }}>
      {children}
    </DolarContext.Provider>
  )
}

export const useDolar = () => useContext(DolarContext)
