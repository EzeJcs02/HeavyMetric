import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import ModalConfirm from '../../components/ui/ModalConfirm'
import Pagination from '../../components/ui/Pagination'
import { useLeadsKpis } from '../../hooks/useLeads'

const PER_PAGE = 50

const ESTADOS = ['Nuevo', 'Contactado', 'Interesado', 'Cotizado', 'Negociación', 'Ganado', 'Perdido']

const ESTADO_VARIANT = {
  Nuevo: 'default',
  Contactado: 'info',
  Interesado: 'warn',
  Cotizado: 'info',
  Negociación: 'warn',
  Ganado: 'success',
  Perdido: 'danger',
}

const EMPTY_LEAD = {
  nombre: '',
  empresa: '',
  telefono: '',
  email: '',
  origen: 'Manual',
  rubro: '',
  producto_interes: '',
  mensaje: '',
  estado: 'Nuevo',
  prioridad: 'media',
  proximo_seguimiento: '',
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function leadName(lead) {
  return lead.empresa || lead.nombre || 'Sin nombre'
}

function nextDateLabel(date) {
  if (!date) return 'Sin seguimiento'
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-AR')
}

function estadoVariant(estado) {
  return ESTADO_VARIANT[estado] || 'default'
}

function getAuthScope(perfil) {
  return {
    userId: perfil?.id || null,
    organizationId: perfil?.organization_id || null,
  }
}

function ModalLead({ isOpen, onClose, lead, onConfirm }) {
  const [form, setForm] = useState(EMPTY_LEAD)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (lead) {
      setForm({
        nombre: lead.nombre || '',
        empresa: lead.empresa || '',
        telefono: lead.telefono || '',
        email: lead.email || '',
        origen: lead.origen || 'Manual',
        rubro: lead.rubro || '',
        producto_interes: lead.producto_interes || '',
        mensaje: lead.mensaje || '',
        estado: lead.estado || 'Nuevo',
        prioridad: lead.prioridad || 'media',
        proximo_seguimiento: lead.proximo_seguimiento || '',
      })
    } else if (isOpen) {
      setForm(EMPTY_LEAD)
    }
  }, [lead, isOpen])

  const setF = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.nombre.trim() && !form.empresa.trim()) {
      toast.error('Completá al menos nombre o empresa')
      return
    }

    setSaving(true)

    try {
      await onConfirm(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead ? `Editar lead — ${leadName(lead)}` : 'Nuevo lead'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre de contacto"
            value={form.nombre}
            onChange={(event) => setF('nombre', event.target.value)}
          />

          <Input
            label="Empresa"
            value={form.empresa}
            onChange={(event) => setF('empresa', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Teléfono"
            value={form.telefono}
            onChange={(event) => setF('telefono', event.target.value)}
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => setF('email', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Origen"
            value={form.origen}
            onChange={(event) => setF('origen', event.target.value)}
            placeholder="Meta, Web, WhatsApp, Referido..."
          />

          <Input
            label="Rubro"
            value={form.rubro}
            onChange={(event) => setF('rubro', event.target.value)}
            placeholder="Minería, construcción, agro..."
          />

          <Input
            label="Producto / servicio de interés"
            value={form.producto_interes}
            onChange={(event) => setF('producto_interes', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="label-mono">Estado</label>
            <select
              value={form.estado}
              onChange={(event) => setF('estado', event.target.value)}
              className="select-hm"
            >
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="label-mono">Prioridad</label>
            <select
              value={form.prioridad}
              onChange={(event) => setF('prioridad', event.target.value)}
              className="select-hm"
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <Input
            label="Próximo seguimiento"
            type="date"
            value={form.proximo_seguimiento}
            onChange={(event) => setF('proximo_seguimiento', event.target.value)}
          />
        </div>

        <Input
          label="Notas / mensaje"
          value={form.mensaje}
          onChange={(event) => setF('mensaje', event.target.value)}
          placeholder="Necesidad, contexto, pedido, urgencia o próximos pasos..."
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            CANCELAR
          </Button>

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'GUARDANDO...' : lead ? 'GUARDAR CAMBIOS' : 'CREAR LEAD'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Leads() {
  const { perfil, canEdit } = useAuth()
  const { userId, organizationId } = getAuthScope(perfil)

  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [page, setPage] = useState(1)

  const { leads, totalCount, loading, error, fetchLeads, crearLead, actualizarLead, avanzarEstado, convertirACliente } = useLeads({
    page,
    pageSize: PER_PAGE,
    search: busqueda,
    estado: estadoFiltro,
  })

  const { kpis } = useLeadsKpis()

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [convirtiendo, setConvirtiendo] = useState(null)
  const [savingConvert, setSavingConvert] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [busqueda, estadoFiltro])

  const porEstado = useMemo(() => {
    return ESTADOS.map((estado) => ({
      estado,
      leads: leads.filter((lead) => lead.estado === estado),
    }))
  }, [leads])

  const handleSaveLead = async (form) => {
    try {
      if (editando) {
        await actualizarLead(editando.id, form)
        toast.success('Lead actualizado')
      } else {
        await crearLead(form)
        toast.success('Lead creado')
      }

      setEditando(null)
      setModalOpen(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleUpdateEstado = async (lead, estado) => {
    try {
      await avanzarEstado(lead.id, estado, lead.estado)
      toast.success(`Lead movido a ${estado}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleConvertirCliente = async () => {
    if (!convirtiendo) return

    setSavingConvert(true)

    try {
      await convertirACliente(convirtiendo)
      toast.success('Lead convertido a cliente')
      setConvirtiendo(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingConvert(false)
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
          <h2 className="font-bold mb-2">Error cargando CRM</h2>
          <p className="font-mono text-sm">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b border-hm-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM Comercial</h1>
          <p className="mt-1 text-sm text-hm-muted">
            Leads, oportunidades, seguimiento comercial y conversión a clientes.
          </p>
        </div>

        {canEdit && (
          <Button
            variant="primary"
            onClick={() => {
              setEditando(null)
              setModalOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            NUEVO LEAD
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          ['Total leads', kpis.total, 'Base comercial'],
          ['Abiertos', kpis.abiertos, 'En gestión'],
          ['Cotizados', kpis.cotizados, 'Con propuesta'],
          ['Ganados', kpis.ganados, 'Convertidos'],
          ['Sin seguimiento', kpis.sinSeguimiento, 'Revisar próximos pasos'],
        ].map(([label, value, detail]) => (
          <Card key={label} className="p-4 border-l-4 border-l-hm-accent bg-hm-surface2/30">
            <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">
              {label}
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="mt-1 text-xs text-hm-muted">{detail}</div>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border border-hm-border/50 bg-hm-surface2/20 p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label className="mb-1 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-hm-muted">
              <Search className="h-3.5 w-3.5" />
              Buscar
            </label>

            <Input
              placeholder="Buscar por nombre, empresa, teléfono, email, rubro, interés, estado o responsable..."
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {['todos', ...ESTADOS].map((estado) => (
              <button
                key={estado}
                onClick={() => setEstadoFiltro(estado)}
                className={`rounded border px-3 py-2 text-[10px] font-bold tracking-widest transition-all ${
                  estadoFiltro === estado
                    ? 'bg-hm-accent border-hm-accent text-white'
                    : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'
                }`}
              >
                {estado === 'todos' ? 'TODOS' : estado.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="overflow-x-auto pb-2">
        <div className="grid min-w-[1180px] grid-cols-7 gap-3">
          {porEstado.map((columna) => (
            <div key={columna.estado} className="rounded-xl border border-hm-border bg-hm-surface/70">
              <div className="flex items-center justify-between border-b border-hm-border px-3 py-3">
                <div>
                  <h2 className="text-sm font-bold">{columna.estado}</h2>
                  <p className="text-[10px] font-mono text-hm-muted">
                    {columna.leads.length} registros
                  </p>
                </div>

                <Badge variant={estadoVariant(columna.estado)}>
                  {columna.leads.length}
                </Badge>
              </div>

              <div className="flex min-h-[420px] flex-col gap-3 p-3">
                {loading ? (
                  [1, 2, 3].map((item) => (
                    <div key={item} className="h-28 rounded-lg bg-hm-surface2 animate-pulse" />
                  ))
                ) : columna.leads.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-hm-border p-4 text-center text-xs text-hm-muted">
                    Sin leads.
                  </div>
                ) : (
                  columna.leads.map((lead) => (
                    <Card key={lead.id} className="group p-3 bg-hm-surface2/30 hover:border-hm-accent/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold">{leadName(lead)}</h3>
                          <p className="mt-0.5 truncate text-xs text-hm-muted">
                            {lead.nombre && lead.empresa ? lead.nombre : lead.producto_interes || 'Sin detalle'}
                          </p>
                        </div>

                        <Badge variant={lead.prioridad === 'alta' ? 'danger' : lead.prioridad === 'baja' ? 'default' : 'warn'}>
                          {(lead.prioridad || 'media').toUpperCase()}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-col gap-1 text-xs text-hm-muted">
                        {lead.telefono && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            {lead.telefono}
                          </div>
                        )}

                        {lead.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {nextDateLabel(lead.proximo_seguimiento)}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {lead.telefono && (
                          <a
                            href={`https://wa.me/${String(lead.telefono).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border border-hm-border px-2 py-1 text-[10px] font-mono text-hm-muted hover:border-green-500 hover:text-green-400"
                          >
                            WPP
                          </a>
                        )}

                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="rounded border border-hm-border px-2 py-1 text-[10px] font-mono text-hm-muted hover:border-blue-500 hover:text-blue-400"
                          >
                            EMAIL
                          </a>
                        )}

                        <Link
                          to="/app/cotizaciones"
                          className="rounded border border-hm-border px-2 py-1 text-[10px] font-mono text-hm-muted hover:border-hm-accent hover:text-hm-accent"
                        >
                          COTIZAR
                        </Link>

                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditando(lead)
                              setModalOpen(true)
                            }}
                            className="rounded border border-hm-border px-2 py-1 text-[10px] font-mono text-hm-muted hover:border-hm-accent hover:text-hm-accent"
                          >
                            EDITAR
                          </button>
                        )}

                        {canEdit && !['Ganado', 'Perdido'].includes(lead.estado) && (
                          <button
                            onClick={() => setConvirtiendo(lead)}
                            className="rounded border border-green-500/40 px-2 py-1 text-[10px] font-mono text-green-400 hover:bg-green-500/10"
                          >
                            CLIENTE
                          </button>
                        )}
                      </div>

                      {canEdit && (
                        <div className="mt-3 flex items-center gap-1">
                          <select
                            value={lead.estado}
                            onChange={(event) => handleUpdateEstado(lead, event.target.value)}
                            className="w-full bg-hm-surface border border-hm-border rounded px-2 py-1.5 text-xs text-hm-text focus:outline-none focus:border-hm-accent"
                          >
                            {ESTADOS.map((estado) => (
                              <option key={estado} value={estado}>
                                {estado}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Pagination total={totalCount} page={page} perPage={PER_PAGE} onPageChange={setPage} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4 bg-hm-surface2/20">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-hm-border p-2 text-hm-muted">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Seguimiento comercial</h3>
              <p className="mt-1 text-xs leading-relaxed text-hm-muted">
                Registrá próximos contactos y evitá que oportunidades queden sin respuesta.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-hm-surface2/20">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-hm-border p-2 text-hm-muted">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Cotización rápida</h3>
              <p className="mt-1 text-xs leading-relaxed text-hm-muted">
                Usá el acceso a Cotizaciones para continuar el flujo comercial sin duplicar datos.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-hm-surface2/20">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-hm-border p-2 text-hm-muted">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Conversión a cliente</h3>
              <p className="mt-1 text-xs leading-relaxed text-hm-muted">
                Cuando el lead avanza, convertí la oportunidad en cliente activo.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <ModalLead
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditando(null)
        }}
        lead={editando}
        onConfirm={handleSaveLead}
      />

      <ModalConfirm
        isOpen={!!convirtiendo}
        onClose={() => setConvirtiendo(null)}
        onConfirm={handleConvertirCliente}
        loading={savingConvert}
        title="Convertir lead a cliente"
        message={`¿Confirmás convertir "${leadName(convirtiendo)}" en cliente activo? Se copiarán sus datos comerciales principales.`}
        confirmLabel="Convertir"
        variant="primary"
      />
    </div>
  )
}