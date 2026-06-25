import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../../lib/supabase'
import Modal from '../../ui/Modal'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import { useDolar } from '../../../context/DolarContext'
import { useAuth } from '../../../context/AuthContext'
import { useRubro } from '../../../context/RubroContext'

const CHECKLIST_BASE = [
  { key: 'diagnostico_confirmado', label: 'Diagnóstico confirmado' },
  { key: 'trabajo_realizado', label: 'Trabajo realizado según solicitud' },
  { key: 'prueba_operativa', label: 'Prueba operativa realizada' },
  { key: 'seguridad_verificada', label: 'Condición segura verificada' },
  { key: 'cliente_informado', label: 'Cliente / responsable informado' },
]

export default function ModalFinalizarOT({ isOpen, onClose, ot, onConfirm }) {
  const { formatUSD } = useDolar()
  const { user, perfil } = useAuth()
  const { taxonomia } = useRubro()

  const activoSingular = taxonomia?.activoSingular || 'Activo'
  const ordenTrabajo = taxonomia?.ordenTrabajo || 'Orden de Trabajo'
  const repuestoPlural = taxonomia?.repuestoPlural || 'Repuestos / Insumos'
  const medidor = taxonomia?.medidor || 'Horómetro'
  const medidorUnidad = taxonomia?.medidorUnidad || 'hrs'

  const [loading, setLoading] = useState(false)
  const [catalogoRep, setCatalogoRep] = useState([])
  const [repuestosUtilizados, setRepuestosUtilizados] = useState([])
  const [checklist, setChecklist] = useState(
    CHECKLIST_BASE.reduce((acc, item) => ({ ...acc, [item.key]: false }), {})
  )

  const [formData, setFormData] = useState({
    horometro_final: ot?.maquina?.horometro_actual || 0,
    mantenimiento_completo: false,
    horas_mano_obra: ot?.horas_mano_obra || 0,
    precio_hora_usd: ot?.precio_hora_usd || 45,
    diagnostico_final: '',
    trabajo_realizado: '',
    observaciones_cliente: '',
    notas_internas: ot?.notas_internas || '',
    responsable_cierre: perfil?.nombre || user?.email || '',
    firma_cliente_nombre: '',
    evidencia_descripcion: '',
    estado: 'completada',
    nps_score: null,
    criticidad_cierre: ot?.criticidad || 'media',
    causa_raiz: '',
    accion_correctiva: '',
    accion_preventiva: '',
    horas_fuera_servicio: 0,
  })

  useEffect(() => {
    if (!isOpen) return

    setFormData((prev) => ({
      ...prev,
      horometro_final: ot?.maquina?.horometro_actual || prev.horometro_final || 0,
      horas_mano_obra: ot?.horas_mano_obra || prev.horas_mano_obra || 0,
      precio_hora_usd: ot?.precio_hora_usd || prev.precio_hora_usd || 45,
      notas_internas: ot?.notas_internas || '',
      responsable_cierre: perfil?.nombre || user?.email || prev.responsable_cierre || '',
      criticidad_cierre: ot?.criticidad || prev.criticidad_cierre || 'media',
    }))

    setChecklist(
      CHECKLIST_BASE.reduce((acc, item) => ({ ...acc, [item.key]: false }), {})
    )

    supabase
      .from('repuestos')
      .select('id, nombre, precio_usd, unidad')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setCatalogoRep(data || []))

    if (ot?.id) {
      supabase
        .from('ot_repuestos')
        .select('*')
        .eq('orden_trabajo_id', ot.id)
        .then(({ data }) => {
          if (data?.length) {
            setRepuestosUtilizados(
              data.map((r) => ({
                repuesto_id: r.repuesto_id,
                nombre: r.nombre,
                cantidad: r.cantidad,
                precio_unitario_usd: r.precio_unitario_usd,
              }))
            )
          } else {
            setRepuestosUtilizados([])
          }
        })
    }
  }, [
    isOpen,
    ot?.id,
    ot?.maquina?.horometro_actual,
    ot?.horas_mano_obra,
    ot?.precio_hora_usd,
    ot?.notas_internas,
    ot?.criticidad,
    perfil?.nombre,
    user?.email,
  ])

  const checklistCompleto = useMemo(() => {
    return CHECKLIST_BASE.every((item) => checklist[item.key])
  }, [checklist])

  const requiereEvidenciaObligatoria =
    ['alta', 'critica'].includes(formData.criticidad_cierre)

  const totalManoObra =
    Number(formData.horas_mano_obra || 0) * Number(formData.precio_hora_usd || 0)

  const totalRepuestos = repuestosUtilizados
    .filter((r) => String(r.nombre || '').trim())
    .reduce((s, r) => s + Number(r.cantidad || 0) * Number(r.precio_unitario_usd || 0), 0)

  const totalOT = totalManoObra + totalRepuestos

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleChecklistChange = (key) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const addRepuestoRow = () => {
    setRepuestosUtilizados((prev) => [
      ...prev,
      {
        repuesto_id: null,
        nombre: '',
        cantidad: 1,
        precio_unitario_usd: 0,
      },
    ])
  }

  const removeRepuestoRow = (index) => {
    setRepuestosUtilizados((prev) => prev.filter((_, idx) => idx !== index))
  }

  const updateRepuestoRow = (index, field, value) => {
    setRepuestosUtilizados((prev) =>
      prev.map((row, idx) => (idx !== index ? row : { ...row, [field]: value }))
    )
  }

  const handleSelectCatalogo = (index, repuestoId) => {
    const repuesto = catalogoRep.find((r) => String(r.id) === String(repuestoId))

    if (!repuesto) {
      updateRepuestoRow(index, 'repuesto_id', null)
      return
    }

    updateRepuestoRow(index, 'repuesto_id', repuesto.id)
    updateRepuestoRow(index, 'nombre', repuesto.nombre)
    updateRepuestoRow(index, 'precio_unitario_usd', repuesto.precio_usd)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!checklistCompleto) {
      toast.error('Completá el checklist operativo antes de cerrar la orden.')
      return
    }

    if (!formData.responsable_cierre.trim()) {
      toast.error('Indicá el responsable del cierre.')
      return
    }

    if (!formData.causa_raiz.trim()) {
      toast.error('Indicá la causa raíz del trabajo.')
      return
    }

    if (!formData.accion_correctiva.trim()) {
      toast.error('Indicá la acción correctiva realizada.')
      return
    }

    if (requiereEvidenciaObligatoria && !formData.evidencia_descripcion.trim()) {
      toast.error('Para criticidad alta o crítica, la evidencia es obligatoria.')
      return
    }

    setLoading(true)

    try {
      const evidencias = []

      if (formData.evidencia_descripcion.trim()) {
        evidencias.push({
          tipo: 'descripcion_evidencia',
          descripcion: formData.evidencia_descripcion.trim(),
          fecha_hora: new Date().toISOString(),
        })
      }

      if (formData.firma_cliente_nombre.trim()) {
        evidencias.push({
          tipo: 'firma_cliente_preparada',
          firmante: formData.firma_cliente_nombre.trim(),
          fecha_hora: new Date().toISOString(),
        })
      }

      await onConfirm({
        ...formData,
        horometro_final: Number(formData.horometro_final || 0),
        horas_mano_obra: Number(formData.horas_mano_obra || 0),
        precio_hora_usd: Number(formData.precio_hora_usd || 0),
        horas_fuera_servicio: Number(formData.horas_fuera_servicio || 0),
        total_mano_obra_usd: totalManoObra,
        total_repuestos_usd: totalRepuestos,
        total_usd: totalOT,
        checklist_cierre: checklist,
        checklist_completo: checklistCompleto,
        responsable: formData.responsable_cierre,
        evidencias,
        repuestosUtilizados: repuestosUtilizados.filter((r) => String(r.nombre || '').trim()),
        iso_payload: {
          accion: 'cierre_orden_trabajo',
          entidad: 'orden_trabajo',
          entidad_id: ot?.id || null,
          numero_ot: ot?.numero_ot || null,
          responsable: formData.responsable_cierre,
          usuario_id: user?.id || null,
          organization_id: perfil?.organization_id || null,
          estado_anterior: ot?.estado || null,
          estado_nuevo: formData.estado,
          fecha_hora: new Date().toISOString(),
          activo_id: ot?.maquina_id || ot?.activo_id || null,
          cliente_id: ot?.cliente_id || ot?.cliente?.id || null,
          criticidad_cierre: formData.criticidad_cierre,
          horas_fuera_servicio: Number(formData.horas_fuera_servicio || 0),
          causa_raiz: formData.causa_raiz,
          accion_correctiva: formData.accion_correctiva,
          accion_preventiva: formData.accion_preventiva,
          checklist,
          evidencias,
          observaciones: {
            diagnostico_final: formData.diagnostico_final,
            trabajo_realizado: formData.trabajo_realizado,
            observaciones_cliente: formData.observaciones_cliente,
            notas_internas: formData.notas_internas,
          },
        },
      })

      onClose()
    } catch (error) {
      toast.error(`Error al cerrar la ${ordenTrabajo}: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Finalizar ${ordenTrabajo} #${ot?.numero_ot || ''}`}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="bg-hm-surface2/30 p-4 border border-hm-border rounded-xl">
          <h3 className="font-mono text-hm-accent mb-4 tracking-widest text-sm">
            DATOS DEL {activoSingular.toUpperCase()}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`${medidor} final (${medidorUnidad})`}
              name="horometro_final"
              type="number"
              value={formData.horometro_final}
              onChange={handleChange}
              required
            />

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="mantenimiento_completo"
                name="mantenimiento_completo"
                checked={formData.mantenimiento_completo}
                onChange={handleChange}
                className="w-5 h-5 accent-hm-accent bg-hm-surface2 border-hm-border rounded focus:ring-hm-accent"
              />

              <label htmlFor="mantenimiento_completo" className="text-sm font-medium cursor-pointer">
                Resetear alerta de service
              </label>
            </div>
          </div>
        </div>

        <div className="bg-hm-surface2/30 p-4 border border-hm-border rounded-xl">
          <h3 className="font-mono text-hm-accent mb-4 tracking-widest text-sm">
            RESPONSABLE Y TRAZABILIDAD ISO
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Responsable del cierre"
              name="responsable_cierre"
              value={formData.responsable_cierre}
              onChange={handleChange}
              required
            />

            <Input
              label="Nombre de firmante / cliente"
              name="firma_cliente_nombre"
              value={formData.firma_cliente_nombre}
              onChange={handleChange}
              placeholder="Opcional. Preparado para firma digital."
            />
          </div>

          <div className="mt-4 text-xs text-hm-muted">
            El cierre genera estructura auditable con responsable, fecha/hora, estado anterior/nuevo, checklist, evidencias y observaciones.
          </div>
        </div>

        <div className="bg-hm-surface2/30 p-4 border border-hm-border rounded-xl">
          <h3 className="font-mono text-hm-accent mb-4 tracking-widest text-sm">
            ANÁLISIS TÉCNICO E IMPACTO OPERATIVO
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-hm-muted tracking-wider uppercase">
                Criticidad de cierre
              </label>

              <select
                name="criticidad_cierre"
                value={formData.criticidad_cierre}
                onChange={handleChange}
                className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>

            <Input
              label="Horas fuera de servicio"
              name="horas_fuera_servicio"
              type="number"
              step="0.5"
              value={formData.horas_fuera_servicio}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">
                Causa raíz *
              </label>

              <textarea
                name="causa_raiz"
                value={formData.causa_raiz}
                onChange={handleChange}
                className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text focus:outline-none focus:border-hm-accent min-h-[80px]"
                placeholder="Ej: desgaste, falta de mantenimiento, mala operación, falla de componente, condición externa..."
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">
                Acción correctiva realizada *
              </label>

              <textarea
                name="accion_correctiva"
                value={formData.accion_correctiva}
                onChange={handleChange}
                className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text focus:outline-none focus:border-hm-accent min-h-[80px]"
                placeholder="Qué se hizo concretamente para resolver el problema."
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">
                Acción preventiva / recomendación
              </label>

              <textarea
                name="accion_preventiva"
                value={formData.accion_preventiva}
                onChange={handleChange}
                className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text focus:outline-none focus:border-hm-accent min-h-[80px]"
                placeholder="Qué se recomienda para evitar recurrencia: mantenimiento, capacitación, inspección, cambio de hábito operativo..."
              />
            </div>
          </div>
        </div>

        <div className="bg-hm-surface2/30 p-4 border border-hm-border rounded-xl">
          <h3 className="font-mono text-hm-accent mb-4 tracking-widest text-sm">
            CHECKLIST OPERATIVO
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CHECKLIST_BASE.map((item) => (
              <label
                key={item.key}
                className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                  checklist[item.key]
                    ? 'border-green-500/40 bg-green-500/5 text-green-300'
                    : 'border-hm-border bg-hm-surface2/20 text-hm-muted hover:border-hm-accent/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checklist[item.key]}
                  onChange={() => handleChecklistChange(item.key)}
                  className="accent-green-400"
                />

                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">
              Diagnóstico final
            </label>

            <textarea
              name="diagnostico_final"
              value={formData.diagnostico_final}
              onChange={handleChange}
              className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors min-h-[100px]"
              placeholder="Diagnóstico confirmado al finalizar la intervención..."
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">
              Trabajo realizado
            </label>

            <textarea
              name="trabajo_realizado"
              value={formData.trabajo_realizado}
              onChange={handleChange}
              className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors min-h-[100px]"
              placeholder="Detalle técnico de tareas ejecutadas..."
            />
          </div>
        </div>

        <div className="bg-hm-surface2/30 p-4 border border-hm-border rounded-xl">
          <h3 className="font-mono text-hm-accent mb-4 tracking-widest text-sm">
            COSTOS DEL TRABAJO
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Horas trabajadas"
              name="horas_mano_obra"
              type="number"
              step="0.5"
              value={formData.horas_mano_obra}
              onChange={handleChange}
              required
            />

            <Input
              label="Precio hora (USD)"
              name="precio_hora_usd"
              type="number"
              step="0.01"
              value={formData.precio_hora_usd}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="bg-hm-surface2/30 p-4 border border-hm-border rounded-xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-mono text-hm-accent tracking-widest text-sm">
              {repuestoPlural.toUpperCase()} UTILIZADOS
            </h3>

            <button
              type="button"
              onClick={addRepuestoRow}
              className="text-xs font-mono text-hm-accent border border-hm-accent/30 hover:border-hm-accent rounded px-2 py-1 transition-colors"
            >
              + AGREGAR
            </button>
          </div>

          {repuestosUtilizados.length === 0 ? (
            <p className="text-xs text-hm-muted font-mono italic">
              Sin consumos registrados. Agregá piezas, repuestos o insumos si corresponde.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {repuestosUtilizados.map((r, i) => (
                <div key={`${r.repuesto_id || 'manual'}-${i}`} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {i === 0 && (
                      <label className="text-[9px] font-mono text-hm-muted mb-1 block uppercase">
                        Nombre / catálogo
                      </label>
                    )}

                    <select
                      value={r.repuesto_id || ''}
                      onChange={(e) =>
                        e.target.value
                          ? handleSelectCatalogo(i, e.target.value)
                          : updateRepuestoRow(i, 'repuesto_id', null)
                      }
                      className="w-full bg-hm-surface2 border border-hm-border rounded px-2 py-1.5 text-xs text-hm-text focus:outline-none focus:border-hm-accent mb-1"
                    >
                      <option value="">— libre —</option>
                      {catalogoRep.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Descripción"
                      value={r.nombre}
                      onChange={(e) => updateRepuestoRow(i, 'nombre', e.target.value)}
                      className="w-full bg-hm-surface2 border border-hm-border rounded px-2 py-1.5 text-xs text-hm-text placeholder-hm-muted focus:outline-none focus:border-hm-accent"
                    />
                  </div>

                  <div className="col-span-2">
                    {i === 0 && (
                      <label className="text-[9px] font-mono text-hm-muted mb-1 block uppercase">
                        Cant.
                      </label>
                    )}

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.cantidad}
                      onChange={(e) => updateRepuestoRow(i, 'cantidad', e.target.value)}
                      className="w-full bg-hm-surface2 border border-hm-border rounded px-2 py-1.5 text-xs text-hm-text focus:outline-none focus:border-hm-accent"
                    />
                  </div>

                  <div className="col-span-3">
                    {i === 0 && (
                      <label className="text-[9px] font-mono text-hm-muted mb-1 block uppercase">
                        Precio USD
                      </label>
                    )}

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.precio_unitario_usd}
                      onChange={(e) => updateRepuestoRow(i, 'precio_unitario_usd', e.target.value)}
                      className="w-full bg-hm-surface2 border border-hm-border rounded px-2 py-1.5 text-xs text-hm-text focus:outline-none focus:border-hm-accent"
                    />
                  </div>

                  <div className="col-span-1 text-right text-xs font-mono text-green-400 pb-1">
                    {formatUSD(Number(r.cantidad || 0) * Number(r.precio_unitario_usd || 0))}
                  </div>

                  <div className="col-span-1 flex justify-end pb-1">
                    <button
                      type="button"
                      onClick={() => removeRepuestoRow(i)}
                      className="text-red-400/60 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <div className="text-right text-xs font-mono text-hm-muted pt-1 border-t border-hm-border">
                Subtotal consumos:{' '}
                <span className="text-green-400 font-bold">
                  {formatUSD(totalRepuestos)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">
            Observaciones para cliente / responsable
          </label>

          <textarea
            name="observaciones_cliente"
            value={formData.observaciones_cliente}
            onChange={handleChange}
            className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors min-h-[90px]"
            placeholder="Recomendaciones, pendientes, condiciones de uso, próximos pasos..."
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">
            Evidencias / fotos / documentos {requiereEvidenciaObligatoria ? '*' : ''}
          </label>

          <textarea
            name="evidencia_descripcion"
            value={formData.evidencia_descripcion}
            onChange={handleChange}
            className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors min-h-[80px]"
            placeholder={
              requiereEvidenciaObligatoria
                ? 'Obligatorio para cierres de criticidad alta o crítica.'
                : 'Descripción de evidencias tomadas. Base preparada para adjuntar fotos/documentos desde App Campo.'
            }
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">
            Notas internas
          </label>

          <textarea
            name="notas_internas"
            value={formData.notas_internas}
            onChange={handleChange}
            className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors min-h-[80px]"
            placeholder="Observaciones internas del equipo técnico..."
          />
        </div>

        <div className="bg-hm-surface2/30 p-4 border border-hm-border rounded-xl">
          <h3 className="font-mono text-hm-accent mb-3 tracking-widest text-sm">
            NPS CLIENTE — OPCIONAL
          </h3>

          <p className="text-xs text-hm-muted mb-3">
            Puntuación del cliente al cerrar el servicio.
          </p>

          <div className="flex gap-1.5 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    nps_score: prev.nps_score === n ? null : n,
                  }))
                }
                className={`w-9 h-9 rounded text-xs font-bold border transition-all ${
                  formData.nps_score === n
                    ? n <= 6
                      ? 'bg-red-500 border-red-500 text-white'
                      : n <= 8
                        ? 'bg-yellow-500 border-yellow-500 text-black'
                        : 'bg-green-500 border-green-500 text-white'
                    : 'bg-hm-surface2 border-hm-border text-hm-muted hover:border-hm-accent/50'
                }`}
              >
                {n}
              </button>
            ))}

            {formData.nps_score && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, nps_score: null }))}
                className="px-2 text-xs text-hm-muted hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="bg-hm-surface2 p-4 rounded flex justify-between items-center border border-hm-border">
          <div className="flex flex-col">
            <span className="text-xs font-mono text-hm-muted uppercase">
              Total consumos: {formatUSD(totalRepuestos)}
            </span>
            <span className="text-xs font-mono text-hm-muted uppercase">
              Total mano de obra: {formatUSD(totalManoObra)}
            </span>
            <span className="text-xs font-mono text-hm-muted uppercase">
              Horas fuera de servicio: {Number(formData.horas_fuera_servicio || 0)}
            </span>
            <span className="text-xs font-mono text-hm-muted uppercase">
              Checklist: {checklistCompleto ? 'Completo' : 'Pendiente'}
            </span>
          </div>

          <div className="text-right">
            <div className="text-xs font-mono text-hm-muted uppercase mb-1">
              Costo total
            </div>
            <div className="text-2xl font-bold text-green-400">
              {formatUSD(totalOT)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-hm-border">
          <div className="flex items-center gap-2">
            <select
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors"
            >
              <option value="completada">Marcar como completada</option>
              <option value="facturada">Marcar y pasar a facturada</option>
            </select>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              CANCELAR
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? 'GUARDANDO...' : `CERRAR ${ordenTrabajo.toUpperCase()}`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}