import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useFinanzas() {
  const [transacciones, setTransacciones] = useState([])
  const [tipoCambio, setTipoCambio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTipoCambio = async () => {
    try {
      const { data, error: err } = await supabase
        .from('tipo_cambio')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle()  // maybeSingle() devuelve null en lugar de error cuando no hay filas
      
      setTipoCambio(data)
    } catch (err) {
      console.warn('[HeavyMetric] Tipo de cambio no disponible:', err.message)
    }
  }

  const fetchTransacciones = async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('transacciones')
        .select(`
          *,
          cliente:clientes(razon_social),
          ot:ordenes_trabajo(numero_ot),
          contrato:contratos_alquiler(numero_contrato)
        `)
        .order('fecha_emision', { ascending: false })

      if (err) throw err
      setTransacciones(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Factura una OT de forma atómica vía RPC (inserta TX + marca facturada en 1 transacción SQL)
  const crearFacturaDesdeOT = async (otId, tipoDocumento = null) => {
    try {
      const { data, error: err } = await supabase.rpc('facturar_ot', {
        p_ot_id:          otId,
        p_tipo_documento: tipoDocumento  // null = la RPC lo calcula por condición IVA
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
    try {
      // 1. Obtener datos del contrato
      const { data: contrato, error: errC } = await supabase
        .from('contratos_alquiler')
        .select('*, cliente:clientes(*)')
        .eq('id', contratoId)
        .single()
      
      if (errC) throw errC
      
      // 2. Obtener tipo de cambio
      if (!tipoCambio) await fetchTipoCambio()
      const tasa = tipoCambio?.venta || 0
      if (tasa === 0) throw new Error('No hay tipo de cambio disponible.')

      // 3. Calcular montos (basado en la vista alquileres_activos si fuera posible, pero lo hacemos manual aquí)
      const fechaInicio = new Date(contrato.fecha_inicio)
      const fechaFin = new Date(contrato.fecha_fin)
      const dias = Math.max(1, Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)))
      
      const montoTotalUsd = dias * Number(contrato.tarifa_diaria_usd)
      const montoIvaUsd = montoTotalUsd * 0.21
      const montoTotalArs = montoTotalUsd * tasa

      // 4. Crear transacción
      const { data: tx, error: errTx } = await supabase
        .from('transacciones')
        .insert([{
          organization_id: contrato.organization_id,
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
          fecha_emision: new Date().toISOString().split('T')[0]
        }])
        .select()

      if (errTx) throw errTx

      await fetchTransacciones()
      return tx[0]
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const anularTransaccion = async (txId) => {
    try {
      const { error: err } = await supabase
        .from('transacciones')
        .update({ estado_pago: 'anulado' })
        .eq('id', txId)
      if (err) throw err
      await fetchTransacciones()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const registrarCobro = async (txId, datosCobro) => {
    try {
      const { error: err } = await supabase
        .from('transacciones')
        .update({
          estado_pago: 'cobrado',
          fecha_cobro: new Date().toISOString().split('T')[0],
          medio_pago: datosCobro.medio_pago,
          notas: datosCobro.notas
        })
        .eq('id', txId)

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
  }, [])

  return {
    transacciones,
    tipoCambio,
    loading,
    error,
    fetchTransacciones,
    crearFacturaDesdeOT,
    crearFacturaDesdeAlquiler,
    registrarCobro,
    anularTransaccion
  }
}
