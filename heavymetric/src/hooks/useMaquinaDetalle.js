import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function getOrganizationId(auth) {
  return (
    auth?.profile?.organization_id ||
    auth?.perfil?.organization_id ||
    auth?.user?.user_metadata?.organization_id ||
    auth?.organizationId ||
    null
  )
}

export function useMaquinaDetalle(maquinaId) {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const [data, setData] = useState({
    maquina: null,
    ots: [],
    contratos: [],
    stats: {
      totalIngresos: 0,
      totalGastos: 0,
      rentabilidad: 0,
      horasTrabajadas: 0,
    },
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!maquinaId) return

    let cancelled = false

    async function fetchDetalle() {
      try {
        setLoading(true)
        setError(null)

        if (!organizationId) {
          setData({
            maquina: null,
            ots: [],
            contratos: [],
            stats: {
              totalIngresos: 0,
              totalGastos: 0,
              rentabilidad: 0,
              horasTrabajadas: 0,
            },
          })
          return
        }

        const { data: maquina, error: errM } = await supabase
          .from('maquinas')
          .select('*, cliente:clientes(razon_social)')
          .eq('id', maquinaId)
          .eq('organization_id', organizationId)
          .single()

        if (errM) throw errM

        const [
          { data: ots, error: errOT },
          { data: contratos, error: errC },
        ] = await Promise.all([
          supabase
            .from('ordenes_trabajo')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('maquina_id', maquinaId)
            .order('fecha_ingreso', { ascending: false }),

          supabase
            .from('contratos_alquiler')
            .select('*, cliente:clientes(razon_social)')
            .eq('organization_id', organizationId)
            .eq('maquina_id', maquinaId)
            .order('fecha_inicio', { ascending: false }),
        ])

        if (errOT) throw errOT
        if (errC) throw errC
        if (cancelled) return

        const safeOts = ots || []
        const safeContratos = contratos || []

        const totalGastos = safeOts.reduce(
          (acc, ot) => acc + Number(ot.total_usd || 0),
          0
        )

        const totalIngresos = safeContratos.reduce((acc, c) => {
          const inicio = new Date(c.fecha_inicio)
          const fin = new Date(c.fecha_fin)
          const dias = Math.max(1, Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)))
          return acc + (dias * Number(c.tarifa_diaria_usd || 0))
        }, 0)

        setData({
          maquina,
          ots: safeOts,
          contratos: safeContratos,
          stats: {
            totalIngresos,
            totalGastos,
            rentabilidad: totalIngresos - totalGastos,
            horasTrabajadas: maquina?.horometro_actual || 0,
          },
        })
      } catch (err) {
        console.error('[HeavyMetric][MaquinaDetalle] Error fetching machine detail:', err)
        if (!cancelled) setError(err.message || 'Error al cargar detalle de máquina')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDetalle()

    return () => {
      cancelled = true
    }
  }, [maquinaId, organizationId])

  return { ...data, loading, error }
}