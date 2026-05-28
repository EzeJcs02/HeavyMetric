import { useMemo } from 'react'

import Modal from '../../ui/Modal'
import Button from '../../ui/Button'

import ActivoHeader from './ActivoHeader'
import ActivoOperationalData from './ActivoOperationalData'
import ActivoServicePanel from './ActivoServicePanel'
import ActivoCostPanel from './ActivoCostPanel'
import ActivoTimelinePanel from './ActivoTimelinePanel'
import ActivoDocumentsPanel from './ActivoDocumentsPanel'
import ActivoChecklistPanel from './ActivoChecklistPanel'
import ActivoRentalPanel from './ActivoRentalPanel'
import ActivoPredictivePanel from './ActivoPredictivePanel'

export default function FichaActivo({
  isOpen,
  onClose,
  activo,
  ots = [],
  contratos = [],
  stats = {},
  orgId,
}) {
  const healthScore = useMemo(() => {
    if (!activo) return 100

    let score = Number(
      activo?.score_disponibilidad || 100
    )

    if (activo?.estado_operativo === 'Fuera de servicio') score -= 30
    if (activo?.estado_operativo === 'En taller') score -= 15
    if (activo?.estado_operativo === 'Esperando repuesto') score -= 25
    if (activo?.estado_operativo === 'En mantenimiento') score -= 10

    return Math.max(
      0,
      Math.min(100, score)
    )
  }, [activo])

  if (!activo) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-7xl"
    >
      <div className="flex flex-col gap-6">
        <ActivoHeader
          activo={activo}
          ots={ots}
          stats={stats}
          healthScore={healthScore}
          onClose={onClose}
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1 flex flex-col gap-4">
            <ActivoOperationalData
              activo={activo}
            />

            <ActivoServicePanel
              activo={activo}
              ots={ots}
            />

            <ActivoDocumentsPanel
              activo={activo}
              documentos={activo?.documentos || []}
            />

            <ActivoChecklistPanel
              activo={activo}
              checklist={activo?.checklist || []}
            />

            <ActivoRentalPanel
              activo={activo}
              contratos={contratos}
            />
          </div>

          <div className="xl:col-span-2 flex flex-col gap-4">
            <ActivoPredictivePanel
              activo={activo}
              ots={ots}
            />

            <ActivoCostPanel
              activo={activo}
              ots={ots}
              contratos={contratos}
              stats={stats}
            />

            <ActivoTimelinePanel
              activo={activo}
              orgId={orgId}
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-hm-border pt-4">
          <Button
            variant="outline"
            onClick={onClose}
          >
            CERRAR
          </Button>
        </div>
      </div>
    </Modal>
  )
}