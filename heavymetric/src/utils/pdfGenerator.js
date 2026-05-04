import jsPDF from 'jspdf'
import 'jspdf-autotable'

// ─── Paleta corporativa HeavyMetric ───────────────────────────────────────────
const C = {
  DARK:    [15,  23,  42],   // #0F172A — fondo header
  ORANGE:  [245, 158, 11],   // #F59E0B — acento HeavyMetric
  GRAY:    [71,  85,  105],  // slate-600
  LIGHT:   [248, 250, 252],  // slate-50
  WHITE:   [255, 255, 255],
  BLACK:   [15,  23,  42],
  MUTED:   [148, 163, 184],  // slate-400
  BORDER:  [226, 232, 240],  // slate-200
}

const fmt = (n) => `USD ${Number(n || 0).toFixed(2)}`
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

// ─── Helpers de layout ────────────────────────────────────────────────────────
function header(doc, titulo, numero) {
  const W = doc.internal.pageSize.width

  // Banda superior oscura
  doc.setFillColor(...C.DARK)
  doc.rect(0, 0, W, 42, 'F')

  // Franja naranja inferior del header
  doc.setFillColor(...C.ORANGE)
  doc.rect(0, 38, W, 4, 'F')

  // Logo texto
  doc.setTextColor(...C.WHITE)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('HEAVY', 14, 22)
  doc.setTextColor(...C.ORANGE)
  doc.text('METRIC', 14 + doc.getTextWidth('HEAVY'), 22)

  doc.setTextColor(...C.MUTED)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Knock S.A. — Sistema de Gestión Operativa', 14, 30)

  // Título documento (derecha)
  doc.setTextColor(...C.WHITE)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, W - 14, 20, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.ORANGE)
  doc.text(`Nro. ${numero}`, W - 14, 29, { align: 'right' })
}

function sectionTitle(doc, txt, y) {
  doc.setFillColor(...C.DARK)
  doc.rect(14, y - 4, doc.internal.pageSize.width - 28, 7, 'F')
  doc.setTextColor(...C.ORANGE)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text(txt.toUpperCase(), 16, y + 0.5)
  return y + 8
}

function labelValue(doc, label, value, x, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...C.GRAY)
  doc.text(label.toUpperCase(), x, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.BLACK)
  doc.text(String(value || '—'), x, y + 5)
}

// ─── PDF de Contrato de Alquiler ─────────────────────────────────────────────
export const generateAlquilerPDF = (contrato) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.width
  const M = 14  // margen

  // ── PÁGINA 1 ──────────────────────────────────────────────────────────────
  header(doc, 'CONTRATO DE ALQUILER', `#${contrato.numero_contrato}`)

  // Fecha de emisión
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.setFontSize(8)
  doc.setTextColor(...C.MUTED)
  doc.setFont('helvetica', 'normal')
  doc.text(`Emitido: ${hoy}`, W - M, 48, { align: 'right' })

  // ── DATOS DEL LOCADOR ─────────────────────────────────────────────────────
  let y = 54
  y = sectionTitle(doc, '1. Datos del Locador', y)

  labelValue(doc, 'Razón Social',  'Knock S.A.',                       M,        y)
  labelValue(doc, 'CUIT',          '30-71234567-8',                    M + 65,   y)
  labelValue(doc, 'Condición IVA', 'Responsable Inscripto',            M + 110,  y)
  y += 14

  labelValue(doc, 'Domicilio Comercial', 'Av. Industrial 1234, CABA',  M,        y)
  labelValue(doc, 'Contacto',            'operaciones@knocksa.com.ar', M + 110,  y)
  y += 16

  // ── DATOS DEL LOCATARIO ───────────────────────────────────────────────────
  y = sectionTitle(doc, '2. Datos del Locatario', y)

  labelValue(doc, 'Razón Social',   contrato.cliente_nombre,           M,        y)
  labelValue(doc, 'Condición IVA',  contrato.condicion_iva || '—',     M + 110,  y)
  y += 16

  // ── OBJETO DEL CONTRATO ───────────────────────────────────────────────────
  y = sectionTitle(doc, '3. Objeto del Contrato — Equipo', y)

  labelValue(doc, 'Identificación',  contrato.nombre_unidad,           M,        y)
  labelValue(doc, 'Marca / Modelo',  `${contrato.marca} ${contrato.modelo}`, M + 75, y)
  labelValue(doc, 'Patente / Serie', contrato.patente || '—',          M + 140,  y)
  y += 16

  // ── PERÍODO Y CONDICIONES ECONÓMICAS ─────────────────────────────────────
  y = sectionTitle(doc, '4. Período y Condiciones Económicas', y)

  const diasContrato = Math.max(1, Math.ceil(
    (new Date(contrato.fecha_fin) - new Date(contrato.fecha_inicio)) / 86400000
  ))

  doc.autoTable({
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    headStyles: { fillColor: C.DARK, textColor: C.ORANGE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: C.BLACK },
    alternateRowStyles: { fillColor: C.LIGHT },
    columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 42 }, 2: { cellWidth: 25, halign: 'center' }, 3: { cellWidth: 35, halign: 'right' }, 4: { cellWidth: 35, halign: 'right' } },
    head: [['INICIO', 'VENCIMIENTO', 'DÍAS', 'TARIFA DIARIA', 'TOTAL PROYECTADO']],
    body: [[
      fmtDate(contrato.fecha_inicio),
      fmtDate(contrato.fecha_fin),
      diasContrato,
      fmt(contrato.tarifa_diaria_usd),
      fmt(contrato.total_contrato_usd)
    ]]
  })
  y = doc.lastAutoTable.finalY + 6

  // Depósito de garantía
  if (contrato.deposito_usd > 0) {
    doc.setFillColor(...C.LIGHT)
    doc.setDrawColor(...C.BORDER)
    doc.roundedRect(M, y, W - M * 2, 9, 1, 1, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...C.GRAY)
    doc.text('DEPÓSITO DE GARANTÍA:', M + 3, y + 5.5)
    doc.setTextColor(...C.ORANGE)
    doc.text(fmt(contrato.deposito_usd), W - M - 3, y + 5.5, { align: 'right' })
    y += 14
  } else {
    y += 4
  }

  // ── CLÁUSULAS GENERALES ───────────────────────────────────────────────────
  y = sectionTitle(doc, '5. Cláusulas Generales', y)

  const clausulas = [
    '1. El Locatario recibirá el equipo en perfecto estado de funcionamiento y se compromete a devolverlo en idénticas condiciones, salvo desgaste normal de uso.',
    '2. Queda prohibido el subalquiler, cesión o transferencia del equipo a terceros sin autorización escrita del Locador.',
    '3. El combustible, lubricantes y consumibles durante el período de alquiler corren por cuenta exclusiva del Locatario.',
    '4. En caso de avería por mal uso, el Locatario asume el costo total de la reparación según presupuesto aprobado por el Locador.',
    '5. El pago deberá efectuarse dentro de los 10 días corridos de emitida la factura correspondiente. Pasado dicho plazo, se aplicará un interés punitorio del 3% mensual.',
    '6. El depósito de garantía será devuelto íntegramente dentro de los 5 días hábiles posteriores a la devolución del equipo en buen estado.',
    '7. Cualquier controversia que surja del presente contrato será sometida a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.',
  ]

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.GRAY)

  clausulas.forEach((c) => {
    const lines = doc.splitTextToSize(c, W - M * 2)
    if (y + lines.length * 4.5 > 255) {
      doc.addPage()
      header(doc, 'CONTRATO DE ALQUILER', `#${contrato.numero_contrato}`)
      y = 52
    }
    doc.text(lines, M, y)
    y += lines.length * 4.5 + 2
  })

  y += 6

  // Condiciones especiales del contrato
  if (contrato.condiciones) {
    y = sectionTitle(doc, '6. Condiciones Especiales Pactadas', y)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...C.BLACK)
    const lines = doc.splitTextToSize(contrato.condiciones, W - M * 2)
    doc.text(lines, M, y)
    y += lines.length * 5 + 8
  }

  // ── CUADRO DE FIRMAS ─────────────────────────────────────────────────────
  if (y > 245) { doc.addPage(); header(doc, 'CONTRATO DE ALQUILER', `#${contrato.numero_contrato}`); y = 52 }

  y = Math.max(y, 235) // empujar al fondo de la página
  const colW = (W - M * 2 - 10) / 2

  // Firma Locador
  doc.setDrawColor(...C.BORDER)
  doc.setLineWidth(0.3)
  doc.line(M, y, M + colW, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...C.DARK)
  doc.text('Knock S.A. — Locador', M, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...C.MUTED)
  doc.text('Firma y Sello', M, y + 9)

  // Firma Locatario
  const x2 = M + colW + 10
  doc.line(x2, y, x2 + colW, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...C.DARK)
  doc.text(contrato.cliente_nombre, x2, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...C.MUTED)
  doc.text('Locatario — Firma y Aclaración', x2, y + 9)

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pH = doc.internal.pageSize.height
    doc.setFillColor(...C.DARK)
    doc.rect(0, pH - 10, W, 10, 'F')
    doc.setFontSize(7)
    doc.setTextColor(...C.MUTED)
    doc.setFont('helvetica', 'normal')
    doc.text('HeavyMetric — Knock S.A. | Documento generado por sistema. Original válido con firmas de ambas partes.', M, pH - 4)
    doc.text(`Pág. ${i} / ${pageCount}`, W - M, pH - 4, { align: 'right' })
  }

  doc.save(`Contrato_Alquiler_${contrato.numero_contrato}_${contrato.cliente_nombre.replace(/\s+/g, '_')}.pdf`)
}

// ─── PDF de Orden de Trabajo ─────────────────────────────────────────────────
export const generateOTPDF = (ot) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.width
  const M = 14

  header(doc, 'ORDEN DE TRABAJO', `OT-${ot.numero_ot}`)

  let y = 52
  y = sectionTitle(doc, 'Datos del Cliente', y)
  labelValue(doc, 'Razón Social', ot.cliente?.razon_social || '—', M,       y)
  labelValue(doc, 'ID Registro',  ot.cliente_id?.split('-')[0],    M + 95,  y)
  y += 14

  y = sectionTitle(doc, 'Datos del Equipo', y)
  labelValue(doc, 'Unidad',        ot.maquina?.nombre_unidad || '—',                        M,       y)
  labelValue(doc, 'Marca / Modelo',`${ot.maquina?.marca || ''} ${ot.maquina?.modelo || ''}`,M + 75, y)
  labelValue(doc, 'Horómetro',     `${ot.maquina?.horometro_actual || 0} hrs`,              M + 140, y)
  y += 14

  y = sectionTitle(doc, 'Descripción del Trabajo', y)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.BLACK)
  const desc = doc.splitTextToSize(ot.descripcion_trabajo || 'Sin descripción.', W - M * 2)
  doc.text(desc, M, y)
  y += desc.length * 5 + 8

  const repRows = (ot.repuestos || []).map(r => [
    r.inventario_id?.split('-')[0] || '—',
    r.descripcion || 'Repuesto',
    r.cantidad,
    fmt(r.precio_usd),
    fmt(r.subtotal_usd)
  ])
  repRows.push(['MO', 'Mano de Obra', `${ot.horas_mano_obra || 0} hs`, fmt(ot.precio_hora_usd || 45), fmt(ot.total_mano_obra_usd || 0)])

  doc.autoTable({
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    headStyles: { fillColor: C.DARK, textColor: C.ORANGE, fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: C.LIGHT },
    head: [['SKU', 'CONCEPTO', 'CANT.', 'P. UNIT.', 'SUBTOTAL']],
    body: repRows
  })

  const fY = doc.lastAutoTable.finalY + 6
  doc.setFillColor(...C.DARK)
  doc.roundedRect(M, fY, W - M * 2, 10, 1, 1, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.WHITE)
  doc.text('TOTAL FINAL:', M + 4, fY + 6.5)
  doc.setTextColor(...C.ORANGE)
  doc.text(fmt(ot.total_usd), W - M - 4, fY + 6.5, { align: 'right' })

  // Footer
  const pH = doc.internal.pageSize.height
  doc.setFillColor(...C.DARK)
  doc.rect(0, pH - 10, W, 10, 'F')
  doc.setFontSize(7)
  doc.setTextColor(...C.MUTED)
  doc.text('HeavyMetric — Knock S.A. | Comprobante interno de operaciones.', M, pH - 4)
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, W - M, pH - 4, { align: 'right' })

  doc.save(`OT_${ot.numero_ot}_${ot.cliente?.razon_social?.replace(/\s+/g, '_') || 'cliente'}.pdf`)
}
