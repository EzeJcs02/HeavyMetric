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
  owner: 'warn',
  supervisor: 'info',
  operativo: 'default',
  cliente: 'accent',
}

const ROL_LABELS = {
  owner: 'Owner / Dirección',
  supervisor: 'Supervisor / Gestión',
  operativo: 'Operativo',
  cliente: 'Cliente',
}

const ROL_DESCRIPCION = {
  owner: 'Acceso total a gerencia, configuración, usuarios y módulos críticos.',
  supervisor: 'Acceso de gestión para operación, administración, ventas o compras.',
  operativo: 'Acceso operativo para tareas asignadas, carga de información y seguimiento.',
  cliente: 'Acceso externo al portal del cliente.',
}

const ROL_OPTIONS = [
  {
    value: 'operativo',
    label: 'Operativo',
    description: 'Técnico, vendedor, administrativo o usuario de carga según el área asignada.',
  },
  {
    value: 'supervisor',
    label: 'Supervisor / Gestión',
    description: 'Responsable de área, encargado, administración, compras, ventas o postventa.',
  },
  {
    value: 'owner',
    label: 'Owner / Dirección',
    description: 'Dueño, socio, gerente general o máxima autoridad de la empresa.',
  },
]

const AREA_OPTIONS = [
  'Dirección',
  'Gerencia',
  'Administración',
  'Compras',
  'Ventas',
  'Postventa',
  'Taller y Servicio',
  'Inventario',
  'Tesorería',
  'Operaciones',
]

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase()
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
  const [invForm, setInvForm] = useState({
    email: '',
    nombre: '',
    rol: 'operativo',
    area: 'Operaciones',
  })
  const [invLink, setInvLink] = useState('')
  const [savingInv, setSavingInv] = useState(false)

  useEffect(() => {
    supabase
      .from('clientes')
      .select('id, razon_social')
      .order('razon_social')
      .then(({ data }) => setClientes(data || []))
  }, [])

  const kpis = {
    total: usuarios.length,
    owners: usuarios.filter((u) => u.rol === 'owner').length,
    gestion: usuarios.filter((u) => u.rol === 'supervisor').length,
    operativos: usuarios.filter((u) => u.rol === 'operativo').length,
    clientes: usuarios.filter((u) => u.rol === 'cliente').length,
  }

  const handleVincularCliente = async () => {
    setLoadingAction(true)

    try {
      const { error: updateError } = await supabase
        .from('perfiles')
        .update({ rol: 'cliente', cliente_id: clienteSeleccionado || null })
        .eq('id', vinculando.id)

      if (updateError) throw updateError

      toast.success('Usuario vinculado como cliente')
      setVinculando(null)
      setClienteSeleccionado('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleCrearInvitacion = async () => {
    if (!invForm.email) {
      toast.error('El email es obligatorio')
      return
    }

    setSavingInv(true)

    try {
      const { data, error: insertError } = await supabase
        .from('invitaciones')
        .insert({
          email: invForm.email,
          nombre: invForm.nombre,
          rol: invForm.rol,
          area: invForm.area,
          organization_id: miPerfil?.organization_id,
          created_by: miPerfil?.id,
        })
        .select('token')
        .single()

      if (insertError) throw insertError

      setInvLink(`${window.location.origin}/setup?token=${data.token}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingInv(false)
    }
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

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
          <h2 className="font-bold mb-2">Error cargando usuarios</h2>
          <p className="font-mono text-sm">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Usuarios y accesos</h1>
          <p className="text-sm text-hm-muted mt-1">
            Gestión jerárquica de usuarios, áreas internas y accesos al portal cliente.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setInvitando(true)
            setInvLink('')
            setInvForm({ email: '', nombre: '', rol: 'operativo', area: 'Operaciones' })
          }}
        >
          + INVITAR
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 border-l-4 border-l-hm-accent">
          <div className="text-2xl font-bold">{kpis.total}</div>
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mt-0.5">
            Total usuarios
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-yellow-500">
          <div className="text-2xl font-bold text-yellow-400">{kpis.owners}</div>
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mt-0.5">
            Dirección
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="text-2xl font-bold text-blue-400">{kpis.gestion}</div>
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mt-0.5">
            Gestión
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-slate-500">
          <div className="text-2xl font-bold">{kpis.operativos}</div>
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mt-0.5">
            Operativos
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="text-2xl font-bold text-purple-400">{kpis.clientes}</div>
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mt-0.5">
            Portal cliente
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-hm-surface2/20">
        <div className="grid gap-3 md:grid-cols-4">
          {ROL_OPTIONS.map((rol) => (
            <div key={rol.value} className="rounded-lg border border-hm-border bg-hm-surface/60 p-3">
              <Badge variant={ROL_VARIANT[rol.value]}>{rol.label}</Badge>
              <p className="mt-2 text-xs leading-relaxed text-hm-muted">{rol.description}</p>
            </div>
          ))}

          <div className="rounded-lg border border-hm-border bg-hm-surface/60 p-3">
            <Badge variant="accent">Cliente</Badge>
            <p className="mt-2 text-xs leading-relaxed text-hm-muted">
              Acceso externo limitado al portal, documentación, trabajos y seguimiento habilitado.
            </p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-hm-border bg-hm-surface2/40">
            <tr>
              <th className="p-4 font-mono text-xs text-hm-muted">USUARIO</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ROL</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ÁREA</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ALCANCE</th>
              <th className="p-4" />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [1, 2, 3].map((row) => (
                <tr key={row} className="border-b border-hm-border">
                  {[1, 2, 3, 4, 5].map((cell) => (
                    <td key={cell} className="p-4">
                      <div className="h-4 bg-hm-surface2 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-hm-muted font-mono text-sm">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              usuarios.map((usuario) => {
                const esYo = usuario.id === miPerfil?.id

                return (
                  <tr
                    key={usuario.id}
                    className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-hm-accent/15 border border-hm-accent/30 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-hm-accent">
                            {initials(usuario.nombre_completo)}
                          </span>
                        </div>

                        <div>
                          <div className="font-medium text-sm">{usuario.nombre_completo || '—'}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {esYo && <span className="text-[10px] font-mono text-hm-accent">Tú</span>}
                            {usuario.email && (
                              <span className="text-[10px] font-mono text-hm-muted">{usuario.email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <Badge variant={ROL_VARIANT[usuario.rol] ?? 'default'}>
                        {ROL_LABELS[usuario.rol] ?? usuario.rol}
                      </Badge>
                    </td>

                    <td className="p-4 text-sm text-hm-muted capitalize">
                      {usuario.area || '—'}
                    </td>

                    <td className="p-4 text-xs text-hm-muted max-w-[260px]">
                      {ROL_DESCRIPCION[usuario.rol] || 'Acceso configurado según permisos de la organización.'}
                    </td>

                    <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      {!esYo && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setVinculando(usuario)
                              setClienteSeleccionado(usuario.cliente_id || '')
                            }}
                            className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-blue-500 hover:text-blue-400 transition-colors"
                          >
                            PORTAL
                          </button>

                          <button
                            onClick={() => {
                              setEditandoRol(usuario)
                              setNuevoRol(usuario.rol)
                            }}
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

      {invitando && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-hm-surface border border-hm-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-semibold text-base mb-1">Invitar usuario</h2>
            <p className="text-sm text-hm-muted mb-4">
              Se generará un enlace de acceso único para sumar un usuario a la organización.
            </p>

            {!invLink ? (
              <>
                <div className="flex flex-col gap-3 mb-4">
                  <input
                    placeholder="Email *"
                    value={invForm.email}
                    onChange={(event) => setInvForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
                  />

                  <input
                    placeholder="Nombre (opcional)"
                    value={invForm.nombre}
                    onChange={(event) => setInvForm((prev) => ({ ...prev, nombre: event.target.value }))}
                    className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
                  />

                  <select
                    value={invForm.rol}
                    onChange={(event) => setInvForm((prev) => ({ ...prev, rol: event.target.value }))}
                    className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
                  >
                    {ROL_OPTIONS.map((rol) => (
                      <option key={rol.value} value={rol.value}>
                        {rol.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={invForm.area}
                    onChange={(event) => setInvForm((prev) => ({ ...prev, area: event.target.value }))}
                    className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
                  >
                    {AREA_OPTIONS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button variant="ghost" onClick={() => setInvitando(false)} disabled={savingInv}>
                    Cancelar
                  </Button>

                  <Button variant="primary" onClick={handleCrearInvitacion} disabled={savingInv || !invForm.email}>
                    {savingInv ? 'Generando...' : 'Generar enlace'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-hm-muted mb-2">
                  Compartí este enlace con el usuario. Expira en 7 días.
                </p>

                <div className="bg-hm-surface2 border border-hm-border rounded-lg p-3 mb-4 break-all text-xs font-mono text-hm-accent">
                  {invLink}
                </div>

                <div className="flex gap-3 justify-end">
                  <Button variant="ghost" onClick={() => setInvitando(false)}>
                    Cerrar
                  </Button>

                  <Button
                    variant="primary"
                    onClick={() => {
                      navigator.clipboard.writeText(invLink)
                      toast.success('Enlace copiado')
                    }}
                  >
                    COPIAR ENLACE
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {editandoRol && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-hm-surface border border-hm-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-semibold text-base mb-1">Cambiar rol</h2>
            <p className="text-sm text-hm-muted mb-4">{editandoRol.nombre_completo}</p>

            <select
              value={nuevoRol}
              onChange={(event) => setNuevoRol(event.target.value)}
              className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent mb-4"
            >
              {ROL_OPTIONS.map((rol) => (
                <option key={rol.value} value={rol.value}>
                  {rol.label}
                </option>
              ))}
            </select>

            <div className="rounded-lg border border-hm-border bg-hm-surface2/30 p-3 mb-4">
              <p className="text-xs leading-relaxed text-hm-muted">
                {ROL_DESCRIPCION[nuevoRol] || 'Acceso configurado según permisos de la organización.'}
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setEditandoRol(null)} disabled={loadingAction}>
                Cancelar
              </Button>

              <Button
                variant="primary"
                onClick={handleCambiarRol}
                disabled={loadingAction || nuevoRol === editandoRol.rol}
              >
                {loadingAction ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {vinculando && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-hm-surface border border-hm-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-semibold text-base mb-1">Acceso al Portal Cliente</h2>
            <p className="text-sm text-hm-muted mb-4">{vinculando.nombre_completo}</p>

            <p className="text-xs text-hm-muted mb-3">
              Vinculá este usuario a un cliente para darle acceso al portal. Su rol cambiará a{' '}
              <span className="text-hm-accent font-bold">Cliente</span>.
            </p>

            <select
              value={clienteSeleccionado}
              onChange={(event) => setClienteSeleccionado(event.target.value)}
              className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent mb-4"
            >
              <option value="">— Seleccionar cliente —</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.razon_social}
                </option>
              ))}
            </select>

            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setVinculando(null)} disabled={loadingAction}>
                Cancelar
              </Button>

              <Button
                variant="primary"
                onClick={handleVincularCliente}
                disabled={loadingAction || !clienteSeleccionado}
              >
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