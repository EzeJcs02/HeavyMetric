import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { isValidCuit, formatCuit } from '../../lib/cuitValidator'
import * as XLSX from 'xlsx'
import { useClientes } from '../../hooks/useClientes'
import { useAuth } from '../../context/AuthContext'
import { useAIInsights } from '../../hooks/useAIInsights'
import { lookupCuit } from '../../lib/integrations/arca'
import { isIntegrationEnabled } from '../../config/integrations'
import { SilentBadge } from '../../components/ai/SilentBadge'
import Modal from '../../components/ui/Modal'
import ModalConfirm from '../../components/ui/ModalConfirm'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import ClienteDetalle from '../../components/modulos/clientes/ClienteDetalle'

const PER_PAGE = 10

const RUBROS = ['Mineria', 'Agro', 'Vial', 'Construccion', 'Industrial', 'Municipio']

const EMPTY = {
  razon_social: '',
  nombre_comercial: '',
  cuit: '',
  condicion_iva: 'Responsable Inscripto',
  email: '',
  telefono: '',
  direccion: '',
  contacto_nombre: '',
  rubro: '',
  propension_compra: 'B',
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
      rubro:            cliente.rubro || '',
      propension_compra: cliente.propension_compra || 'B',
    } : EMPTY)
  }, [cliente, isOpen])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.cuit && !isValidCuit(form.cuit)) {
      toast.error('El CUIT ingresado no es válido')
      return
    }
    setLoading(true)
    try {
      await onConfirm(form)
    } finally {
      setLoading(false)
    }
  }

  const handleArcaLookup = async () => {
    if (!form.cuit) {
      toast.error('Ingrese un CUIT primero')
      return
    }
    setLoading(true)
    try {
      const res = await lookupCuit(form.cuit)
      if (res.success && res.data) {
        setForm(prev => ({
          ...prev,
          razon_social: res.data.razonSocial || prev.razon_social,
          condicion_iva: res.data.condicionIVA || prev.condicion_iva
        }))
        toast.success('Datos obtenidos de ARCA')
      } else {
        toast.error(res.error || 'Error al consultar ARCA')
      }
    } catch (err) {
      toast.error('Error de conexión con ARCA')
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
          <div className="flex flex-col gap-1">
            <Input label="CUIT" value={form.cuit} onChange={e => set('cuit', formatCuit(e.target.value))} placeholder="30-12345678-9" />
            <button
              type="button"
              onClick={handleArcaLookup}
              className="text-[10px] font-mono text-hm-accent hover:underline text-left uppercase tracking-widest mt-1"
            >
              Obtener datos de ARCA
            </button>
          </div>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="label-mono">Rubro</label>
            <select value={form.rubro} onChange={e => set('rubro', e.target.value)} className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors">
              <option value="">— Sin especificar —</option>
              {RUBROS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="label-mono">Propensión de compra</label>
            <select value={form.propension_compra} onChange={e => set('propension_compra', e.target.value)} className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors">
              <option value="A">A — Alta prioridad</option>
              <option value="B">B — Media prioridad</option>
              <option value="C">C — Baja prioridad</option>
            </select>
          </div>
        </div>

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
  const { clienteRisk } = useAIInsights()
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState(null)
  const [clienteAArchivar, setClienteAArchivar] = useState(null)
  const [loadingArchive, setLoadingArchive] = useState(false)
  const [page, setPage] = useState(1)
  const [detalleCliente, setDetalleCliente] = useState(null)

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

  const handleExportExcel = () => {
    if (!clientesFiltrados.length) { toast.error('No hay datos para exportar'); return }
    const rows = clientesFiltrados.map(c => ({
      'RAZÓN SOCIAL':  c.razon_social,
      'NOMBRE COMERCIAL': c.nombre_comercial || '—',
      CUIT:            c.cuit || '—',
      'CONDICIÓN IVA': c.condicion_iva || '—',
      RUBRO:           c.rubro || '—',
      PROPENSIÓN:      c.propension_compra || '—',
      EMAIL:           c.email || '—',
      TELÉFONO:        c.telefono || '—',
      CONTACTO:        c.contacto_nombre || '—',
      DIRECCIÓN:       c.direccion || '—',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, `Clientes_${new Date().toISOString().slice(0,10)}.xlsx`)
    toast.success('Excel generado')
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel}>EXPORTAR EXCEL</Button>
          <Button variant="primary" onClick={() => { setEditingCliente(null); setIsModalOpen(true) }}>
            + NUEVO CLIENTE
          </Button>
        </div>
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
              <th className="p-4 font-mono text-xs text-hm-muted">RUBRO</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-center">PROP.</th>
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
                  {[1, 2, 3, 4, 5, 6, 7].map(j => (
                    <td key={j} className="p-4">
                      <div className="h-4 bg-hm-surface2 rounded animate-pulse" />
                    </td>
                  ))}
                  <td className="p-4" />
                </tr>
              ))
            ) : clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-8 text-center text-hm-muted font-mono text-sm">
                  No se encontraron clientes.
                </td>
              </tr>
            ) : (
              clientesPaginados.map(c => (
                <tr key={c.id} onClick={() => setDetalleCliente(c)} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors group cursor-pointer">
                  <td className="p-4">
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {c.razon_social}
                      {(() => { const r = clienteRisk(c.id); return r ? <SilentBadge type={r.type} message={r.message} iconOnly /> : null })()}
                    </div>
                    {c.nombre_comercial && c.nombre_comercial !== c.razon_social && (
                      <div className="text-xs text-hm-muted">{c.nombre_comercial}</div>
                    )}
                  </td>
                  <td className="p-4 font-mono text-sm text-hm-muted">{c.cuit || '—'}</td>
                  <td className="p-4 text-sm text-hm-muted">{c.rubro || '—'}</td>
                  <td className="p-4 text-center">
                    {c.propension_compra ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-black ${
                        c.propension_compra === 'A' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                        c.propension_compra === 'B' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                        'bg-hm-surface2 text-hm-muted border-hm-border'
                      }`}>{c.propension_compra}</span>
                    ) : <span className="text-hm-muted/50">—</span>}
                  </td>
                  <td className="p-4 text-sm text-hm-muted">{c.email || '—'}</td>
                  <td className="p-4 font-mono text-sm text-hm-muted">{c.telefono || '—'}</td>
                  <td className="p-4 text-sm text-hm-muted">{c.contacto_nombre || '—'}</td>
                  <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); setEditingCliente(c); setIsModalOpen(true) }}
                        className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-hm-accent hover:text-hm-accent transition-colors"
                      >
                        EDITAR
                      </button>
                      {isOwner && (
                        <button
                          onClick={e => { e.stopPropagation(); setClienteAArchivar(c) }}
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

      <ClienteDetalle
        cliente={detalleCliente}
        isOpen={!!detalleCliente}
        onClose={() => setDetalleCliente(null)}
        onEdit={(c) => { setDetalleCliente(null); setEditingCliente(c); setIsModalOpen(true) }}
      />
    </div>
  )
}
