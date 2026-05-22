export const integrationFlags = {
  arca: import.meta.env.VITE_ENABLE_ARCA === 'true',
  whatsapp: import.meta.env.VITE_ENABLE_WHATSAPP === 'true',
  email: import.meta.env.VITE_ENABLE_EMAIL === 'true',
  storage: import.meta.env.VITE_ENABLE_STORAGE === 'true',
  bancos: import.meta.env.VITE_ENABLE_BANCOS === 'true',
  ocr: import.meta.env.VITE_ENABLE_OCR === 'true',
}

export const isIntegrationEnabled = (integrationName) => {
  return !!integrationFlags[integrationName]
}

export default integrationFlags
