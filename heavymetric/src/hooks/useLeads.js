import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Scoring: rubro(35) + origen(25) + urgencia(25) + empresa(15) = 100
export function calcularScore(rubro, origen, mensaje, empresa) {
  const rubroScore  = { Mineria: 35, Vial: 30, Construccion: 25, Agro: 20, Industrial: 15, Municipio: 10 }
  const origenScore = { Licitacion: 25, Referido: 22, Web: 18, Meta: 15, WhatsApp: 12, Manual: 5 }

  let score = 0
  score += rubroScore[rubro] || 0
  score += origenScore[origen] || 0

  const texto = ((mensaje || '') + ' ' + (empresa || '')).toLowerCase()
  if (/compra|licitac|urgen|inmedia/.test(texto))   score += 25
  else if (/alquil|renta|arrend/.test(texto))        score += 20
  else if (/servic|manten|repar/.test(texto))        score += 15
  else                                               score += 10

  if (empresa && empresa.trim()) score += 15

  const grade = score >= 70 ? 'A' : score >= 40 ? 'B' : 'C'
  return { score, grade }
}

export function useLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLeads = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('leads')
        .select('*, asignado:perfiles(nombre_completo), cliente:clientes(razon_social), cotizaciones(count)')
        .order('created_at', { ascending: false })
      if (err) throw err
      setLeads(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const crearLead = async (payload) => {
    const { score, grade } = calcularScore(payload.rubro, payload.origen, payload.mensaje, payload.empresa)
    const { data, error: err } = await supabase
      .from('leads')
      .insert([{ ...payload, lead_score: score, lead_grade: grade }])
      .select()
    if (err) throw err
    await fetchLeads()
    return data[0]
  }

  const actualizarLead = async (id, payload) => {
    const { score, grade } = calcularScore(payload.rubro, payload.origen, payload.mensaje, payload.empresa)
    const { error: err } = await supabase
      .from('leads')
      .update({ ...payload, lead_score: score, lead_grade: grade })
      .eq('id', id)
    if (err) throw err
    await fetchLeads()
  }

  const avanzarEstado = async (id, nuevoEstado) => {
    const { error: err } = await supabase
      .from('leads')
      .update({ estado: nuevoEstado })
      .eq('id', id)
    if (err) throw err
    await fetchLeads()
  }

  const convertirACliente = async (lead) => {
    // 1. Crear cliente
    const { data: cliente, error: errC } = await supabase
      .from('clientes')
      .insert([{
        razon_social:   lead.empresa || lead.nombre,
        nombre_comercial: lead.empresa || lead.nombre,
        email:          lead.email,
        telefono:       lead.telefono,
        rubro:          lead.rubro,
        propension_compra: lead.lead_grade,
        organization_id: lead.organization_id,
      }])
      .select()
      .single()
    if (errC) throw errC

    // 2. Vincular lead al cliente y marcar Ganado
    const { error: errL } = await supabase
      .from('leads')
      .update({ estado: 'Ganado', cliente_id: cliente.id })
      .eq('id', lead.id)
    if (errL) throw errL

    await fetchLeads()
    return cliente
  }

  useEffect(() => { fetchLeads() }, [])

  return { leads, loading, error, fetchLeads, crearLead, actualizarLead, avanzarEstado, convertirACliente }
}
