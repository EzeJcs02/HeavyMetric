import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useMaquinaDetalle(maquinaId) {
  const [data, setData] = useState({
    maquina: null,
    ots: [],
    contratos: [],
    stats: {
      totalIngresos: 0,
      totalGastos: 0,
      rentabilidad: 0,
      horasTrabajadas: 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!maquinaId) return

    async function fetchDetalle() {
      try {
        setLoading(true)
        setError(null)

        // 1. Datos de la máquina
        const { data: maquina, error: errM } = await supabase
          .from('maquinas')
          .select('*, cliente:clientes(razon_social)')
          .eq('id', maquinaId)
          .single()
        
        if (errM) throw errM

        // 2. Órdenes de Trabajo (Gastos)
        const { data: ots, error: errOT } = await supabase
          .from('ordenes_trabajo')
          .select('*')
          .eq('maquina_id', maquinaId)
          .order('fecha_ingreso', { ascending: false })
        
        if (errOT) throw errOT

        // 3. Contratos de Alquiler (Ingresos)
        const { data: contratos, error: errC } = await supabase
          .from('contratos_alquiler')
          .select('*, cliente:clientes(razon_social)')
          .eq('maquina_id', maquinaId)
          .order('fecha_inicio', { ascending: false })
        
        if (errC) throw errC

        // 4. Cálculos de Rentabilidad
        const totalGastos = ots.reduce((acc, ot) => acc + Number(ot.total_usd || 0), 0)
        
        const totalIngresos = contratos.reduce((acc, c) => {
          const inicio = new Date(c.fecha_inicio)
          const fin = new Date(c.fecha_fin)
          const dias = Math.max(1, Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)))
          return acc + (dias * Number(c.tarifa_diaria_usd))
        }, 0)

        setData({
          maquina,
          ots,
          contratos,
          stats: {
            totalIngresos,
            totalGastos,
            rentabilidad: totalIngresos - totalGastos,
            horasTrabajadas: maquina.horometro_actual
          }
        })

      } catch (err) {
        console.error('Error fetching machine detail:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDetalle()
  }, [maquinaId])

  return { ...data, loading, error }
}
