import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ghvbotguanleqocqpypq.supabase.co',
  'sb_publishable_f-Ue-S6OJPmINh6GVI0H4w_rkNPLJTc'
)

async function testConnection() {
  const { data, error } = await supabase.from('organizaciones').select('*')
  console.log('Data:', data)
  console.log('Error:', error)
}

testConnection()
