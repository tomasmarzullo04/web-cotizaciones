import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType } from 'docx'
import { saveAs } from 'file-saver'

// Import or redefine the rate constants if needed for cost breakdown in PDF
const RATES: Record<string, number> = {
    data_analyst: 2500,
    data_science: 5100,
    bi_developer: 4128,
    data_engineer: 4950,
    power_apps: 4000,
    react_dev: 4500,
    power_automate: 4000
}

interface QuoteState {
    clientName: string
    description: string
    complexity: string
    updateFrequency: string
    roles: Record<string, number>
    pipelinesCount: number
    notebooksCount: number
    manualProcessPct: number
    automationsCount: number
    pipelineExecutions: number
    reportsCount: number
    reportUsers: number
    isFinancialOrSales: boolean
    techStack: string[]
    dsModelsCount: number
    dashboardsCount: number
    criticitness: {
        enabled: boolean
        level: string
        impactOperative: string
        impactFinancial: string
        countriesCount: number
    }
    durationMonths: number
    supportHours: 'business' | '24/7'
}

// -- CSV Export --
export function downloadCSV(data: any[], filename: string) {
    if (!data || !data.length) return

    const separator = ','
    const keys = Object.keys(data[0])
    const csvContent =
        keys.join(separator) +
        '\n' +
        data.map(row => {
            return keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k]
                cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""')
                if (cell.search(/("|,|\n)/g) >= 0) {
                    cell = `"${cell}"`
                }
                return cell
            }).join(separator)
        }).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `${filename}.csv`)
}

// -- PDF Export --
export async function exportToPDF(data: QuoteState & { totalMonthlyCost: number, l2SupportCost: number, riskCost: number, totalWithRisk: number, criticitnessLevel: any }) {
    const doc = new jsPDF()
    const margin = 20
    let y = 20

    // Title
    doc.setFontSize(22)
    doc.setFont("helvetica", "bold")
    doc.text("Propuesta Técnica y Económica", margin, y)
    y += 10
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`Cliente: ${data.clientName || 'N/A'}`, margin, y)
    y += 7
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, y)
    y += 15

    // 1. Executive Summary
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("1. Resumen Ejecutivo (Alcance)", margin, y)
    y += 8
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const descLines = doc.splitTextToSize(data.description || 'Sin descripción.', 170)
    doc.text(descLines, margin, y)
    y += (descLines.length * 5) + 5

    doc.text(`Complejidad: ${data.complexity.toUpperCase()} | Frecuencia: ${data.updateFrequency.toUpperCase()}`, margin, y)
    y += 6
    doc.text(`Horario Soporte: ${data.supportHours === '24/7' ? '24/7 CRITICAL' : 'BUSINESS HOURS (9-18)'}`, margin, y)
    y += 15

    // 2. Technical Volumetry
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("2. Volumetría Técnica", margin, y)
    y += 8
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`• Pipelines/Extracciones: ${data.pipelinesCount}`, margin + 5, y); y += 6
    doc.text(`• Notebooks Databricks: ${data.notebooksCount}`, margin + 5, y); y += 6
    doc.text(`• Ejecuciones/Mes: ${data.pipelineExecutions}`, margin + 5, y); y += 6
    doc.text(`• Procesos Manuales: ${data.manualProcessPct}%`, margin + 5, y); y += 6
    doc.text(`• Modelos ML: ${data.dsModelsCount}`, margin + 5, y); y += 6
    doc.text(`• Dashboards/Reportes: ${data.dashboardsCount + data.reportsCount}`, margin + 5, y); y += 10

    // 3. User & Impact
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("3. Impacto y Usuarios", margin, y)
    y += 8
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`• Usuarios Finales: ${data.reportUsers}`, margin + 5, y); y += 6
    doc.text(`• Uso Crítico (Financiero/Ventas): ${data.isFinancialOrSales ? 'SÍ' : 'NO'}`, margin + 5, y); y += 10

    // 4. Criticitness (If enabled)
    if (data.criticitness.enabled) {
        doc.setFontSize(16)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(200, 0, 0)
        doc.text("4. Evaluación de Criticidad", margin, y)
        doc.setTextColor(0, 0, 0)
        y += 8
        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.text(`• Impacto Operativo: ${data.criticitness.impactOperative.toUpperCase()}`, margin + 5, y); y += 6
        doc.text(`• Impacto Financiero: ${data.criticitness.impactFinancial.toUpperCase()}`, margin + 5, y); y += 6
        doc.text(`• Países: ${data.criticitness.countriesCount}`, margin + 5, y); y += 6
        // Recalculate basic score for PDF context if needed, or assume it's implicit in the risk cost
        doc.text(`• Margen de Riesgo Aplicado: ${(data.criticitnessLevel?.margin || 0) * 100}%`, margin + 5, y); y += 10
    }

    // New Page for Costs?
    if (y > 200) { doc.addPage(); y = 20; }

    // 5. Team & Investment
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("5. Inversión y Equipo", margin, y)
    y += 10

    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Role", margin, y)
    doc.text("Cant.", margin + 60, y)
    doc.text("Rate Mensual", margin + 90, y)
    doc.text("Subtotal", margin + 140, y)
    y += 2
    doc.line(margin, y, 190, y) // Horizontal line
    y += 6

    doc.setFont("helvetica", "normal")
    let totalMonthly = 0
    Object.entries(data.roles).forEach(([role, count]) => {
        if (count > 0) {
            const rate = RATES[role] || 0
            const sub = count * rate
            totalMonthly += sub
            doc.text(role.replace('_', ' ').toUpperCase(), margin, y)
            doc.text(count.toString(), margin + 65, y)
            doc.text(`$${rate.toLocaleString()}`, margin + 90, y)
            doc.text(`$${sub.toLocaleString()}`, margin + 140, y)
            y += 6
        }
    })

    // Add L2 Support Line
    if (data.l2SupportCost > 0) {
        doc.setTextColor(0, 100, 200)
        doc.text("SOPORTE L2 (10% L1)", margin, y)
        doc.text("AUTO", margin + 65, y)
        doc.text("-", margin + 90, y)
        doc.text(`$${data.l2SupportCost.toLocaleString()}`, margin + 140, y)
        doc.setTextColor(0, 0, 0)
        y += 6
    }

    // Add Risk Margin Line
    if (data.riskCost > 0) {
        doc.setTextColor(200, 100, 0)
        doc.text(`RIESGO OPERATIVO`, margin, y)
        doc.text("AUTO", margin + 65, y)
        doc.text(`${(data.criticitnessLevel?.margin || 0) * 100}%`, margin + 90, y)
        doc.text(`$${data.riskCost.toLocaleString()}`, margin + 140, y)
        doc.setTextColor(0, 0, 0)
        y += 6
    }

    y += 4
    doc.line(margin, y, 190, y)
    y += 8
    doc.setFont("helvetica", "bold")
    doc.text(`TOTAL MENSUAL: $${data.totalWithRisk.toLocaleString()}`, margin + 90, y)
    y += 10
    doc.setFontSize(14)
    const totalProject = data.totalWithRisk * data.durationMonths
    doc.text(`INVERSIÓN TOTAL (${data.durationMonths} meses): $${totalProject.toLocaleString()}`, margin, y)

    doc.save(`cotizacion_${data.clientName.replace(/\s+/g, '_') || 'proyecto'}.pdf`)
}

// -- Word Export --
export async function exportToWord(data: QuoteState) {
    // Basic implementation for brevity, typically mirrors PDF structure
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: "Propuesta de Arquitectura de Datos", heading: HeadingLevel.HEADING_1 }),
                new Paragraph({ text: `Cliente: ${data.clientName}` }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "1. Resumen Ejecutivo", heading: HeadingLevel.HEADING_2 }),
                new Paragraph({ text: data.description }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "2. Inversión", heading: HeadingLevel.HEADING_2 }),
                new Paragraph({ text: `Duración: ${data.durationMonths} meses` }),
                // Add more specific logic here if needed, keeping it simple to avoid huge file size right now
            ]
        }]
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `cotizacion_${data.clientName || 'proyecto'}.docx`)
}
