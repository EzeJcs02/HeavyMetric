import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Perfil() {
  const { perfil, recargarPerfil } = useAuth()
  const [form, setForm] = useState({ nombre_completo: '', area: '' })
  const [pwd, setPwd] = useState({ nueva: '', confirmar: '' })
  const [savingPerfil, setSavingPerfil] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (perfil) {
      setForm({ nombre_completo: perfil.nombre_completo || '', area: perfil.area || '' })
      setDirty(false)
    }
  }, [perfil?.id])

  const setF = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true) }

  const handleSavePerfil = async () => {
    setSavingPerfil(true)
    try {
      const { error } = await supabase.from('perfiles').update({ nombre_completo: form.nombre_completo, area: form.area || null }).eq('id', perfil.id)
      if (error) throw error
      await recargarPerfil()
      setDirty(false)
      toast.success('Perfil actualizado')
    } catch (err) { toast.error(err.message) }
    finally { setSavingPerfil(false) }
  }

  const handleSavePwd = async () => {
    if (pwd.nueva.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    if (pwd.nueva !== pwd.confirmar) { toast.error('Las contraseñas no coinciden'); return }
    setSavingPwd(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd.nueva })
      if (error) throw error
      setPwd({ nueva: '', confirmar: '' })
      toast.success('Contraseña actualizada')
    } catch (err) { toast.error(err.message) }
    finally { setSavingPwd(false) }
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="border-b border-hm-border pb-4">
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="text-sm text-hm-muted mt-1">{perfil?.email || ''}</p>
      </div>

      <Card className="p-6 flex flex-col gap-4">
        <p className="font-mono text-[10px] text-hm-muted uppercase tracking-widest">Datos personales</p>
        <Input label="Nombre completo" value={form.nombre_completo} onChange={e => setF('nombre_completo', e.target.value)} />
        <Input label="Área / Puesto" value={form.area} onChange={e => setF('area', e.target.value)} placeholder="Ej: Taller, Administración, Ventas..." />
        <div className="flex justify-end">
          <Button variant="primary" onClick={handleSavePerfil} disabled={savingPerfil || !dirty}>
            {savingPerfil ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
          </Button>
        </div>
      </Card>

      <Card className="p-6 flex flex-col gap-4">
        <p className="font-mono text-[10px] text-hm-muted uppercase tracking-widest">Cambiar contraseña</p>
        <Input label="Nueva contraseña" type="password" value={pwd.nueva} onChange={e => setPwd(p => ({ ...p, nueva: e.target.value }))} />
        <Input label="Confirmar contraseña" type="password" value={pwd.confirmar} onChange={e => setPwd(p => ({ ...p, confirmar: e.target.value }))} />
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleSavePwd} disabled={savingPwd || !pwd.nueva}>
            {savingPwd ? 'ACTUALIZANDO...' : 'CAMBIAR CONTRASEÑA'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
