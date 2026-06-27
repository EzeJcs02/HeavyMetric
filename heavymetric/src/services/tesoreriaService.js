import { supabase } from '../lib/supabase'

// ────────────────────────────────────────────────────────────────
// HeavyMetric - Tesorería Service
// Seguridad multitenancy + trazabilidad operativa ISO
// Regla: ningún plan/cuota financiero sin organization_id.
// ────────────────────────────────────────────────────────────────

function addPeriod(dateString, index, frecuencia) {
  const date = new Date(`${dateString}T00:00:00`)

  if (frecuencia === 'semanal') {
    date.setDate(date.getDate() + index * 7)
  }

  if (frecuencia === 'quincenal') {
    date.setDate(date.getDate() + index * 15)
  }

  if (frecuencia === 'mensual') {
    date.setMonth(date.getMonth() + index)
  }

  return date.toISOString().slice(0, 10)
}

async function getCurrentAuthScope() {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError

  const user = authData?.user
  if (!user) throw new Error('Usuario no autenticado')

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (perfilError) throw perfilError

  if (!perfil?.organization_id) {
    throw new Error('No se pudo determinar la organización del usuario')
  }

  return {
    userId: user.id,
    organizationId: perfil.organization_id,
  }
}

async function assertPlanInOrganization(planId, organizationId) {
  const { data, error } = await supabase
    .from('tesoreria_planes')
    .select('id, organization_id')
    .eq('id', planId)
    .eq('organization_id', organizationId)
    .single()

  if (error) throw error
  return data
}

export async function getPlanes() {
  const { organizationId } = await getCurrentAuthScope()

  const { data, error } = await supabase
    .from('tesoreria_planes')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    throw error
  }

  return data || []
}

export async function getCuotas() {
  const { organizationId } = await getCurrentAuthScope()

  const { data, error } = await supabase
    .from('tesoreria_cuotas')
    .select('*')
    .eq('organization_id', organizationId)
    .order('vencimiento', { ascending: true })

  if (error) {
    console.error(error)
    throw error
  }

  return data || []
}

export async function createPlan(plan) {
  const { organizationId } = await getCurrentAuthScope()

  const importeTotal = Number(plan.importeTotal || 0)
  const cantidadCuotas = Number(plan.cuotas || 1)

  if (!Number.isFinite(importeTotal) || importeTotal <= 0) {
    throw new Error('El importe total debe ser mayor a cero')
  }

  if (!Number.isInteger(cantidadCuotas) || cantidadCuotas <= 0) {
    throw new Error('La cantidad de cuotas debe ser mayor a cero')
  }

  if (!plan.fechaInicio) {
    throw new Error('La fecha de inicio es obligatoria')
  }

  const { data: planData, error: planError } = await supabase
    .from('tesoreria_planes')
    .insert({
      organization_id: organizationId,

      tipo: plan.tipo,
      tercero: plan.tercero,
      cuit: plan.cuit || null,

      concepto: plan.concepto,

      importe_total: importeTotal,

      moneda: plan.moneda,

      cuotas: cantidadCuotas,

      fecha_inicio: plan.fechaInicio,

      frecuencia: plan.frecuencia,

      forma: plan.forma,
      banco: plan.banco,

      referencia: plan.referencia || null,
      observaciones: plan.observaciones || null,

      estado: 'programado',
    })
    .select()
    .single()

  if (planError) {
    console.error(planError)
    throw planError
  }

  const importeCuota = importeTotal / cantidadCuotas

  const cuotas = Array.from(
    { length: cantidadCuotas },
    (_, index) => ({
      organization_id: organizationId,

      plan_id: planData.id,

      tipo: plan.tipo,

      tercero: plan.tercero,

      concepto: plan.concepto,

      cuota: `${index + 1}/${cantidadCuotas}`,

      importe: importeCuota,

      moneda: plan.moneda,

      vencimiento: addPeriod(
        plan.fechaInicio,
        index,
        plan.frecuencia
      ),

      forma: plan.forma,

      banco: plan.banco,

      estado: 'pendiente',
    })
  )

  const { error: cuotasError } = await supabase
    .from('tesoreria_cuotas')
    .insert(cuotas)

  if (cuotasError) {
    console.error(cuotasError)
    throw cuotasError
  }

  console.info('[HeavyMetric][Tesorería] Plan financiero creado con trazabilidad operativa:', {
    plan_id: planData.id,
    tipo: plan.tipo,
    tercero: plan.tercero,
    cuotas: cantidadCuotas,
    importe_total: importeTotal,
    organization_id: organizationId,
  })

  return planData
}

export async function updateEstadoCuota(id, estado) {
  const { organizationId } = await getCurrentAuthScope()

  const { data: cuotaActual, error: cuotaGetError } = await supabase
    .from('tesoreria_cuotas')
    .select('id, plan_id, estado, organization_id')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (cuotaGetError) {
    console.error(cuotaGetError)
    throw cuotaGetError
  }

  if (cuotaActual?.plan_id) {
    await assertPlanInOrganization(cuotaActual.plan_id, organizationId)
  }

  const { data, error } = await supabase
    .from('tesoreria_cuotas')
    .update({
      estado,
    })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    console.error(error)
    throw error
  }

  console.info('[HeavyMetric][Tesorería] Estado de cuota actualizado con trazabilidad operativa:', {
    cuota_id: id,
    estado_anterior: cuotaActual.estado,
    estado_nuevo: estado,
    plan_id: cuotaActual.plan_id,
    organization_id: organizationId,
  })

  return data
}