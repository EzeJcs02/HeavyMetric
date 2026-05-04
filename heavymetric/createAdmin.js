import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function createAdmin() {
  console.log('Creando usuario...')
  
  // 1. Crear usuario en auth
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: 'admin@knock.com',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { full_name: 'Admin Owner' }
  })

  if (userError) {
    if (userError.message.includes('already registered')) {
       console.log('El usuario ya existe.')
       // Lo buscamos
       const { data: usersData } = await supabase.auth.admin.listUsers()
       const existingUser = usersData.users.find(u => u.email === 'admin@knock.com')
       if (existingUser) await updateProfile(existingUser.id)
       return
    }
    return console.error('Error creando user:', userError)
  }

  console.log('Usuario creado:', userData.user.id)
  await updateProfile(userData.user.id)
}

async function updateProfile(userId) {
  // 2. Buscar organization_id
  const { data: orgData } = await supabase.from('organizaciones').select('id').eq('nombre_comercial', 'Knock S.A.').single()
  
  if (!orgData) return console.error('No se encontró la organización Knock S.A.')

  // 3. Actualizar perfil
  console.log('Actualizando perfil a owner y vinculando organización...')
  const { error } = await supabase
    .from('perfiles')
    .update({ 
      organization_id: orgData.id,
      rol: 'owner',
      area: 'general'
    })
    .eq('id', userId)

  if (error) console.error('Error actualizando perfil:', error)
  else console.log('✅ Perfil configurado correctamente. Email: admin@knock.com / Password: Password123!')
}

createAdmin()
