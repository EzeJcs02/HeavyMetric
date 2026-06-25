import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useFinanzas() {
  const { perfil } = useAuth()
  const organizationId = perfil?.organization_id

  const [transacciones, setTransacciones] = useState([])
  const [tipoCambio, setTipoCambio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [compras, setCompras] = useState([])

  const fetchTipoCambio = async () => {
    try {
      const { data, error: err } = await supabase
        .from('tipo_cambio')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (err) throw err

      setTipoCambio(data)
    } catch (err) {
      console.warn('[HeavyMetric] Tipo de cambio no disponible:', err.message)
    }
  }

  const fetchTransacciones = async () => {
    if (!organizationId) {
      setTransacciones([])
      setCompras([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [txRes, compRes] = await Promise.all([
        supabase
          .from('transacciones')
          .select(`
            *,
            cliente:clientes(razon_social),
            ot:ordenes_trabajo(numero_ot),
            contrato:contratos_alquiler(numero_contrato)
          `)
          .eq('organization_id', organizationId)
          .order('fecha_emision', { ascending: false }),
        supabase
          .from('compras')
          .select('*, proveedor:proveedores(empresa)')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false }),
      ])

      if (txRes.error) throw txRes.error
      if (compRes.error) throw compRes.error

      setTransacciones(txRes.data || [])
      setCompras(compRes.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Factura una OT de forma atómica vía RPC (inserta TX + marca facturada en 1 transacción SQL)
  const crearFacturaDesdeOT = async (otId, tipoDocumento = null) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
      const { data, error: err } = await supabase.rpc('facturar_ot', {
        p_ot_id: otId,
        p_tipo_documento: tipoDocumento,
      })

      if (err) throw err

      console.info('[HeavyMetric] OT facturada:', data)
      await fetchTransacciones()
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const crearFacturaDesdeAlquiler = async (contratoId, tipoDocumento = 'Factura A') => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
      const { data: contrato, error: errC } = await supabase
        .from('contratos_alquiler')
        .select('*, cliente:clientes(*)')
        .eq('id', contratoId)
        .eq('organization_id', organizationId)
        .single()

      if (errC) throw errC

      const { data: tipoCambioActual, error: errTc } = await supabase
        .from('tipo_cambio')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (errTc) throw errTc

      const tasa = tipoCambioActual?.venta || tipoCambio?.venta || 0
      if (tasa === 0) throw new Error('No hay tipo de cambio disponible.')

      const fechaInicio = new Date(contrato.fecha_inicio)
      const fechaFin = new Date(contrato.fecha_fin)
      const dias = Math.max(1, Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)))

      const montoTotalUsd = dias * Number(contrato.tarifa_diaria_usd)
      const montoIvaUsd = montoTotalUsd * 0.21
      const montoTotalArs = montoTotalUsd * tasa

      const { data: tx, error: errTx } = await supabase
        .from('transacciones')
        .insert([{
          organization_id: organizationId,
          tipo_documento: tipoDocumento,
          origen_tipo: 'alquiler',
          contrato_alquiler_id: contrato.id,
          cliente_id: contrato.cliente_id,
          condicion_iva_cliente: contrato.cliente.condicion_iva,
          monto_neto_usd: montoTotalUsd / 1.21,
          monto_iva_usd: montoIvaUsd,
          monto_total_usd: montoTotalUsd,
          tipo_cambio_bna: tasa,
          monto_total_ars: montoTotalArs,
          estado_pago: 'pendiente',
          fecha_emision: new Date().toISOString().split('T')[0],
        }])
        .select()
        .single()

      if (errTx) throw errTx

      await fetchTransacciones()
      return tx
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const anularTransaccion = async (txId) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
      const { error: err } = await supabase
        .from('transacciones')
        .update({ estado_pago: 'anulado' })
        .eq('id', txId)
        .eq('organization_id', organizationId)

      if (err) throw err

      await fetchTransacciones()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const registrarCobro = async (txId, datosCobro) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
      const { error: err } = await supabase
        .from('transacciones')
        .update({
          estado_pago: 'cobrado',
          fecha_cobro: new Date().toISOString().split('T')[0],
          medio_pago: datosCobro.medio_pago,
          notas: datosCobro.notas,
        })
        .eq('id', txId)
        .eq('organization_id', organizationId)

      if (err) throw err

      await fetchTransacciones()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  useEffect(() => {
    fetchTipoCambio()
    fetchTransacciones()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  return {
    transacciones,
    compras,
    tipoCambio,
    loading,
    error,
    fetchTransacciones,
    crearFacturaDesdeOT,
    crearFacturaDesdeAlquiler,
    registrarCobro,
    anularTransaccion,
  }
}