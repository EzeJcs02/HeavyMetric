import HorometroBar from '../ui/HorometroBar'

export default function MaquinaRow({ maquina, onClickDetalle, onEdit }) {
  return (
    <tr className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors group">
      <td className="p-4 font-bold">{maquina.nombre_unidad}</td>
      <td className="p-4 font-mono text-hm-muted">{maquina.marca} {maquina.modelo}</td>
      <td className="p-4 font-mono text-sm">{maquina.patente}</td>
      <td className="p-4 text-sm">{maquina.cliente_nombre || 'STOCK'}</td>
      <td className="p-4 w-[200px]">
        <HorometroBar actual={maquina.horometro_actual} max={maquina.frecuencia_service} />
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-hm-muted hover:text-hm-accent font-mono text-xs border border-hm-border rounded px-2 py-1 hover:border-hm-accent transition-colors"
            >
              EDITAR
            </button>
          )}
          <button
            onClick={onClickDetalle}
            className="text-hm-accent hover:text-yellow-400 font-mono text-sm"
          >
            VER FICHA →
          </button>
        </div>
      </td>
    </tr>
  )
}
