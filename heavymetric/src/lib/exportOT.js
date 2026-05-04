import jsPDF from 'jspdf'

function line(doc, y) {
  doc.setDrawColor(60, 65, 80)
  doc.line(14, y, 196, y)
}

function label(doc, text, x, y) {
  doc.setFontSize(7.5)
  doc.setTextColor(120, 130, 155)
  doc.text(text.toUpperCase(), x, y)
}

function value(doc, text, x, y, color = [220, 224, 236]) {
  doc.setFontSize(9.5)
  doc.setTextColor(...color)
  doc.text(String(text ?? '—'), x, y)
}

function formatUSD(n) {
  return `USD ${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

export function exportarOTPdf(ot, maquina) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, pageH = 297

  // ── Fondo oscuro ──
  doc.setFillColor(12, 14, 20)
  doc.rect(0, 0, W, pageH, 'F')

  // ── Banda superior ──
  doc.setFillColor(20, 23, 32)
  doc.rect(0, 0, W, 28, 'F')

  // Logo / título
  doc.setFontSize(18)
  doc.setTextColor(240, 165, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('HEAVYMETRIC', 14, 13)

  doc.setFontSize(8)
  doc.setTextColor(92, 98, 120)
  doc.setFont('helvetica', 'normal')
  doc.text('Gestión de Maquinaria Pesada', 14, 19)

  // OT número (derecha)
  doc.setFontSize(20)
  doc.setTextColor(240, 165, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(`OT #${ot.numero_ot}`, W - 14, 13, { align: 'right' })

  doc.setFontSize(8)
  doc.setTextColor(92, 98, 120)
  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha: ${ot.fecha_ingreso || '—'}`, W - 14, 19, { align: 'right' })

  // ── Sección máquina ──
  let y = 38
  doc.setFontSize(8)
  doc.setTextColor(240, 165, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('UNIDAD', 14, y)
  line(doc, y + 2)
  y += 9

  const campos = [
    ['Nombre',  maquina?.nombre_unidad],
    ['Marca / Modelo', `${maquina?.marca || ''} ${maquina?.modelo || ''}`],
    ['Patente', maquina?.patente],
    ['Horómetro', `${maquina?.horometro_actual || 0} hrs`],
  ]
  const colW = 45
  campos.forEach(([lbl, val], i) => {
    const x = 14 + (i % 2) * 90
    if (i % 2 === 0 && i > 0) y += 12
    label(doc, lbl, x, y)
    value(doc, val, x, y + 5)
  })
  y += 18

  // ── Descripción del trabajo ──
  doc.setFontSize(8)
  doc.setTextColor(240, 165, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('DESCRIPCIÓN DEL TRABAJO', 14, y)
  line(doc, y + 2)
  y += 9

  doc.setFontSize(9)
  doc.setTextColor(220, 224, 236)
  doc.setFont('helvetica', 'normal')
  const descLines = doc.splitTextToSize(ot.descripcion_trabajo || 'Sin descripción.', 182)
  doc.text(descLines, 14, y)
  y += descLines.length * 5 + 8

  // ── Repuestos ──
  const repuestos = ot.repuestos || []
  doc.setFontSize(8)
  doc.setTextColor(240, 165, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('REPUESTOS Y MATERIALES', 14, y)
  line(doc, y + 2)
  y += 8

  if (repuestos.length === 0) {
    value(doc, 'Sin repuestos registrados.', 14, y, [92, 98, 120])
    y += 7
  } else {
    // Encabezados
    doc.setFontSize(7.5)
    doc.setTextColor(92, 98, 120)
    doc.text('DESCRIPCIÓN', 14, y)
    doc.text('CANT.', 110, y)
    doc.text('P. UNIT.', 135, y)
    doc.text('SUBTOTAL', 170, y)
    y += 2
    line(doc, y)
    y += 4

    repuestos.forEach(r => {
      const subtotal = Number(r.cantidad || 0) * Number(r.precio_unitario_usd || 0)
      value(doc, r.descripcion, 14, y)
      value(doc, r.cantidad, 110, y)
      value(doc, formatUSD(r.precio_unitario_usd), 135, y)
      value(doc, formatUSD(subtotal), 170, y)
      y += 6
    })
  }
  y += 4

  // ── Mano de obra ──
  doc.setFontSize(8)
  doc.setTextColor(240, 165, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('MANO DE OBRA', 14, y)
  line(doc, y + 2)
  y += 9

  const moItems = ot.mano_obra || []
  if (moItems.length === 0) {
    label(doc, 'Horas', 14, y)
    value(doc, `${ot.horas_mano_obra || 0} hs`, 14, y + 5)
    label(doc, 'Costo mano de obra', 90, y)
    value(doc, formatUSD(ot.costo_mano_obra_usd), 90, y + 5)
    y += 14
  } else {
    moItems.forEach(m => {
      value(doc, `${m.descripcion} — ${m.horas}h × ${formatUSD(m.tarifa_hora_usd)}/h`, 14, y)
      value(doc, formatUSD(m.horas * m.tarifa_hora_usd), 170, y)
      y += 6
    })
    y += 4
  }

  // ── Totales ──
  line(doc, y)
  y += 8

  const totalRepuestos = repuestos.reduce((a, r) => a + Number(r.cantidad || 0) * Number(r.precio_unitario_usd || 0), 0)
  const totalMO = moItems.length > 0
    ? moItems.reduce((a, m) => a + m.horas * m.tarifa_hora_usd, 0)
    : Number(ot.costo_mano_obra_usd || 0)
  const totalOT = Number(ot.total_usd || totalRepuestos + totalMO)

  const totalesX = 130
  label(doc, 'Subtotal Repuestos', totalesX, y)
  value(doc, formatUSD(totalRepuestos), 185, y, [220, 224, 236])
  y += 7
  label(doc, 'Subtotal Mano de Obra', totalesX, y)
  value(doc, formatUSD(totalMO), 185, y, [220, 224, 236])
  y += 3
  line(doc, y)
  y += 6
  doc.setFontSize(11)
  doc.setTextColor(240, 165, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', totalesX, y)
  doc.text(formatUSD(totalOT), 185, y, { align: 'right' })

  // ── Notas internas ──
  if (ot.notas_internas) {
    y += 14
    doc.setFontSize(8)
    doc.setTextColor(240, 165, 0)
    doc.setFont('helvetica', 'bold')
    doc.text('NOTAS INTERNAS', 14, y)
    line(doc, y + 2)
    y += 8
    doc.setFontSize(8.5)
    doc.setTextColor(92, 98, 120)
    doc.setFont('helvetica', 'italic')
    const notasLines = doc.splitTextToSize(ot.notas_internas, 182)
    doc.text(notasLines, 14, y)
  }

  // ── Footer ──
  doc.setFontSize(7)
  doc.setTextColor(60, 65, 80)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado por HeavyMetric — ${new Date().toLocaleDateString('es-AR')}`, W / 2, pageH - 8, { align: 'center' })

  doc.save(`OT-${ot.numero_ot}-${maquina?.nombre_unidad || 'unidad'}.pdf`)
}
