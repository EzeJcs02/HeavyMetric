/**
 * pdfGenerator.js
 * Motor base para generar PDFs desde componentes de React usando html2canvas y jsPDF.
 * Configurado para formato A4.
 */

import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Genera y descarga un PDF a partir del ID de un elemento HTML.
 * @param {string} elementId - ID del contenedor a exportar.
 * @param {string} filename - Nombre del archivo a descargar (ej: 'cotizacion-001.pdf').
 * @param {object} options - Opciones adicionales.
 */
export const generarPDF = async (elementId, filename = 'documento.pdf', options = {}) => {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`Elemento con ID ${elementId} no encontrado para generar PDF.`)
    return false
  }

  try {
    // Configuramos html2canvas para mejor calidad
    const canvas = await html2canvas(element, {
      scale: 2, // Aumenta la resolución
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    const imgData = canvas.toDataURL('image/png')
    
    // Configuramos PDF en formato A4 (210x297mm)
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(filename)
    return true
  } catch (error) {
    console.error('Error generando PDF:', error)
    return false
  }
}
