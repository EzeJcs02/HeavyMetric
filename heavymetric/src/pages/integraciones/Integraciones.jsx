import { useState } from 'react'
import { toast } from 'sonner'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { getIntegrationStatus } from '../../config/integrations'
import { lookupCuit }          from '../../lib/integrations/arca'
import { sendWhatsAppMessage } from '../../lib/integrations/whatsapp'
import { sendEmail }           from '../../lib/integrations/email'
import { uploadDocument }      from '../../lib/integrations/storage'
import { syncEcheqs }          from '../../lib/integrations/bancos'
import { readDocumentWithOCR } from '../../lib/integrations/ocr'

// SVG paths para los íconos de cada integración
const ICON_PATHS = {
  building:        'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  'message-circle':'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  mail:            'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  'hard-drive':    'M22 12H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z',
  landmark:        'M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11',
  scan:            'M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3M4 12h16',
}

const CATEGORIA_STYLE = {
  fiscal:         'text-blue-400   bg-blue-400/10   border-blue-400/20',
  comunicacion:   'text-green-400  bg-green-400/10  border-green-400/20',
  infraestructura:'text-purple-400 bg-purple-400/10 border-purple-400/20',
  finanzas:       'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  ia:             'text-orange-400 bg-orange-400/10 border-orange-400/20',
}

// Función de prueba para cada integración
const TESTERS = {
  arca:     () => lookupCuit('30712345678'),
  whatsapp: () => sendWhatsAppMessage('5491100000000', 'alerta', { maquina: 'TEST-001', descripcion: 'Prueba de integración HeavyMetric' }),
  email:    () => sendEmail('test@heavymetric.com', '[TEST] HeavyMetric', '<p>Prueba de integración de email.</p>'),
  storage:  () => uploadDocument(new Blob(['test'], { type: 'text/plain' }), 'test/integration-check.txt'),
  bancos:   () => syncEcheqs(),
  ocr:      () => readDocumentWithOCR('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
}

function IntegCard({ integration, onTest, testing }) {
  const { key, enabled, label, description, icon, categoria, envVarsServer = [], envVarsAlt = [], docs } = integration
  const catStyle   = CATEGORIA_STYLE[categoria] || 'text-hm-muted bg-hm-surface2 border-hm-border'
  const isTesting  = testing === key

  return (
    <Card className={`p-5 transition-colors border ${enabled ? 'border-hm-accent/30' : 'border-hm-border'}`}>
      <div className="flex items-start gap-4">
        {/* Icono */}
        <div className={`p-2 rounded-lg border shrink-0 ${catStyle}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={ICON_PATHS[icon]} />
          </svg>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-hm-text">{label}</span>
            <Badge variant={enabled ? 'success' : 'default'}>
              {enabled ? 'ACTIVO' : 'MOCK'}
            </Badge>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-widest ${catStyle}`}>
              {categoria}
            </span>
          </div>

          <p className="text-sm text-hm-muted mt-1.5 leading-relaxed">{description}</p>

          {/* Variables necesarias cuando no está activo */}
          {!enabled && (envVarsServer.length > 0 || envVarsAlt?.length > 0) && (
            <div className="mt-3 p-3 bg-hm-surface2/40 rounded-lg border border-hm-border/50">
              <p className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">
                Variables de entorno (server-side):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {envVarsServer.map(v => (
                  <code key={v} className="text-[11px] bg-hm-surface border border-hm-border px-1.5 py-0.5 rounded text-hm-muted font-mono">
                    {v}
                  </code>
                ))}
              </div>
              {envVarsAlt?.length > 0 && (
                <>
                  <p className="text-[10px] font-mono text-hm-muted/60 mt-2 mb-1">Alternativa:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {envVarsAlt.map(v => (
                      <code key={v} className="text-[11px] bg-hm-surface border border-hm-border px-1.5 py-0.5 rounded text-hm-muted/70 font-mono">
                        {v}
                      </code>
                    ))}
                  </div>
                </>
              )}
              {docs && (
                <a
                  href={docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2.5 text-[11px] text-hm-accent hover:underline font-mono"
                >
                  Ver documentación →
                </a>
              )}
            </div>
          )}
        </div>

        {/* Botón probar */}
        <button
          onClick={() => onTest(key)}
          disabled={isTesting}
          className="shrink-0 text-[11px] font-mono px-3 py-1.5 rounded border border-hm-border text-hm-muted hover:text-hm-text hover:border-hm-accent/40 transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          {isTesting ? 'PROBANDO…' : 'PROBAR'}
        </button>
      </div>
    </Card>
  )
}

export default function Integraciones() {
  const integrations = getIntegrationStatus()
  const [testing,    setTesting]    = useState(null)

  const activas = integrations.filter(i => i.enabled).length

  const handleTest = async (key) => {
    setTesting(key)
    try {
      const result = await TESTERS[key]()
      if (result?.success) {
        toast.success(`${integrations.find(i => i.key === key)?.label}: OK`)
      } else {
        toast.error(result?.error || 'Error en la integración')
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setTesting(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Integraciones</h1>
          <p className="text-sm text-hm-muted mt-1">
            {activas} de {integrations.length} activas — resto en modo mock (sin llamadas reales)
          </p>
        </div>
        <Badge variant={activas > 0 ? 'success' : 'default'} className="mt-1">
          {activas}/{integrations.length} ACTIVAS
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4">
        {integrations.map(i => (
          <IntegCard
            key={i.key}
            integration={i}
            onTest={handleTest}
            testing={testing}
          />
        ))}
      </div>

      {/* Nota de activación */}
      <Card className="p-4 border border-hm-border bg-hm-surface2/10">
        <p className="font-mono text-[10px] text-hm-muted uppercase tracking-widest mb-2">
          Cómo activar una integración
        </p>
        <ol className="text-xs text-hm-muted/80 space-y-1 list-decimal list-inside">
          <li>Configurar las variables de entorno server-side en Vercel (sin prefijo VITE_).</li>
          <li>Cambiar <code className="bg-hm-surface px-1 rounded text-hm-muted font-mono">VITE_ENABLE_NOMBRE=true</code> en el entorno.</li>
          <li>Hacer redeploy. La integración pasará de mock a producción.</li>
        </ol>
      </Card>

      {/* Nota de seguridad */}
      <Card className="p-4 border border-hm-border/40 bg-hm-surface2/5">
        <p className="font-mono text-[10px] text-hm-muted uppercase tracking-widest mb-2">
          Seguridad
        </p>
        <p className="text-xs text-hm-muted/60 leading-relaxed">
          Las credenciales de APIs externas (ARCA, WhatsApp, Email, OCR) se ejecutan
          exclusivamente en Vercel Functions — nunca se exponen al browser.
          Los flags <code className="font-mono">VITE_ENABLE_*</code> solo indican si el
          modo mock está activo, no contienen secretos.
        </p>
      </Card>
    </div>
  )
}
