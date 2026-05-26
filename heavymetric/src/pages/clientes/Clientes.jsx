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
  const arcaEnabled = isIntegrationEnabled('arca')

  useEffect(() => {
    setForm(
      cliente
        ? {
            razon_social: cliente.razon_social || '',
            nombre_comercial: cliente.nombre_comercial || '',
            cuit: cliente.cuit || '',
            condicion_iva: cliente.condicion_iva || 'Responsable Inscripto',
            email: cliente.email || '',
            telefono: cliente.telefono || '',
            direccion: cliente.direccion || '',
            contacto_nombre: cliente.contacto_nombre || '',
            rubro: cliente.rubro || '',
            propension_compra: cliente.propension_compra || 'B',
          }
        : EMPTY
    )
  }, [cliente, isOpen])

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

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
    if (!arcaEnabled) {
      toast.error('La integración con ARCA no está activa')
      return
    }

    if (!form.cuit) {
      toast.error('Ingrese un CUIT primero')
      return
    }

    if (!isValidCuit(form.cuit)) {
      toast.error('El CUIT ingresado no es válido')
      return
    }

    setLoading(true)

    try {
      const res = await lookupCuit(form.cuit)

      if (res.success && res.data) {
        setForm((prev) => ({
          ...prev,
          razon_social: res.data.razonSocial || prev.razon_social,
          condicion_iva: res.data.condicionIVA || prev.condicion_iva,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cliente ? `Editar — ${cliente.razon_social || 'Cliente'}` : 'Nuevo Cliente'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Razón Social *"
            value={form.razon_social}
            onChange={(event) => set('razon_social', event.target.value)}
            required
          />

          <Input
            label="Nombre Comercial"
            value={form.nombre_comercial}
            onChange={(event) => set('nombre_comercial', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Input
              label="CUIT"
              value={form.cuit}
              onChange={(event) => set('cuit', formatCuit(event.target.value))}
              placeholder="30-12345678-9"
            />

            {arcaEnabled && (
              <button
                type="button"
                onClick={handleArcaLookup}
                disabled={loading}
                className="text-[10px] font-mono text-hm-accent hover:underline text-left uppercase tracking-widest mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Obtener datos de ARCA
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="label-mono">Condición IVA</label>
            <select
              value={form.condicion_iva}
              onChange={(event) => set('condicion_iva', event.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors"
            >
              <option>Responsable Inscripto</option>
              <option>Monotributista</option>
              <option>Exento</option>
              <option>Consumidor Final</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => set('email', event.target.value)}
          />

          <Input
            label="Teléfono"
            value={form.telefono}
            onChange={(event) => set('telefono', event.target.value)}
          />
        </div>

        <Input
          label="Dirección"
          value={form.direccion}
          onChange={(event) => set('direccion', event.target.value)}
        />

        <Input
          label="Nombre de Contacto"
          value={form.contacto_nombre}
          onChange={(event) => set('contacto_nombre', event.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="label-mono">Rubro</label>
            <select
              value={form.rubro}
              onChange={(event) => set('rubro', event.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors"
            >
              <option value="">— Sin especificar —</option>
              {RUBROS.map((rubro) => (
                <option key={rubro}>{rubro}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="label-mono">Propensión de compra</label>
            <select
              value={form.propension_compra}
              onChange={(event) => set('propension_compra', event.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors"
            >
              <option value="A">A — Alta prioridad</option>
              <option value="B">B — Media prioridad</option>
              <option value="C">C — Baja prioridad</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            CANCELAR
          </Button>

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

  const clientesBase = Array.isArray(clientes) ? clientes : []

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const clientesFiltrados = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return clientesBase

    return clientesBase.filter((cliente) => {
      const razonSocial = cliente.razon_social || ''
      const nombreComercial = cliente.nombre_comercial || ''
      const cuit = cliente.cuit || ''

      return (
        razonSocial.toLowerCase().includes(query) ||
        nombreComercial.toLowerCase().includes(query) ||
        cuit.includes(query)
      )
    })
  }, [clientesBase, searchQuery])

  const clientesPaginados = useMemo(
    () => clientesFiltrados.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [clientesFiltrados, page]
  )

  const handleArchive = async () => {
    if (!clienteAArchivar?.id) return

    setLoadingArchive(true)

    try {
      await archiveCliente(clienteAArchivar.id)
      toast.success(`${clienteAArchivar.razon_social || 'Cliente'} archivado correctamente`)
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
    if (!clientesFiltrados.length) {
      toast.error('No hay datos para exportar')
      return
    }

    const rows = clientesFiltrados.map((cliente) => ({
      'RAZÓN SOCIAL': cliente.razon_social || '—',
      'NOMBRE COMERCIAL': cliente.nombre_comercial || '—',
      CUIT: cliente.cuit || '—',
      'CONDICIÓN IVA': cliente.condicion_iva || '—',
      RUBRO: cliente.rubro || '—',
      PROPENSIÓN: cliente.propension_compra || '—',
      EMAIL: cliente.email || '—',
      TELÉFONO: cliente.telefono || '—',
      CONTACTO: cliente.contacto_nombre || '—',
      DIRECCIÓN: cliente.direccion || '—',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, `Clientes_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Excel generado')
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
          <h2 className="font-bold mb-2">Error cargando clientes</h2>
          <p className="font-mono text-sm">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b border-hm-border pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-hm-muted mt-1">{clientesBase.length} clientes activos registrados</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleExportExcel}>
            EXPORTAR EXCEL
          </Button>

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
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-hm-surface2/50 border-b border-hm-border">
              <tr>
                <th className="p-4 font-mono text-xs text-hm-muted">RAZÓN SOCIAL</th>
                <th className="p-4 font-mono text-xs text-hm-muted">CUIT</th>
                <th className="p-4 font-mono text-xs text-hm-muted">RUBRO</th>
                <th className="p-4 font-mono text-xs text-hm-muted text-center">PROP.</th>
                <th className="p-4 font-mono text-xs text-hm-muted">EMAIL</th>
                <th className="p-4 font-mono text-xs text-hm-muted">TELÉFONO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">CONTACTO</th>
                <th className="p-4" />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                [1, 2, 3, 4].map((item) => (
                  <tr key={item} className="border-b border-hm-border">
                    {[1, 2, 3, 4, 5, 6, 7].map((cell) => (
                      <td key={cell} className="p-4">
                        <div className="h-4 bg-hm-surface2 rounded animate-pulse" />
                      </td>
                    ))}
                    <td className="p-4" />
                  </tr>
                ))
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-hm-muted font-mono text-sm">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                clientesPaginados.map((cliente) => {
                  const risk = clienteRisk(cliente.id)

                  return (
                    <tr
                      key={cliente.id}
                      onClick={() => setDetalleCliente(cliente)}
                      className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors group cursor-pointer"
                    >
                      <td className="p-4">
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          {cliente.razon_social || 'Sin razón social'}
                          {risk ? <SilentBadge type={risk.type} message={risk.message} iconOnly /> : null}
                        </div>

                        {cliente.nombre_comercial && cliente.nombre_comercial !== cliente.razon_social && (
                          <div className="text-xs text-hm-muted">{cliente.nombre_comercial}</div>
                        )}
                      </td>

                      <td className="p-4 font-mono text-sm text-hm-muted">{cliente.cuit || '—'}</td>
                      <td className="p-4 text-sm text-hm-muted">{cliente.rubro || '—'}</td>

                      <td className="p-4 text-center">
                        {cliente.propension_compra ? (
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-black ${
                              cliente.propension_compra === 'A'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                : cliente.propension_compra === 'B'
                                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                                  : 'bg-hm-surface2 text-hm-muted border-hm-border'
                            }`}
                          >
                            {cliente.propension_compra}
                          </span>
                        ) : (
                          <span className="text-hm-muted/50">—</span>
                        )}
                      </td>

                      <td className="p-4 text-sm text-hm-muted">{cliente.email || '—'}</td>
                      <td className="p-4 font-mono text-sm text-hm-muted">{cliente.telefono || '—'}</td>
                      <td className="p-4 text-sm text-hm-muted">{cliente.contacto_nombre || '—'}</td>

                      <td className="p-4 text-right opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              setEditingCliente(cliente)
                              setIsModalOpen(true)
                            }}
                            className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-hm-accent hover:text-hm-accent transition-colors"
                          >
                            EDITAR
                          </button>

                          {isOwner && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation()
                                setClienteAArchivar(cliente)
                              }}
                              className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-red-500 hover:text-red-400 transition-colors"
                            >
                              ARCHIVAR
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          total={clientesFiltrados.length}
          page={page}
          perPage={PER_PAGE}
          onPageChange={setPage}
        />
      </Card>

      <ModalCliente
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingCliente(null)
        }}
        cliente={editingCliente}
        onConfirm={handleConfirm}
      />

      <ModalConfirm
        isOpen={!!clienteAArchivar}
        onClose={() => setClienteAArchivar(null)}
        onConfirm={handleArchive}
        loading={loadingArchive}
        title="Archivar cliente"
        message={`¿Archivás a "${clienteAArchivar?.razon_social || 'este cliente'}"? Dejará de aparecer en la lista activa pero sus datos históricos se conservan.`}
        confirmLabel="Archivar"
        variant="danger"
      />

      <ClienteDetalle
        cliente={detalleCliente}
        isOpen={!!detalleCliente}
        onClose={() => setDetalleCliente(null)}
        onEdit={(cliente) => {
          setDetalleCliente(null)
          setEditingCliente(cliente)
          setIsModalOpen(true)
        }}
      />
    </div>
  )
}