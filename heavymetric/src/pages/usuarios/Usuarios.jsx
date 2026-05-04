import { useState } from 'react'
import { toast } from 'sonner'
import { useUsuarios } from '../../hooks/useUsuarios'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ModalConfirm from '../../components/ui/ModalConfirm'

const ROL_VARIANT = {
  owner:       'warn',
  supervisor:  'info',
  operativo:   'default',
}

const ROL_LABELS = {
  owner:      'Owner',
  supervisor: 'Supervisor',
  operativo:  'Operativo',
}

export default function Usuarios() {
  const { usuarios, loading, error, updateRol, desactivarUsuario } = useUsuarios()
  const { perfil: miPerfil } = useAuth()
  const [editandoRol, setEditandoRol] = useState(null)
  const [nuevoRol, setNuevoRol] = useState('')
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)
  const [loadingAction, setLoadingAction] = useState(false)

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
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-hm-border">
            <tr>
              <th className="p-4 font-mono text-xs text-hm-muted">NOMBRE</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ROL</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ÁREA</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ESTADO</th>
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
                    <td className="p-4">
                      <Badge variant={u.activo !== false ? 'ok' : 'danger'}>
                        {u.activo !== false ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      {!esYo && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditandoRol(u); setNuevoRol(u.rol) }}
                            className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-hm-accent hover:text-hm-accent transition-colors"
                          >
                            ROL
                          </button>
                          {u.activo !== false && (
                            <button
                              onClick={() => setConfirmDesactivar(u)}
                              className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-red-500 hover:text-red-400 transition-colors"
                            >
                              DESACTIVAR
                            </button>
                          )}
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
