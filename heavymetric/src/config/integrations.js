// Feature flags de integraciones — controlados por variables de entorno VITE_ENABLE_*
// Todas las credenciales reales van en variables SIN prefijo VITE_ (server-side, Vercel Functions)
// Los flags VITE_ENABLE_* solo determinan si el sistema usa la integración real o el modo mock

export const integrationFlags = {
  arca:     import.meta.env.VITE_ENABLE_ARCA     === 'true',
  whatsapp: import.meta.env.VITE_ENABLE_WHATSAPP === 'true',
  email:    import.meta.env.VITE_ENABLE_EMAIL    === 'true',
  storage:  import.meta.env.VITE_ENABLE_STORAGE  === 'true',
  bancos:   import.meta.env.VITE_ENABLE_BANCOS   === 'true',
  ocr:      import.meta.env.VITE_ENABLE_OCR      === 'true',
}

export const isIntegrationEnabled = (name) => !!integrationFlags[name]

// Metadata de cada integración para mostrar en el panel /app/integraciones
export const INTEGRATION_METADATA = {
  arca: {
    label:       'ARCA / AFIP',
    description: 'Consulta de CUIT en el padrón fiscal y facturación electrónica (CAE)',
    icon:        'building',
    categoria:   'fiscal',
    envVarsServer: ['ARCA_API_URL', 'ARCA_API_KEY'],
    envVarsAlt:    ['ARCA_CERT', 'ARCA_CUIT', 'ARCA_ENV'],
    docs:          'https://www.afip.gob.ar/ws/',
  },
  whatsapp: {
    label:       'WhatsApp Business',
    description: 'Envío de alertas, avisos de cobranza, service y vencimientos de contrato',
    icon:        'message-circle',
    categoria:   'comunicacion',
    envVarsServer: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
    docs:          'https://developers.facebook.com/docs/whatsapp/cloud-api',
  },
  email: {
    label:       'Email (Resend)',
    description: 'Notificaciones y envío de PDFs (OTs, facturas, vencimientos)',
    icon:        'mail',
    categoria:   'comunicacion',
    envVarsServer: ['RESEND_API_KEY', 'RESEND_FROM'],
    docs:          'https://resend.com/docs',
  },
  storage: {
    label:       'Storage (Supabase)',
    description: 'Almacenamiento de documentos, fotos de campo y firmas digitales',
    icon:        'hard-drive',
    categoria:   'infraestructura',
    envVarsServer: [],
    envVarsClient: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    docs:          'https://supabase.com/docs/guides/storage',
  },
  bancos: {
    label:       'Bancos / E-Cheq',
    description: 'Gestión de cheques físicos y electrónicos, preparación para conciliación bancaria',
    icon:        'landmark',
    categoria:   'finanzas',
    envVarsServer: [],
    docs:          null,
  },
  ocr: {
    label:       'OCR (Google Vision)',
    description: 'Lectura automática de remitos, facturas y documentos con IA',
    icon:        'scan',
    categoria:   'ia',
    envVarsServer: ['GOOGLE_CLOUD_API_KEY'],
    docs:          'https://cloud.google.com/vision/docs',
  },
}

export const getIntegrationStatus = () =>
  Object.entries(integrationFlags).map(([key, enabled]) => ({
    key,
    enabled,
    ...INTEGRATION_METADATA[key],
  }))

export default integrationFlags
