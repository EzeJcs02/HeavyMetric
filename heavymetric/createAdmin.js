import { createClient } from '@supabase/supabase-js'

function getArgument(name) {
  const flag = `--${name}`
  const inline = process.argv.find((value) => value.startsWith(`${flag}=`))
  if (inline) return inline.slice(flag.length + 1)

  const index = process.argv.indexOf(flag)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  return value && !value.startsWith('--') ? value : undefined
}

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ADMIN_EMAIL = getArgument('email') || process.env.ADMIN_EMAIL || ''
const ADMIN_PASSWORD = getArgument('password') || process.env.ADMIN_PASSWORD || ''
const ORGANIZATION_NAME = getArgument('organization') || process.env.ADMIN_ORGANIZATION_NAME || 'Knock S.A.'
const OWNER_CONFIRMED = process.argv.includes('--confirm-owner') || process.env.CONFIRM_CREATE_OWNER === 'true'

function validateConfiguration() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      'Faltan credenciales. Usá ADMIN_EMAIL y ADMIN_PASSWORD o los argumentos --email y --password.'
    )
  }

  if (!/^\S+@\S+\.\S+$/.test(ADMIN_EMAIL)) {
    throw new Error('ADMIN_EMAIL no tiene un formato válido')
  }

  if (ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 12 caracteres')
  }

  if (!OWNER_CONFIRMED) {
    throw new Error(
      'Confirmación requerida. Agregá --confirm-owner o definí CONFIRM_CREATE_OWNER=true para crear o promover el owner.'
    )
  }
}

async function updateProfile(supabase, userId) {
  const { data: orgData, error: orgError } = await supabase
    .from('organizaciones')
    .select('id')
    .eq('nombre_comercial', ORGANIZATION_NAME)
    .single()

  if (orgError) throw orgError
  if (!orgData?.id) throw new Error(`No se encontró la organización ${ORGANIZATION_NAME}`)

  console.log(`Promoviendo usuario a owner en la organización ${ORGANIZATION_NAME}...`)
  const { data: profile, error } = await supabase
    .from('perfiles')
    .update({
      organization_id: orgData.id,
      rol: 'owner',
      area: 'general',
    })
    .eq('id', userId)
    .select('id')
    .single()

  if (error) throw error
  if (!profile?.id) throw new Error('No se pudo actualizar el perfil del owner')

  console.log(`Perfil owner configurado correctamente para ${ADMIN_EMAIL}`)
}

async function createAdmin() {
  validateConfiguration()

  console.log(`Operación confirmada para ${ADMIN_EMAIL} en ${ORGANIZATION_NAME}`)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Admin Owner' },
  })

  if (userError) {
    if (!userError.message.includes('already registered')) throw userError

    console.log('El usuario ya existe; se validará su perfil antes de promoverlo.')
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (listError) throw listError

    const existingUser = usersData?.users?.find((user) => user.email === ADMIN_EMAIL)
    if (!existingUser?.id) throw new Error('El usuario existe pero no pudo localizarse para actualizar su perfil')

    await updateProfile(supabase, existingUser.id)
    return
  }

  console.log(`Usuario creado: ${userData.user.id}`)
  await updateProfile(supabase, userData.user.id)
}

createAdmin().catch((error) => {
  console.error('No se pudo crear o promover el owner:', error.message)
  process.exitCode = 1
})
