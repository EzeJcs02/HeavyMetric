import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Configuracion() {
  const { perfil, recargarPerfil } = useAuth()
  const org = perfil?.organizaciones

  const [form, setForm] = useState({
    nombre_comercial: '',
    cuit:             '',
    direccion:        '',
    telefono:         '',
    email_contacto:   '',
    logo_url:         '',
  })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (org) {
      setForm({
        nombre_comercial: org.nombre_comercial || '',
        cuit:             org.cuit             || '',
        direccion:        org.direccion         || '',
        telefono:         org.telefono          || '',
        email_contacto:   org.email_contacto    || '',
        logo_url:         org.logo_url          || '',
      })
      setDirty(false)
    }
  }, [org?.id])

  const setF = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true) }

  const handleSave = async () => {
    if (!org?.id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('organizaciones')
        .update({
          nombre_comercial: form.nombre_comercial || null,
          cuit:             form.cuit             || null,
          direccion:        form.direccion         || null,
          telefono:         form.telefono          || null,
          email_contacto:   form.email_contacto    || null,
          logo_url:         form.logo_url          || null,
        })
        .eq('id', org.id)
      if (error) throw error
      await recargarPerfil()
      setDirty(false)
      toast.success('Configuración guardada')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-sm text-hm-muted mt-1">Datos de tu organización</p>
        </div>
        <Button variant="primary" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
        </Button>
      </div>

      <Card className="p-6 flex flex-col gap-5">
        <div>
          <p className="font-mono text-[10px] text-hm-muted uppercase tracking-widest mb-3">Información general</p>
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre comercial"
              value={form.nombre_comercial}
              onChange={e => setF('nombre_comercial', e.target.value)}
              placeholder="Ej: Knock S.A."
            />
            <Input
              label="CUIT"
              value={form.cuit}
              onChange={e => setF('cuit', e.target.value)}
              placeholder="20-12345678-9"
            />
            <Input
              label="Dirección"
              value={form.direccion}
              onChange={e => setF('direccion', e.target.value)}
              placeholder="Av. Ejemplo 1234, Ciudad"
            />
          </div>
        </div>

        <div className="border-t border-hm-border pt-5">
          <p className="font-mono text-[10px] text-hm-muted uppercase tracking-widest mb-3">Contacto</p>
          <div className="flex flex-col gap-4">
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={e => setF('telefono', e.target.value)}
              placeholder="+54 11 1234-5678"
            />
            <Input
              label="Email de contacto"
              type="email"
              value={form.email_contacto}
              onChange={e => setF('email_contacto', e.target.value)}
              placeholder="contacto@empresa.com"
            />
          </div>
        </div>

        <div className="border-t border-hm-border pt-5">
          <p className="font-mono text-[10px] text-hm-muted uppercase tracking-widest mb-3">Branding</p>
          <Input
            label="URL del logo"
            value={form.logo_url}
            onChange={e => setF('logo_url', e.target.value)}
            placeholder="https://..."
          />
          {form.logo_url && (
            <div className="mt-3 p-3 bg-hm-surface2/30 rounded-lg border border-hm-border inline-block">
              <img src={form.logo_url} alt="Logo preview" className="h-12 object-contain" onError={e => { e.target.style.display = 'none' }} />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4 bg-hm-surface2/20">
        <p className="font-mono text-[10px] text-hm-muted uppercase tracking-widest mb-2">ID de organización</p>
        <p className="font-mono text-xs text-hm-muted/60 select-all">{org?.id || '—'}</p>
      </Card>
    </div>
  )
}
