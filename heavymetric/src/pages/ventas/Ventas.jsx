import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileSignature,
  FileText,
  PackageCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const ventasPipeline = [
  {
    id: 'VTA-001',
    cliente: 'PROCON S.R.L.',
    tipo: 'Servicio',
    descripcion: 'Service programado + kit de filtros',
    monto: 'USD 1.250',
    estado: 'Preparar OV',
    prioridad: 'Alta',
    origen: 'Cotización convertida',
  },
  {
    id: 'VTA-002',
    cliente: 'Constructora del Norte',
    tipo: 'Repuestos',
    descripcion: 'Filtros, mangueras y lubricantes',
    monto: 'USD 780',
    estado: 'Pendiente firma',
    prioridad: 'Media',
    origen: 'Venta directa',
  },
  {
    id: 'VTA-003',
    cliente: 'Minera Andina',
    tipo: 'Maquinaria',
    descripcion: 'Minicargadora + implemento',
    monto: 'USD 34.500',
    estado: 'Condiciones',
    prioridad: 'Alta',
    origen: 'CRM',
  },
]

const indicadores = [
  {
    label: 'Ventas en preparación',
    value: '3',
    detail: 'Pendientes de OV o confirmación',
    icon: ShoppingCart,
  },
  {
    label: 'Pendientes de firma',
    value: '1',
    detail: 'Requieren aceptación del cliente',
    icon: FileSignature,
  },
  {
    label: 'Listas para facturar',
    value: '2',
    detail: 'Documentación comercial completa',
    icon: FileText,
  },
  {
    label: 'Entregas / servicios',
    value: '4',
    detail: 'Próximas acciones operativas',
    icon: Truck,
  },
]

const proximosPasos = [
  {
    title: 'Orden de Venta',
    description: 'Documento comercial que confirma productos, condiciones y aceptación del cliente.',
    status: 'Próxima fase',
    icon: ClipboardList,
  },
  {
    title: 'Firma del comprador',
    description: 'Aceptación formal mediante firma digital, PDF firmado o evidencia adjunta.',
    status: 'Próxima fase',
    icon: FileSignature,
  },
  {
    title: 'Facturación',
    description: 'Generación de factura, remito y recibo desde la venta aprobada.',
    status: 'Conectado',
    icon: FileText,
  },
  {
    title: 'Cobranza',
    description: 'Seguimiento financiero desde Documentos y Cobranzas / Tesorería.',
    status: 'Conectado',
    icon: PackageCheck,
  },
]

function indicadorColor(label) {
  if (label.includes('firma')) return 'border-l-amber-500 text-amber-300'
  if (label.includes('facturar')) return 'border-l-green-500 text-green-300'
  if (label.includes('Entregas')) return 'border-l-blue-500 text-blue-300'
  return 'border-l-hm-accent text-hm-accent'
}

function estadoVariant(estado) {
  if (estado === 'Pendiente firma') return 'warn'
  if (estado === 'Preparar OV') return 'info'
  if (estado === 'Condiciones') return 'default'
  return 'success'
}

export default function Ventas() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="mt-1 text-sm text-hm-muted">
            Seguimiento comercial desde la cotización aceptada hasta la orden de venta, firma, facturación y cobranza.
          </p>
        </div>

        <div className="flex gap-2">
          <Link to="/app/cotizaciones">
            <Button variant="outline">VER COTIZACIONES</Button>
          </Link>
          <Button variant="primary" disabled>
            + ORDEN DE VENTA
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {indicadores.map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.label} className={`border-l-4 bg-hm-surface2/30 p-4 ${indicadorColor(item.label)}`}>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] font-mono uppercase tracking-widest text-hm-muted">
                  {item.label}
                </div>
                <Icon className="h-4 w-4 opacity-70" />
              </div>

              <div className="text-3xl font-bold">{item.value}</div>
              <p className="mt-1 text-xs text-hm-muted">{item.detail}</p>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-hm-border bg-hm-surface2/30 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Ventas en gestión</h2>
                <p className="mt-1 text-xs text-hm-muted">
                  Base preparada para conectar cotizaciones convertidas con órdenes de venta reales.
                </p>
              </div>

              <span className="rounded-full border border-hm-border px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-hm-muted">
                Base preparada
              </span>
            </div>
          </div>

          <table className="w-full text-left">
            <thead className="border-b border-hm-border bg-hm-surface2/40">
              <tr>
                <th className="p-4 font-mono text-xs text-hm-muted">N°</th>
                <th className="p-4 font-mono text-xs text-hm-muted">CLIENTE</th>
                <th className="p-4 font-mono text-xs text-hm-muted">TIPO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">DESCRIPCIÓN</th>
                <th className="p-4 font-mono text-xs text-hm-muted text-right">MONTO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">ESTADO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">ORIGEN</th>
              </tr>
            </thead>

            <tbody>
              {ventasPipeline.map((venta) => (
                <tr key={venta.id} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors">
                  <td className="p-4 font-mono text-sm text-hm-accent">{venta.id}</td>
                  <td className="p-4 text-sm font-medium">{venta.cliente}</td>
                  <td className="p-4 text-sm text-hm-muted">{venta.tipo}</td>
                  <td className="p-4 text-sm text-hm-muted">{venta.descripcion}</td>
                  <td className="p-4 text-right font-mono text-sm font-bold text-green-400">{venta.monto}</td>
                  <td className="p-4">
                    <Badge variant={estadoVariant(venta.estado)}>{venta.estado}</Badge>
                  </td>
                  <td className="p-4 text-xs text-hm-muted">{venta.origen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-lg border border-hm-accent/30 bg-hm-accent/10 p-2 text-hm-accent">
                <CheckCircle2 className="h-4 w-4" />
              </div>

              <div>
                <h2 className="font-semibold">Flujo comercial objetivo</h2>
                <p className="mt-1 text-xs leading-relaxed text-hm-muted">
                  Este módulo queda preparado para recibir cotizaciones convertidas y transformarlas en órdenes de venta firmadas.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {['Cotización aprobada', 'Orden de Venta', 'Firma cliente', 'Factura', 'Cobranza'].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-lg border border-hm-border bg-hm-surface2/20 px-3 py-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-hm-border font-mono text-[10px] text-hm-muted">
                    {index + 1}
                  </div>

                  <div className="flex-1 text-sm">{step}</div>
                  <ChevronRight className="h-4 w-4 text-hm-muted" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Próximas conexiones</h2>

            <div className="flex flex-col gap-3">
              {proximosPasos.map((item) => {
                const Icon = item.icon

                return (
                  <div key={item.title} className="rounded-lg border border-hm-border bg-hm-surface2/20 p-3">
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 text-hm-muted" />

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold">{item.title}</h3>
                          <span className="rounded border border-hm-border px-2 py-0.5 font-mono text-[9px] uppercase text-hm-muted">
                            {item.status}
                          </span>
                        </div>

                        <p className="mt-1 text-xs leading-relaxed text-hm-muted">{item.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 text-amber-300" />

          <div>
            <h3 className="text-sm font-bold text-amber-200">Módulo en consolidación</h3>
            <p className="mt-1 text-sm text-amber-100/70">
              Actualmente funciona como base preparada para el circuito comercial. La siguiente etapa es crear órdenes de venta reales con firma, condiciones comerciales, reservas de stock y conexión directa con facturación.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}