import { supabase } from './supabase'

const ACCIONES = new Set([
  'INSERT',
  'UPDATE',
  'DELETE',
])

async function getAuditContext() {
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError) throw authError

  const user = authData?.user

  if (!user?.id) throw new Error('Usuario no autenticado')

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (perfilError) throw perfilError

  if (!perfil?.organization_id) {
    throw new Error('No se encontró organization_id')
  }

  return {
    userId: user.id,
    organizationId: perfil.organization_id,
  }
}

/**
 * Registro silencioso de auditoría.
 * Nunca rompe el flujo principal.
 */
export async function logAudit({
  tabla,
  registroId,
  accion,
  datosAntes,
  datosDespues,
  descripcion,
}) {
  try {
    if (!tabla || typeof tabla !== 'string') return

    if (!ACCIONES.has(accion)) return

    const ctx = await getAuditContext()

    const payload = {
      organization_id: ctx.organizationId,
      usuario_id: ctx.userId,

      tabla,

      registro_id: registroId ?? null,

      accion,

      datos_antes: datosAntes ?? null,

      datos_despues: datosDespues ?? null,

      descripcion: descripcion ?? null,

      created_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('audit_log')
      .insert(payload)

    if (error) {
      console.warn('[audit]', error.message)
    }

  } catch (err) {
    console.warn('[audit]', err.message)
  }
}