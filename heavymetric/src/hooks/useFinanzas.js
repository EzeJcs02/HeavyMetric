import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

// 1. Hook para Facturacion (paginado server-side)
export function useTransacciones({ page = 1, pageSize = 10, search = '', clienteFiltro = '', filterStatus = 'todos', periodo = 'este_mes' } = {}) {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)
  const queryClient = useQueryClient()

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['transacciones', organizationId, page, pageSize, search, clienteFiltro, filterStatus, periodo],
    queryFn: async () => {
      if (!organizationId) return { data: [], count: 0 }

      let query = supabase
        .from('transacciones')
        .select(`
          *,
          cliente:clientes(id, razon_social, nombre_comercial, cuit),
          ot:ordenes_trabajo(numero_ot),
          contrato:contratos_alquiler(numero_contrato)
        `, { count: 'exact' })
        .eq('organization_id', organizationId)

      // Periodo
      if (periodo !== 'todos') {
        const now = new Date()
        if (periodo === 'este_mes') {
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
          query = query.gte('fecha_emision', firstDay)
        } else if (periodo === 'mes_pasado') {
          const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
          const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
          query = query.gte('fecha_emision', firstDay).lte('fecha_emision', lastDay)
        } else if (periodo === 'ano_actual') {
          const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
          query = query.gte('fecha_emision', firstDay)
        }
      }

      // Status
      if (filterStatus !== 'todos') {
        query = query.eq('estado_pago', filterStatus)
      }

      // Cliente
      if (clienteFiltro) {
        query = query.eq('cliente_id', clienteFiltro)
      }

      // Search server-side (only on numero_comprobante or tipo_documento since we can't easily ilike related without RPC, but we can do a sub-query trick if needed)
      if (search && search.trim() !== '') {
        const q = search.trim()
        const { data: clientesBusqueda } = await supabase
          .from('clientes')
          .select('id')
          .eq('organization_id', organizationId)
          .or(`razon_social.ilike.%${q}%,nombre_comercial.ilike.%${q}%,cuit.ilike.%${q}%`)

        const cIds = (clientesBusqueda || []).map(c => c.id)
        const filterOr = [
          `numero_comprobante.ilike.%${q}%`,
          `tipo_documento.ilike.%${q}%`
        ]
        if (cIds.length > 0) {
          filterOr.push(`cliente_id.in.(${cIds.join(',')})`)
        }
        
        query = query.or(filterOr.join(','))
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      
      query = query.range(from, to).order('fecha_emision', { ascending: false })

      const { data, count, error: err } = await query
      if (err) throw err

      return { data: data || [], count: count || 0 }
    },
    staleTime: 1000 * 30,
    placeholderData: keepPreviousData,
  })

  return {
    transacciones: data?.data || [],
    totalCount: data?.count || 0,
    loading,
    error: queryError?.message,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['transacciones'] }),
  }
}

// 2. Hook para Tesoreria (trae SOLO lo pendiente para ser liviano)
export function useTesoreriaData() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)
  const queryClient = useQueryClient()

  // Traer TC
  const { data: tipoCambio, error: tipoCambioError } = useQuery({
    queryKey: ['tipo_cambio'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tipo_cambio').select('*').order('fecha', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      return data || null
    },
    staleTime: 1000 * 60 * 60,
  })

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['tesoreria_data', organizationId],
    queryFn: async () => {
      if (!organizationId) return { transacciones: [], compras: [] }

      const [txRes, compRes] = await Promise.all([
        supabase
          .from('transacciones')
          .select('id, estado_pago, cliente_id, monto_total_ars, monto_total_usd, fecha_vencimiento, tipo_cambio_bna, concepto, cliente:clientes(razon_social, nombre_comercial)')
          .eq('organization_id', organizationId)
          .eq('estado_pago', 'pendiente'),
        supabase
          .from('compras')
          .select('id, estado, total_ars, total_usd, fecha_vencimiento, proveedor:proveedores(empresa), concepto')
          .eq('organization_id', organizationId)
          .in('estado', ['recibido', 'pendiente'])
      ])

      if (txRes.error) throw txRes.error
      if (compRes.error) throw compRes.error

      return {
        transacciones: txRes.data || [],
        compras: compRes.data || [],
      }
    },
    staleTime: 1000 * 30,
  })

  return {
    transacciones: data?.transacciones || [],
    compras: data?.compras || [],
    tipoCambio,
    loading,
    error: queryError?.message || tipoCambioError?.message,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['tesoreria_data'] })
  }
}

// 3. Hook para acciones de facturación
export function useFinanzasAcciones() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)
  const queryClient = useQueryClient()

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['transacciones'] })
    queryClient.invalidateQueries({ queryKey: ['tesoreria_data'] })
    queryClient.invalidateQueries({ queryKey: ['facturacion_kpis'] })
  }

  const crearFacturaDesdeOT = async (otId, tipoDocumento = null) => {
    if (!organizationId) throw new Error('No se pudo determinar la organización.')
    const { data, error } = await supabase.rpc('facturar_ot', { p_ot_id: otId, p_tipo_documento: tipoDocumento })
    if (error) throw error
    invalidateAll()
    return data
  }

  const crearFacturaDesdeAlquiler = async (contratoId, tipoDocumento = 'Factura A') => {
    if (!organizationId) throw new Error('No se pudo determinar la organización.')
    
    const { data: contrato, error: errC } = await supabase.from('contratos_alquiler').select('*, cliente:clientes(*)').eq('id', contratoId).single()
    if (errC) throw errC

    const { data: tc } = await supabase.from('tipo_cambio').select('*').order('fecha', { ascending: false }).limit(1).maybeSingle()
    const tasa = tc?.venta || 0
    if (tasa === 0) throw new Error('No hay tipo de cambio disponible.')

    const fechaInicio = new Date(contrato.fecha_inicio)
    const fechaFin = new Date(contrato.fecha_fin)
    const dias = Math.max(1, Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)))

    const montoTotalUsd = dias * Number(contrato.tarifa_diaria_usd)
    
    const { data: tx, error: errTx } = await supabase.from('transacciones').insert([{
      organization_id: organizationId,
      tipo_documento: tipoDocumento,
      origen_tipo: 'alquiler',
      contrato_alquiler_id: contrato.id,
      cliente_id: contrato.cliente_id,
      condicion_iva_cliente: contrato.cliente.condicion_iva,
      monto_neto_usd: montoTotalUsd / 1.21,
      monto_iva_usd: montoTotalUsd * 0.21,
      monto_total_usd: montoTotalUsd,
      tipo_cambio_bna: tasa,
      monto_total_ars: montoTotalUsd * tasa,
      estado_pago: 'pendiente',
      fecha_emision: new Date().toISOString().split('T')[0],
    }]).select().single()

    if (errTx) throw errTx
    invalidateAll()
    return tx
  }

  const anularTransaccion = async (txId) => {
    if (!organizationId) throw new Error('No se pudo determinar la organización.')
    const { error } = await supabase.from('transacciones').update({ estado_pago: 'anulado' }).eq('id', txId).eq('organization_id', organizationId)
    if (error) throw error
    invalidateAll()
  }

  const registrarCobro = async (txId, datosCobro) => {
    if (!organizationId) throw new Error('No se pudo determinar la organización.')
    const { error } = await supabase.from('transacciones').update({
      estado_pago: 'cobrado',
      fecha_cobro: new Date().toISOString().split('T')[0],
      medio_pago: datosCobro.medio_pago,
      notas: datosCobro.notas,
    }).eq('id', txId).eq('organization_id', organizationId)
    
    if (error) throw error
    invalidateAll()
  }

  return { crearFacturaDesdeOT, crearFacturaDesdeAlquiler, registrarCobro, anularTransaccion }
}

export function useFinanzasKpis({ periodo = 'este_mes' } = {}) {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const { data: kpis, isLoading: loading } = useQuery({
    queryKey: ['facturacion_kpis', organizationId, periodo],
    queryFn: async () => {
      if (!organizationId) return { emitido: 0, cobrado: 0, pendiente: 0 }

      let query = supabase
        .from('transacciones')
        .select('monto_total_usd, estado_pago')
        .eq('organization_id', organizationId)
        
      if (periodo !== 'todos') {
        const now = new Date()
        if (periodo === 'este_mes') {
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
          query = query.gte('fecha_emision', firstDay)
        } else if (periodo === 'mes_pasado') {
          const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
          const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
          query = query.gte('fecha_emision', firstDay).lte('fecha_emision', lastDay)
        } else if (periodo === 'ano_actual') {
          const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
          query = query.gte('fecha_emision', firstDay)
        }
      }

      const { data, error } = await query
      if (error) throw error

      const emitido = (data || []).reduce((acc, tx) => acc + Number(tx.monto_total_usd || 0), 0)
      const cobrado = (data || []).filter(tx => tx.estado_pago === 'cobrado').reduce((acc, tx) => acc + Number(tx.monto_total_usd || 0), 0)
      const pendiente = (data || []).filter(tx => tx.estado_pago === 'pendiente').reduce((acc, tx) => acc + Number(tx.monto_total_usd || 0), 0)

      return { emitido, cobrado, pendiente }
    },
    staleTime: 1000 * 60,
  })

  // Exportar el hook legacy para compatibilidad si hay componentes sueltos usándolo
  return {
    kpis: kpis || { emitido: 0, cobrado: 0, pendiente: 0 },
    loading,
  }
}

// Hook legacy wrapper para compatibilidad (Alquileres, Dashboard, Taller, Facturacion viejo)
export function useFinanzas() {
  const { transacciones, compras, tipoCambio, loading, error, refetch } = useTesoreriaData()
  const acciones = useFinanzasAcciones()

  return {
    transacciones,
    compras,
    tipoCambio,
    loading,
    error,
    fetchTransacciones: refetch,
    ...acciones
  }
}
