import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useUsuarios } from '../../hooks/useUsuarios'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ModalConfirm from '../../components/ui/ModalConfirm'

const ROL_VARIANT = {
  owner:      'warn',
  supervisor: 'info',
  operativo:  'default',
  cliente:    'accent',
}

const ROL_LABELS = {
  owner:      'Owner',
  supervisor: 'Supervisor',
  operativo:  'Operativo',
  cliente:    'Cliente',
}

export default function Usuarios() {
  const { usuarios, loading, error, updateRol, desactivarUsuario } = useUsuarios()
  const { perfil: miPerfil } = useAuth()
  const [editandoRol, setEditandoRol] = useState(null)
  const [nuevoRol, setNuevoRol] = useState('')
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)
  const [loadingAction, setLoadingAction] = useState(false)
  const [vinculando, setVinculando] = useState(null)
  const [clientes, setClientes] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState('')
  const [invitando, setInvitando] = useState(false)
  const [invForm, setInvForm] = useState({ email: '', nombre: '', rol: 'operativo' })
  const [invLink, setInvLink] = useState('')
  const [savingInv, setSavingInv] = useState(false)

  useEffect(() => {
    supabase.from('clientes').select('id, razon_social').order('razon_social')
      .then(({ data }) => setClientes(data || []))
  }, [])

  const handleVincularCliente = async () => {
    setLoadingAction(true)
    try {
      const { error } = await supabase.from('perfiles')
        .update({ rol: 'cliente', cliente_id: clienteSeleccionado || null })
        .eq('id', vinculando.id)
      if (error) throw error
      toast.success('Usuario vinculado como cliente')
      setVinculando(null)
    } catch (err) { toast.error(err.message) }
    finally { setLoadingAction(false) }
  }

  const handleCrearInvitacion = async () => {
    if (!invForm.email) { toast.error('El email es obligatorio'); return }
    setSavingInv(true)
    try {
      const { data, error } = await supabase
        .from('invitaciones')
        .insert({ email: invForm.email, nombre: invForm.nombre, rol: invForm.rol, organization_id: miPerfil?.organization_id, created_by: miPerfil?.id })
        .select('token')
        .single()
      if (error) throw error
      setInvLink(`${window.location.origin}/setup?token=${data.token}`)
    } catch (err) { toast.error(err.message) }
    finally { setSavingInv(false) }
  }

  const handleCambiarRol = async () => {
    setLoadingAction(true)
    try {
      await updateRol(editandoRol.id, nuevoRol)
      toast.success('Rol actualizado correctamente')
      setEditandoRol(null)
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleDesactivar = async () => {
    setLoadingAction(true)
    try {
      await desactivarUsuario(confirmDesactivar.id)
      toast.success(`${confirmDesactivar.nombre_completo} desactivado`)
      setConfirmDesactivar(null)
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  if (error) return (
    <div className="p-6">
      <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
        <h2 className="font-bold mb-2">Error cargando usuarios</h2>
        <p className="font-mono text-sm">{error}</p>
      </Card>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-hm-muted mt-1">Miembros de tu organización</p>
        </div>
        <Button variant="outline" onClick={() => { setInvitando(true); setInvLink(''); setInvForm({ email: '', nombre: '', rol: 'operativo' }) }}>
          + INVITAR
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-hm-border">
            <tr>
              <th className="p-4 font-mono text-xs text-hm-muted">NOMBRE</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ROL</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ÁREA</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="border-b border-hm-border">
                  {[1, 2, 3, 4, 5].map(j => (
                    <td key={j} className="p-4">
                      <div className="h-4 bg-hm-surface2 rounded animate-pulse" />
                    </td>
                  ))}
                  <td className="p-4" />
                </tr>
              ))
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-hm-muted font-mono text-sm">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              usuarios.map(u => {
                const esYo = u.id === miPerfil?.id
                return (
                  <tr key={u.id} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-hm-accent/15 border border-hm-accent/30 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-hm-accent">
                            {(u.nombre_completo || '?').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">{u.nombre_completo || '—'}</div>
                          {esYo && <div className="text-[10px] font-mono text-hm-accent">Tú</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={ROL_VARIANT[u.rol] ?? 'default'}>
                        {ROL_LABELS[u.rol] ?? u.rol}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-hm-muted capitalize">{u.area || '—'}</td>
                    <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      {!esYo && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setVinculando(u); setClienteSeleccionado(u.cliente_id || '') }}
                            className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-blue-500 hover:text-blue-400 transition-colors"
                          >
                            PORTAL
                          </button>
                          <button
                            onClick={() => { setEditandoRol(u); setNuevoRol(u.rol) }}
                            className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-hm-accent hover:text-hm-accent transition-colors"
                          >
                            ROL
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal invitación */}
      {invitando && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-hm-surface border border-hm-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-semibold text-base mb-1">Invitar usuario</h2>
            <p className="text-sm text-hm-muted mb-4">Se generará un enlace de acceso único.</p>
            {!invLink ? (
              <>
                <div className="flex flex-col gap-3 mb-4">
                  <input placeholder="Email *" value={invForm.email} onChange={e => setInvForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent" />
                  <input placeholder="Nombre (opcional)" value={invForm.nombre} onChange={e => setInvForm(p => ({ ...p, nombre: e.target.value }))}
                    className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent" />
                  <select value={invForm.rol} onChange={e => setInvForm(p => ({ ...p, rol: e.target.value }))}
                    className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent">
                    <option value="operativo">Operativo</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="ghost" onClick={() => setInvitando(false)} disabled={savingInv}>Cancelar</Button>
                  <Button variant="primary" onClick={handleCrearInvitacion} disabled={savingInv || !invForm.email}>
                    {savingInv ? 'Generando...' : 'Generar enlace'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-hm-muted mb-2">Compartí este enlace con el usuario. Expira en 7 días.</p>
                <div className="bg-hm-surface2 border border-hm-border rounded-lg p-3 mb-4 break-all text-xs font-mono text-hm-accent">{invLink}</div>
                <div className="flex gap-3 justify-end">
                  <Button variant="ghost" onClick={() => setInvitando(false)}>Cerrar</Button>
                  <Button variant="primary" onClick={() => { navigator.clipboard.writeText(invLink); toast.success('Enlace copiado') }}>
                    COPIAR ENLACE
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal cambio de rol */}
      {editandoRol && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-hm-surface border border-hm-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-semibold text-base mb-1">Cambiar rol</h2>
            <p className="text-sm text-hm-muted mb-4">{editandoRol.nombre_completo}</p>
            <select
              value={nuevoRol}
              onChange={e => setNuevoRol(e.target.value)}
              className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent mb-4"
            >
              <option value="operativo">Operativo</option>
              <option value="supervisor">Supervisor</option>
              <option value="owner">Owner</option>
            </select>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setEditandoRol(null)} disabled={loadingAction}>Cancelar</Button>
              <Button variant="primary" onClick={handleCambiarRol} disabled={loadingAction || nuevoRol === editandoRol.rol}>
                {loadingAction ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal vincular cliente (Portal) */}
      {vinculando && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-hm-surface border border-hm-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-semibold text-base mb-1">Acceso al Portal Cliente</h2>
            <p className="text-sm text-hm-muted mb-4">{vinculando.nombre_completo}</p>
            <p className="text-xs text-hm-muted mb-3">Vinculá este usuario a un cliente para darle acceso al portal. Su rol cambiará a <span className="text-hm-accent font-bold">Cliente</span>.</p>
            <select
              value={clienteSeleccionado}
              onChange={e => setClienteSeleccionado(e.target.value)}
              className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent mb-4"
            >
              <option value="">— Seleccionar cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setVinculando(null)} disabled={loadingAction}>Cancelar</Button>
              <Button variant="primary" onClick={handleVincularCliente} disabled={loadingAction || !clienteSeleccionado}>
                {loadingAction ? 'Guardando...' : 'Vincular y dar acceso'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ModalConfirm
        isOpen={!!confirmDesactivar}
        onClose={() => setConfirmDesactivar(null)}
        onConfirm={handleDesactivar}
        loading={loadingAction}
        title="Desactivar usuario"
        message={`¿Desactivás a "${confirmDesactivar?.nombre_completo}"? No podrá iniciar sesión hasta que un owner lo reactive.`}
        confirmLabel="Desactivar"
        variant="danger"
      />
    </div>
  )
}
