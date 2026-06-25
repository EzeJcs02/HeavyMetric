import { supabase } from '../lib/supabase'

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

export async function getPlanes() {
  const { data, error } = await supabase
    .from('tesoreria_planes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    throw error
  }

  return data || []
}

export async function getCuotas() {
  const { data, error } = await supabase
    .from('tesoreria_cuotas')
    .select('*')
    .order('vencimiento', { ascending: true })

  if (error) {
    console.error(error)
    throw error
  }

  return data || []
}

export async function createPlan(plan) {
  const { data: planData, error: planError } = await supabase
    .from('tesoreria_planes')
    .insert({
      tipo: plan.tipo,
      tercero: plan.tercero,
      cuit: plan.cuit || null,

      concepto: plan.concepto,

      importe_total: plan.importeTotal,

      moneda: plan.moneda,

      cuotas: plan.cuotas,

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

  const importeCuota =
    Number(plan.importeTotal || 0) / Number(plan.cuotas || 1)

  const cuotas = Array.from(
    { length: Number(plan.cuotas || 1) },
    (_, index) => ({
      plan_id: planData.id,

      tipo: plan.tipo,

      tercero: plan.tercero,

      concepto: plan.concepto,

      cuota: `${index + 1}/${plan.cuotas}`,

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

  return planData
}

export async function updateEstadoCuota(id, estado) {
  const { data, error } = await supabase
    .from('tesoreria_cuotas')
    .update({
      estado,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error(error)
    throw error
  }

  return data
}
