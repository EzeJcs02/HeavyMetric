import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { useClientes } from '../../hooks/useClientes'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/ui/Modal'
import ModalConfirm from '../../components/ui/ModalConfirm'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'

const PER_PAGE = 10

const EMPTY = {
  razon_social: '',
  nombre_comercial: '',
  cuit: '',
  condicion_iva: 'Responsable Inscripto',
  email: '',
  telefono: '',
  direccion: '',
  contacto_nombre: '',
}

function ModalCliente({ isOpen, onClose, cliente, onConfirm }) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(cliente ? {
      razon_social:     cliente.razon_social || '',
      nombre_comercial: cliente.nombre_comercial || '',
      cuit:             cliente.cuit || '',
      condicion_iva:    cliente.condicion_iva || 'Responsable Inscripto',
      email:            cliente.email || '',
      telefono:         cliente.telefono || '',
      direccion:        cliente.direccion || '',
      contacto_nombre:  cliente.contacto_nombre || '',
    } : EMPTY)
  }, [cliente, isOpen])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm(form)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={cliente ? `Editar — ${cliente.razon_social}` : 'Nuevo Cliente'} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Razón Social *" value={form.razon_social} onChange={e => set('razon_social', e.target.value)} required />
          <Input label="Nombre Comercial" value={form.nombre_comercial} onChange={e => set('nombre_comercial', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="CUIT" value={form.cuit} onChange={e => set('cuit', e.target.value)} placeholder="30-12345678-9" />
          <div className="flex flex-col gap-1">
            <label className="label-mono">Condición IVA</label>
            <select
              value={form.condicion_iva}
              onChange={e => set('condicion_iva', e.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors"
            >
              <option>Responsable Inscripto</option>
              <option>Monotributista</option>
              <option>Exento</option>
              <option>Consumidor Final</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          <Input label="Teléfono" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
        </div>

        <Input label="Dirección" value={form.direccion} onChange={e => set('direccion', e.target.value)} />
        <Input label="Nombre de Contacto" value={form.contacto_nombre} onChange={e => set('contacto_nombre', e.target.value)} />

        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>CANCELAR</Button>
          <Button type="submit" variant="primary" disabled={loading || !form.razon_social}>
            {loading ? 'GUARDANDO...' : cliente ? 'GUARDAR CAMBIOS' : 'CREAR CLIENTE'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Clientes() {
  const { clientes, loading, error, createCliente, updateCliente, archiveCliente } = useClientes()
  const { isOwner } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState(null)
  const [clienteAArchivar, setClienteAArchivar] = useState(null)
  const [loadingArchive, setLoadingArchive] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [searchQuery])

  const clientesFiltrados = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return clientes.filter(c =>
      c.razon_social.toLowerCase().includes(q) ||
      (c.nombre_comercial || '').toLowerCase().includes(q) ||
      (c.cuit || '').includes(q)
    )
  }, [clientes, searchQuery])

  const clientesPaginados = useMemo(
    () => clientesFiltrados.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [clientesFiltrados, page]
  )

  const handleArchive = async () => {
    setLoadingArchive(true)
    try {
      await archiveCliente(clienteAArchivar.id)
      toast.success(`${clienteAArchivar.razon_social} archivado correctamente`)
      setClienteAArchivar(null)
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoadingArchive(false)
    }
  }

  const handleConfirm = async (payload) => {
    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, payload)
        toast.success('Cliente actualizado')
      } else {
        await createCliente(payload)
        toast.success('Cliente creado correctamente')
      }
      setIsModalOpen(false)
      setEditingCliente(null)
    } catch (err) {
      toast.error('Error: ' + err.message)
      throw err
    }
  }

  if (error) return (
    <div className="p-6">
      <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
        <h2 className="font-bold mb-2">Error cargando clientes</h2>
        <p className="font-mono text-sm">{error}</p>
      </Card>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-hm-muted mt-1">{clientes.length} clientes activos registrados</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingCliente(null); setIsModalOpen(true) }}>
          + NUEVO CLIENTE
        </Button>
      </div>

      <div className="bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50">
        <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">
          Buscar por razón social, nombre o CUIT
        </label>
        <Input
          type="text"
          placeholder="Escriba para filtrar..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-hm-surface2/50 border-b border-hm-border">
            <tr>
              <th className="p-4 font-mono text-xs text-hm-muted">RAZÓN SOCIAL</th>
              <th className="p-4 font-mono text-xs text-hm-muted">CUIT</th>
              <th className="p-4 font-mono text-xs text-hm-muted">COND. IVA</th>
              <th className="p-4 font-mono text-xs text-hm-muted">EMAIL</th>
              <th className="p-4 font-mono text-xs text-hm-muted">TELÉFONO</th>
              <th className="p-4 font-mono text-xs text-hm-muted">CONTACTO</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <tr key={i} className="border-b border-hm-border">
                  {[1, 2, 3, 4, 5, 6].map(j => (
                    <td key={j} className="p-4">
                      <div className="h-4 bg-hm-surface2 rounded animate-pulse" />
                    </td>
                  ))}
                  <td className="p-4" />
                </tr>
              ))
            ) : clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-hm-muted font-mono text-sm">
                  No se encontraron clientes.
                </td>
              </tr>
            ) : (
              clientesPaginados.map(c => (
                <tr key={c.id} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors group">
                  <td className="p-4">
                    <div className="font-medium text-sm">{c.razon_social}</div>
                    {c.nombre_comercial && c.nombre_comercial !== c.razon_social && (
                      <div className="text-xs text-hm-muted">{c.nombre_comercial}</div>
                    )}
                  </td>
                  <td className="p-4 font-mono text-sm text-hm-muted">{c.cuit || '—'}</td>
                  <td className="p-4">
                    <Badge variant={c.condicion_iva === 'Responsable Inscripto' ? 'info' : 'default'}>
                      {c.condicion_iva}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-hm-muted">{c.email || '—'}</td>
                  <td className="p-4 font-mono text-sm text-hm-muted">{c.telefono || '—'}</td>
                  <td className="p-4 text-sm text-hm-muted">{c.contacto_nombre || '—'}</td>
                  <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditingCliente(c); setIsModalOpen(true) }}
                        className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-hm-accent hover:text-hm-accent transition-colors"
                      >
                        EDITAR
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => setClienteAArchivar(c)}
                          className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-red-500 hover:text-red-400 transition-colors"
                        >
                          ARCHIVAR
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination total={clientesFiltrados.length} page={page} perPage={PER_PAGE} onPageChange={setPage} />
      </Card>

      <ModalCliente
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingCliente(null) }}
        cliente={editingCliente}
        onConfirm={handleConfirm}
      />

      <ModalConfirm
        isOpen={!!clienteAArchivar}
        onClose={() => setClienteAArchivar(null)}
        onConfirm={handleArchive}
        loading={loadingArchive}
        title="Archivar cliente"
        message={`¿Archivás a "${clienteAArchivar?.razon_social}"? Dejará de aparecer en la lista activa pero sus datos históricos se conservan.`}
        confirmLabel="Archivar"
        variant="danger"
      />
    </div>
  )
}
