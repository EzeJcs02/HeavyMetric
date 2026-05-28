import { useEffect, useMemo, useState } from 'react'
import Button from '../../components/ui/Button'
import { useFinanzas } from '../../hooks/useFinanzas'
import { syncEcheqs } from '../../lib/integrations/bancos'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FileText,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  createPlan,
  getPlanes,
  getCuotas,
  updateEstadoCuota,
} from '../../services/tesoreriaService'

const FORMAS = [
  'Contado',
  'Transferencia',
  'Tarjeta crédito',
  'Tarjeta débito',
  'Cheque físico',
  'ECHEQ',
]

const BANCOS = [
  { id: 1, nombre: 'Banco Nación', cuenta: 'CC · ****4821', saldo: 3840000, moneda: 'ARS' },
  { id: 2, nombre: 'BBVA Argentina', cuenta: 'CC · ****7732', saldo: 2180300, moneda: 'ARS' },
  { id: 3, nombre: 'ICBC', cuenta: 'CA · ****2290', saldo: 4200, moneda: 'USD' },
  { id: 4, nombre: 'Caja chica', cuenta: 'Efectivo · Sucursal', saldo: 400000, moneda: 'ARS' },
]

const MOCK_PLANES_INICIALES = [
  {
    id: 'plan-demo-001',
    tipo: 'cobro',
    tercero: 'DUX',
    cuit: '',
    concepto: 'Excavadora LOVOL FR60F',
    importeTotal: 56770336.3,
    moneda: 'ARS',
    cuotas: 10,
    fechaInicio: '2026-01-26',
    frecuencia: 'mensual',
    forma: 'ECHEQ',
    banco: 'Banco Nación',
    referencia: 'Venta maquinaria',
    estado: 'programado',
  },
  {
    id: 'plan-demo-002',
    tipo: 'pago',
    tercero: 'Turbodisel S.A.',
    cuit: '',
    concepto: 'Retro pala LOVOL FB878M',
    importeTotal: 74424526.3,
    moneda: 'ARS',
    cuotas: 12,
    fechaInicio: '2026-01-15',
    frecuencia: 'mensual',
    forma: 'ECHEQ',
    banco: 'BBVA Argentina',
    referencia: 'Compra proveedor',
    estado: 'programado',
  },
]

const MOCK_ECHEQS = [
  {
    id: 1,
    tipo: 'cobro',
    tercero: 'Minera Río Grande SA',
    numero: 'CH-2026-00811',
    importe: 820000,
    moneda: 'ARS',
    vencimiento: '2026-06-05',
    estado: 'en cartera',
  },
  {
    id: 2,
    tipo: 'pago',
    tercero: 'G&G Motors SRL',
    numero: 'CH-2026-00834',
    importe: 4211707.5,
    moneda: 'ARS',
    vencimiento: '2026-06-11',
    estado: 'emitido',
  },
]

function addPeriod(dateString, index, frecuencia) {
  const date = new Date(`${dateString}T00:00:00`)

  if (frecuencia === 'semanal') date.setDate(date.getDate() + index * 7)
  if (frecuencia === 'quincenal') date.setDate(date.getDate() + index * 15)
  if (frecuencia === 'mensual') date.setMonth(date.getMonth() + index)

  return date.toISOString().slice(0, 10)
}

function formatCurrency(value, moneda = 'ARS') {
  return new Intl.NumberFormat(moneda === 'USD' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return 'Sin fecha'

  return new Date(`${value}T00:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function daysTo(value) {
  if (!value) return 999

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(`${value}T00:00:00`)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

function normalizePlan(plan) {
  return {
    id: plan.id,
    tipo: plan.tipo,
    tercero: plan.tercero,
    cuit: plan.cuit || '',
    concepto: plan.concepto,
    importeTotal: Number(plan.importeTotal ?? plan.importe_total ?? 0),
    moneda: plan.moneda || 'ARS',
    cuotas: Number(plan.cuotas || 1),
    fechaInicio: plan.fechaInicio || plan.fecha_inicio,
    frecuencia: plan.frecuencia || 'mensual',
    forma: plan.forma || 'A definir',
    banco: plan.banco || 'Sin asignar',
    referencia: plan.referencia || '',
    observaciones: plan.observaciones || '',
    estado: plan.estado || 'programado',
  }
}

function generateCuotas(plan) {
  const normalized = normalizePlan(plan)
  const importeCuota = Number(normalized.importeTotal || 0) / Number(normalized.cuotas || 1)

  return Array.from({ length: Number(normalized.cuotas || 1) }, (_, index) => {
    const vencimiento = addPeriod(normalized.fechaInicio, index, normalized.frecuencia)

    return {
      id: `${normalized.id}-${index + 1}`,
      planId: normalized.id,
      tipo: normalized.tipo,
      tercero: normalized.tercero,
      concepto: normalized.concepto,
      cuota: `${index + 1}/${normalized.cuotas}`,
      importe: importeCuota,
      moneda: normalized.moneda,
      vencimiento,
      forma: normalized.forma,
      banco: normalized.banco,
      referencia: normalized.referencia,
      estado: daysTo(vencimiento) < 0 ? 'vencido' : 'pendiente',
      origen: 'BASE PREPARADA',
    }
  })
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    cobro: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    pago: 'border-red-400/20 bg-red-400/10 text-red-300',
    echeq: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
    cuota: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    ok: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    warning: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    danger: 'border-red-400/20 bg-red-400/10 text-red-300',
    iso: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
    arca: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    neutral: 'border-white/[0.06] bg-white/[0.03] text-neutral-400',
  }

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${tones[tone]}`}>
      {children}
    </span>
  )
}

function Panel({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-white/[0.06] bg-[#0d0f14] ${className}`}>
      {children}
    </section>
  )
}

export default function Tesoreria() {
  const finanzas = useFinanzas() || {}
  const transacciones = finanzas.transacciones || []
  const compras = finanzas.compras || []

  const [tab, setTab] = useState('resumen')
  const [syncing, setSyncing] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [filterTipo, setFilterTipo] = useState('todos')
  const [planes, setPlanes] = useState([])
  const [cuotasDb, setCuotasDb] = useState([])
  const [loadingPlanes, setLoadingPlanes] = useState(true)
  const [supabaseReady, setSupabaseReady] = useState(false)

  const [form, setForm] = useState({
    tipo: 'cobro',
    tercero: '',
    cuit: '',
    concepto: '',
    importeTotal: '',
    cuotas: 6,
    fechaInicio: '',
    frecuencia: 'mensual',
    forma: 'ECHEQ',
    moneda: 'ARS',
    banco: 'Banco Nación',
    referencia: '',
    observaciones: '',
  })

  const loadTesoreria = async () => {
    try {
      setLoadingPlanes(true)

      const planesData = await getPlanes()
      const cuotasData = await getCuotas()

      setPlanes(planesData || [])
      setCuotasDb(cuotasData || [])
      setSupabaseReady(true)
    } catch (error) {
      console.error(error)
      setPlanes(MOCK_PLANES_INICIALES)
      setCuotasDb([])
      setSupabaseReady(false)
      toast.error('No se pudo cargar Supabase. Se muestra base preparada.')
    } finally {
      setLoadingPlanes(false)
    }
  }

  useEffect(() => {
    loadTesoreria()
  }, [])

  const planesOperativos = planes.length > 0 ? planes.map(normalizePlan) : MOCK_PLANES_INICIALES

  const cuotasGeneradas = useMemo(() => {
    if (cuotasDb.length > 0) {
      return cuotasDb
        .map((cuota) => ({
          id: cuota.id,
          planId: cuota.plan_id,
          tipo: cuota.tipo,
          tercero: cuota.tercero,
          concepto: cuota.concepto,
          cuota: cuota.cuota,
          importe: Number(cuota.importe || 0),
          moneda: cuota.moneda || 'ARS',
          vencimiento: cuota.vencimiento,
          forma: cuota.forma,
          banco: cuota.banco,
          estado: cuota.estado || 'pendiente',
          origen: 'REAL',
        }))
        .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))
    }

    return planesOperativos.flatMap(generateCuotas).sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))
  }, [cuotasDb, planesOperativos])

  const vencimientos = useMemo(() => {
    const realesCobros = transacciones
      .filter((t) => t.estado_pago === 'pendiente')
      .map((t) => ({
        id: `real-cobro-${t.id}`,
        tipo: 'cobro',
        tercero: t.cliente_nombre || 'Cliente',
        concepto: t.concepto || 'Cobranza pendiente',
        cuota: '-',
        importe: t.monto_total_ars || (t.monto_total_usd || 0) * 1000,
        moneda: t.monto_total_usd ? 'USD' : 'ARS',
        vencimiento: t.fecha_vencimiento || '',
        forma: 'A definir',
        banco: 'Sin asignar',
        estado: 'pendiente',
        origen: 'REAL',
      }))

    const realesPagos = compras
      .filter((c) => c.estado === 'recibido' || c.estado === 'pendiente')
      .map((c) => ({
        id: `real-pago-${c.id}`,
        tipo: 'pago',
        tercero: c.proveedor_nombre || 'Proveedor',
        concepto: c.concepto || 'Pago pendiente',
        cuota: '-',
        importe: c.total_ars || (c.total_usd || 0) * 1000,
        moneda: c.total_usd ? 'USD' : 'ARS',
        vencimiento: c.fecha_vencimiento || '',
        forma: 'A definir',
        banco: 'Sin asignar',
        estado: 'pendiente',
        origen: 'REAL',
      }))

    return [...cuotasGeneradas, ...realesCobros, ...realesPagos]
      .filter((v) => v.vencimiento)
      .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))
  }, [cuotasGeneradas, transacciones, compras])

  const vencimientosFiltrados = vencimientos.filter((v) => {
    if (filterTipo === 'todos') return true
    if (filterTipo === 'echeq') return v.forma?.toLowerCase() === 'echeq'
    return v.tipo === filterTipo
  })

  const totalBancosArs = BANCOS.filter((b) => b.moneda === 'ARS').reduce((s, b) => s + b.saldo, 0)
  const totalBancosUsd = BANCOS.filter((b) => b.moneda === 'USD').reduce((s, b) => s + b.saldo, 0)

  const totalACobrar = vencimientos
    .filter((v) => v.tipo === 'cobro' && v.moneda === 'ARS' && v.estado !== 'pagado')
    .reduce((s, v) => s + v.importe, 0)

  const totalAPagar = vencimientos
    .filter((v) => v.tipo === 'pago' && v.moneda === 'ARS' && v.estado !== 'pagado')
    .reduce((s, v) => s + v.importe, 0)

  const vencidos = vencimientos.filter((v) => daysTo(v.vencimiento) < 0 && v.estado !== 'pagado').length
  const proximos15 = vencimientos.filter((v) => daysTo(v.vencimiento) >= 0 && daysTo(v.vencimiento) <= 15 && v.estado !== 'pagado').length
  const posicionNeta = totalBancosArs + totalACobrar - totalAPagar

  const flujoMensual = useMemo(() => {
    const months = []

    for (let i = 0; i < 6; i += 1) {
      const base = new Date()
      base.setMonth(base.getMonth() + i)

      const key = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`
      const label = base.toLocaleDateString('es-AR', { month: 'short' })

      const delMes = vencimientos.filter((v) => v.vencimiento?.startsWith(key) && v.estado !== 'pagado')
      const cobros = delMes.filter((v) => v.tipo === 'cobro').reduce((s, v) => s + v.importe, 0)
      const pagos = delMes.filter((v) => v.tipo === 'pago').reduce((s, v) => s + v.importe, 0)

      months.push({ label, cobros, pagos, neto: cobros - pagos })
    }

    return months
  }, [vencimientos])

  const handleSyncEcheqs = async () => {
    setSyncing(true)
    toast.info('Sincronizando ECHEQ con banco...')

    try {
      const res = await syncEcheqs()

      if (res.success) {
        toast.success(`Se sincronizaron ${res.nuevosCheques?.length || 0} ECHEQ nuevos`)
      } else {
        toast.error(res.error || 'Error al sincronizar')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error de conexión bancaria')
    } finally {
      setSyncing(false)
    }
  }

  const handleCreatePlan = async (event) => {
    event.preventDefault()

    if (!form.tercero || !form.concepto || !form.importeTotal || !form.fechaInicio) {
      toast.error('Completá tercero, concepto, importe y fecha inicial')
      return
    }

    const newPlan = {
      id: `plan-${Date.now()}`,
      ...form,
      importeTotal: Number(String(form.importeTotal).replace(',', '.')),
      cuotas: Number(form.cuotas),
      estado: 'programado',
    }

    try {
      if (supabaseReady) {
        await createPlan(newPlan)
        await loadTesoreria()
      } else {
        setPlanes((prev) => [newPlan, ...prev])
      }

      setShowPlanModal(false)
      toast.success(`Plan de ${form.tipo === 'cobro' ? 'cobro' : 'pago'} creado correctamente`)

      setForm({
        tipo: 'cobro',
        tercero: '',
        cuit: '',
        concepto: '',
        importeTotal: '',
        cuotas: 6,
        fechaInicio: '',
        frecuencia: 'mensual',
        forma: 'ECHEQ',
        moneda: 'ARS',
        banco: 'Banco Nación',
        referencia: '',
        observaciones: '',
      })
    } catch (error) {
      console.error(error)
      toast.error('No se pudo crear el plan financiero')
    }
  }

  const handleEstadoCuota = async (id, estado) => {
    try {
      if (!supabaseReady || String(id).startsWith('plan-demo')) {
        toast.info('Base preparada: conectá Supabase para actualizar estados reales.')
        return
      }

      await updateEstadoCuota(id, estado)
      await loadTesoreria()
      toast.success('Estado actualizado con trazabilidad')
    } catch (error) {
      console.error(error)
      toast.error('Error actualizando cuota')
    }
  }

  const previewCuotas = useMemo(() => {
    if (!form.importeTotal || !form.cuotas || !form.fechaInicio) return []

    return generateCuotas({
      id: 'preview',
      ...form,
      importeTotal: Number(String(form.importeTotal).replace(',', '.')),
      cuotas: Number(form.cuotas),
    })
  }, [form])

  const tabs = [
    ['resumen', 'Resumen'],
    ['vencimientos', 'Vencimientos'],
    ['planes', 'Planes'],
    ['bancos', 'Caja y bancos'],
    ['echeqs', 'ECHEQ'],
    ['facturacion', 'Facturación / ARCA'],
    ['cumplimiento', 'Cumplimiento ISO'],
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
            <span className="h-px w-8 bg-cyan-300/40" />
            Tesorería operativa
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Pagos, cobros y flujo proyectado</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Planificá cuotas, ECHEQ, vencimientos, caja futura, facturación y trazabilidad financiera.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowPlanModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo plan
          </Button>

          <Button variant="outline" onClick={handleSyncEcheqs} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar ECHEQ
          </Button>
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] ${
        supabaseReady
          ? 'border-emerald-300/20 bg-emerald-300/5 text-emerald-300'
          : 'border-cyan-300/20 bg-cyan-300/5 text-cyan-300'
      }`}>
        {supabaseReady
          ? 'REAL — Planes y cuotas conectados a Supabase. Preparado para trazabilidad, auditoría e integración contable.'
          : 'BASE PREPARADA — La lógica de planes, cuotas y vencimientos está operativa. Próxima etapa: persistencia SQL/Supabase.'}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Saldo disponible</span>
            <Banknote className="h-4 w-4 text-cyan-300" />
          </div>
          <div className="mt-3 font-mono text-2xl font-black text-cyan-300">{formatCurrency(totalBancosArs)}</div>
          <div className="mt-1 text-xs text-neutral-500">ARS · bancos + caja</div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">A cobrar</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-300" />
          </div>
          <div className="mt-3 font-mono text-2xl font-black text-emerald-300">{formatCurrency(totalACobrar)}</div>
          <div className="mt-1 text-xs text-neutral-500">Planes + cobranzas pendientes</div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">A pagar</span>
            <ArrowUpRight className="h-4 w-4 text-red-300" />
          </div>
          <div className="mt-3 font-mono text-2xl font-black text-red-300">{formatCurrency(totalAPagar)}</div>
          <div className="mt-1 text-xs text-neutral-500">Planes + pagos pendientes</div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Posición neta</span>
            <CalendarDays className="h-4 w-4 text-amber-300" />
          </div>
          <div className={`mt-3 font-mono text-2xl font-black ${posicionNeta >= 0 ? 'text-amber-300' : 'text-red-300'}`}>
            {formatCurrency(posicionNeta)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {proximos15} vencimientos próximos · {vencidos} vencidos
          </div>
        </Panel>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-white/[0.06]">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`whitespace-nowrap border-b-2 px-3 py-3 font-mono text-xs font-bold uppercase tracking-[0.16em] transition-colors ${
              tab === key
                ? 'border-cyan-300 text-cyan-300'
                : 'border-transparent text-neutral-600 hover:text-neutral-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
          <Panel>
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                Flujo proyectado — próximos 6 meses
              </h2>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                {flujoMensual.map((m) => {
                  const max = Math.max(...flujoMensual.map((x) => Math.max(x.cobros, x.pagos, 1)))
                  const cobrosHeight = Math.max(8, (m.cobros / max) * 90)
                  const pagosHeight = Math.max(8, (m.pagos / max) * 90)

                  return (
                    <div key={m.label} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                      <div className="mb-3 text-center font-mono text-[10px] uppercase text-neutral-500">{m.label}</div>
                      <div className="flex h-28 items-end justify-center gap-2">
                        <div className="w-5 rounded-t bg-emerald-300/35" style={{ height: `${cobrosHeight}px` }} />
                        <div className="w-5 rounded-t bg-red-300/35" style={{ height: `${pagosHeight}px` }} />
                      </div>
                      <div className={`mt-3 text-center font-mono text-xs font-bold ${m.neto >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {formatCurrency(m.neto)}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 flex gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-2"><span className="h-2 w-2 bg-emerald-300/60" /> Cobros</span>
                <span className="flex items-center gap-2"><span className="h-2 w-2 bg-red-300/60" /> Pagos</span>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                Riesgo financiero
              </h2>
            </div>

            <div className="space-y-3 p-5">
              {vencidos > 0 && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-red-300" />
                    <div>
                      <div className="text-sm font-bold text-white">Vencimientos vencidos</div>
                      <div className="mt-1 text-xs text-neutral-500">Hay {vencidos} compromisos fuera de fecha.</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
                <div className="flex gap-3">
                  <CreditCard className="mt-0.5 h-4 w-4 text-amber-300" />
                  <div>
                    <div className="text-sm font-bold text-white">ECHEQ y cuotas activas</div>
                    <div className="mt-1 text-xs text-neutral-500">Controlá vencimientos próximos y cartera diferida.</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                <div className="flex gap-3">
                  <FileCheck2 className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <div>
                    <div className="text-sm font-bold text-white">Planes activos</div>
                    <div className="mt-1 text-xs text-neutral-500">{planesOperativos.length} planes programados de pagos/cobros.</div>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'vencimientos' && (
        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
              Vencimientos programados
            </h2>

            <div className="flex flex-wrap gap-2">
              {[
                ['todos', 'Todos'],
                ['cobro', 'Cobros'],
                ['pago', 'Pagos'],
                ['echeq', 'ECHEQ'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterTipo(key)}
                  className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
                    filterTipo === key
                      ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-300'
                      : 'border-white/[0.06] bg-black/20 text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] text-left">
              <thead className="border-b border-white/[0.06] bg-black/20">
                <tr>
                  {['Vencimiento', 'Tipo', 'Tercero', 'Concepto', 'Cuota', 'Forma', 'Banco', 'Importe', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {vencimientosFiltrados.map((v) => {
                  const dias = daysTo(v.vencimiento)
                  const pagado = v.estado === 'pagado'

                  return (
                    <tr key={v.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className={`font-mono text-xs font-bold ${dias < 0 && !pagado ? 'text-red-300' : dias <= 7 && !pagado ? 'text-amber-300' : 'text-neutral-300'}`}>
                          {formatDate(v.vencimiento)}
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-neutral-600">
                          {pagado ? 'Pagado' : dias < 0 ? `Vencido hace ${Math.abs(dias)} d` : dias === 0 ? 'Hoy' : `En ${dias} d`}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={v.tipo === 'cobro' ? 'cobro' : 'pago'}>
                          {v.tipo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-neutral-200">{v.tercero}</td>
                      <td className="px-4 py-3 text-sm text-neutral-500">{v.concepto}</td>
                      <td className="px-4 py-3"><Badge tone="cuota">{v.cuota || '-'}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge tone={v.forma === 'ECHEQ' ? 'echeq' : 'neutral'}>{v.forma}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">{v.banco}</td>
                      <td className={`px-4 py-3 text-right font-mono text-sm font-black ${v.tipo === 'cobro' ? 'text-emerald-300' : 'text-red-300'}`}>
                        {v.tipo === 'cobro' ? '+' : '-'} {formatCurrency(v.importe, v.moneda)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={pagado ? 'ok' : dias < 0 ? 'danger' : dias <= 7 ? 'warning' : 'neutral'}>
                          {pagado ? 'Pagado' : dias < 0 ? 'Vencido' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEstadoCuota(v.id, 'pagado')}
                            disabled={pagado}
                            className="rounded border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Pagado
                          </button>
                          <button
                            type="button"
                            onClick={() => toast.info('Reprogramación preparada para próxima etapa')}
                            className="rounded border border-white/[0.08] bg-black/20 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-400 hover:text-white"
                          >
                            Reprogramar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === 'planes' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {planesOperativos.map((plan) => {
            const cuotas = generateCuotas(plan)
            const vencidas = cuotas.filter((c) => daysTo(c.vencimiento) < 0).length
            const avance = Math.min(100, (vencidas / cuotas.length) * 100)

            return (
              <Panel key={plan.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge tone={plan.tipo === 'cobro' ? 'cobro' : 'pago'}>{plan.tipo}</Badge>
                    <h3 className="mt-3 text-lg font-black text-white">{plan.concepto}</h3>
                    <p className="mt-1 text-sm text-neutral-500">{plan.tercero}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-black text-cyan-300">
                      {formatCurrency(plan.importeTotal, plan.moneda)}
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-neutral-600">{plan.cuotas} cuotas · {plan.forma}</div>
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full bg-cyan-300/70" style={{ width: `${avance}%` }} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-neutral-500">
                  <div>
                    <span className="block font-mono text-[10px] uppercase text-neutral-600">Inicio</span>
                    {formatDate(plan.fechaInicio)}
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] uppercase text-neutral-600">Banco</span>
                    {plan.banco}
                  </div>
                </div>
              </Panel>
            )
          })}
        </div>
      )}

      {tab === 'bancos' && (
        <div className="grid gap-4 md:grid-cols-2">
          {BANCOS.map((banco) => (
            <Panel key={banco.id} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-bold text-white">{banco.nombre}</div>
                  <div className="mt-1 font-mono text-xs text-neutral-600">{banco.cuenta}</div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-xl font-black ${banco.moneda === 'USD' ? 'text-amber-300' : 'text-cyan-300'}`}>
                    {formatCurrency(banco.saldo, banco.moneda)}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-neutral-600">{banco.moneda}</div>
                </div>
              </div>
            </Panel>
          ))}

          <Panel className="p-5 md:col-span-2">
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
              Posición por moneda
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-sm text-neutral-500">Total ARS</div>
                <div className="mt-1 font-mono text-2xl font-black text-cyan-300">{formatCurrency(totalBancosArs)}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-sm text-neutral-500">Total USD</div>
                <div className="mt-1 font-mono text-2xl font-black text-amber-300">{formatCurrency(totalBancosUsd, 'USD')}</div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'echeqs' && (
        <Panel className="overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
              ECHEQ en cartera / emitidos
            </h2>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {MOCK_ECHEQS.map((e) => (
              <div key={e.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone={e.tipo === 'cobro' ? 'cobro' : 'pago'}>{e.tipo}</Badge>
                    <Badge tone="echeq">ECHEQ</Badge>
                  </div>
                  <div className="mt-3 text-sm font-bold text-white">{e.tercero}</div>
                  <div className="mt-1 font-mono text-xs text-neutral-600">{e.numero} · {e.estado}</div>
                </div>

                <div className="text-right">
                  <div className={`font-mono text-lg font-black ${e.tipo === 'cobro' ? 'text-emerald-300' : 'text-red-300'}`}>
                    {formatCurrency(e.importe, e.moneda)}
                  </div>
                  <div className="mt-1 font-mono text-xs text-neutral-600">{formatDate(e.vencimiento)}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === 'facturacion' && (
        <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <Panel className="overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                Ventas, facturación y preparación ARCA
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Base preparada para vincular operaciones comerciales, comprobantes, cobros, CAE y conciliación.
              </p>
            </div>

            <div className="grid gap-3 p-5 md:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <ReceiptText className="mb-3 h-5 w-5 text-cyan-300" />
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Facturas emitidas
                </div>
                <div className="mt-2 font-mono text-2xl font-black text-cyan-300">PREP</div>
                <div className="mt-1 text-xs text-neutral-500">
                  Próxima conexión: ventas / ARCA
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <FileText className="mb-3 h-5 w-5 text-emerald-300" />
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Cobros vinculados
                </div>
                <div className="mt-2 font-mono text-2xl font-black text-emerald-300">
                  {vencimientos.filter((v) => v.tipo === 'cobro').length}
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  Planes y cuotas de cobro
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <AlertTriangle className="mb-3 h-5 w-5 text-amber-300" />
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Pendientes fiscales
                </div>
                <div className="mt-2 font-mono text-2xl font-black text-amber-300">PREP</div>
                <div className="mt-1 text-xs text-neutral-500">
                  CAE, comprobantes, notas y conciliación
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.06] p-5">
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                  Flujo futuro ARCA / Contabilidad
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-5">
                  {['Venta', 'Factura', 'CAE', 'Cobro', 'Conciliación'].map((step, index) => (
                    <div key={step} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                      <div className="font-mono text-[10px] text-neutral-600">0{index + 1}</div>
                      <div className="mt-1 text-sm font-bold text-white">{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
              Integraciones previstas
            </div>

            <div className="mt-4 space-y-3">
              {[
                ['ARCA / AFIP', 'Facturación electrónica, CAE, comprobantes y notas.'],
                ['Ventas', 'Vincular operación comercial con factura y cobro.'],
                ['Cliente360', 'Ver deuda, comprobantes, promesas y cobranzas.'],
                ['Contabilidad', 'Base futura para asientos, IVA, ingresos y reportes.'],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-white">{title}</div>
                    <Badge tone="arca">PREP</Badge>
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">{desc}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === 'cumplimiento' && (
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1fr]">
          <Panel className="p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <div>
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                  Trazabilidad y cumplimiento ISO
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Base operativa para auditoría, evidencia, seguridad de datos y control documental.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ['ISO 9001', 'Trazabilidad de procesos, registros, responsables y mejora continua.'],
                ['ISO 27001', 'Control de acceso, registros, seguridad y protección de información.'],
                ['ISO 14001', 'Base futura para impactos ambientales, residuos y evidencias operativas.'],
                ['ISO 45001', 'Base futura para seguridad operacional, tareas críticas y permisos de trabajo.'],
              ].map(([iso, desc]) => (
                <div key={iso} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm font-black text-cyan-300">{iso}</div>
                    <Badge tone="iso">Base preparada</Badge>
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">{desc}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
              Controles aplicados en Tesorería
            </div>

            <div className="mt-4 space-y-3">
              {[
                ['Usuario responsable', 'Cada plan, cuota o cambio debe quedar asociado al usuario que lo ejecutó.'],
                ['Fecha y hora', 'Toda acción relevante debe guardar timestamp de creación y modificación.'],
                ['Estado documentado', 'Pendiente, pagado, vencido, reprogramado o cancelado.'],
                ['Evidencia documental', 'Preparado para adjuntar comprobantes, recibos, ECHEQ o respaldos.'],
                ['Trazabilidad financiera', 'Relación entre venta, factura, cobro, pago, banco y conciliación.'],
                ['Control de cambios', 'Base futura para historial auditable de reprogramaciones y anulaciones.'],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <ClipboardCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <div>
                    <div className="text-sm font-bold text-white">{title}</div>
                    <div className="mt-1 text-xs text-neutral-500">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreatePlan} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0d0f14] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-white">Nuevo plan financiero</h2>
                <p className="mt-1 text-xs text-neutral-500">Genera cuotas automáticas para pagos o cobros.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="rounded-xl border border-white/[0.08] bg-black/20 p-2 text-neutral-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Tipo</span>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#111520] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
                >
                  <option value="cobro">Cobro a cliente</option>
                  <option value="pago">Pago a proveedor</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  {form.tipo === 'cobro' ? 'Cliente' : 'Proveedor'}
                </span>
                <input
                  value={form.tercero}
                  onChange={(e) => setForm({ ...form, tercero: e.target.value })}
                  placeholder={form.tipo === 'cobro' ? 'Ej: DUX' : 'Ej: Turbodisel S.A.'}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#111520] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Concepto</span>
                <input
                  value={form.concepto}
                  onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  placeholder="Ej: Excavadora LOVOL FR60F"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#111520] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Importe total</span>
                <input
                  value={form.importeTotal}
                  onChange={(e) => setForm({ ...form, importeTotal: e.target.value })}
                  placeholder="56770336.30"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#111520] px-3 py-3 font-mono text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Moneda</span>
                <select
                  value={form.moneda}
                  onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#111520] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Cantidad de cuotas</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={form.cuotas}
                  onChange={(e) => setForm({ ...form, cuotas: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#111520] px-3 py-3 font-mono text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Primera fecha</span>
                <input
                  type="date"
                  value={form.fechaInicio}
                  onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#111520] px-3 py-3 font-mono text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Frecuencia</span>
                <select
                  value={form.frecuencia}
                  onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#111520] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
                >
                  <option value="mensual">Mensual</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="semanal">Semanal</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Forma</span>
                <select
                  value={form.forma}
                  onChange={(e) => setForm({ ...form, forma: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#111520] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
                >
                  {FORMAS.map((forma) => (
                    <option key={forma} value={forma}>{forma}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Banco / cuenta</span>
                <select
                  value={form.banco}
                  onChange={(e) => setForm({ ...form, banco: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#111520] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
                >
                  {BANCOS.map((banco) => (
                    <option key={banco.id} value={banco.nombre}>{banco.nombre} · {banco.cuenta}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Referencia / observación</span>
                <input
                  value={form.referencia}
                  onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                  placeholder="Factura, operación, máquina, OT, acuerdo, comprobante, etc."
                  className="w-full rounded-xl border border-white/[0.08] bg-[#111520] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>
            </div>

            {previewCuotas.length > 0 && (
              <div className="border-t border-white/[0.06] px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">Vista previa</span>
                  <span className="font-mono text-xs text-cyan-300">
                    {formatCurrency(previewCuotas[0]?.importe, form.moneda)} por cuota
                  </span>
                </div>

                <div className="grid max-h-40 gap-2 overflow-y-auto md:grid-cols-2">
                  {previewCuotas.map((cuota) => (
                    <div key={cuota.id} className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-neutral-300">Cuota {cuota.cuota}</span>
                        <span className="font-mono text-xs text-cyan-300">{formatCurrency(cuota.importe, form.moneda)}</span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-neutral-600">{formatDate(cuota.vencimiento)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-4">
              <Button type="button" variant="outline" onClick={() => setShowPlanModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear plan
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}