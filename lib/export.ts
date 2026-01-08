import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, ImageRun, ShadingType } from 'docx'
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
export async function exportToPDF(data: QuoteState & { totalMonthlyCost: number, l2SupportCost: number, riskCost: number, totalWithRisk: number, criticitnessLevel: any, diagramImage?: string }) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 20

    // Colors
    const COLOR_GOLD = '#D4AF37'
    const COLOR_CHARCOAL = '#333533'
    const COLOR_TEXT = '#454545'

    // --- PAGE 1: INFO & VOLUMETRY ---

    // Header P1
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("COTIZACIÓN TÉCNICA", margin, 30)

    // Metadata Box P1
    doc.setDrawColor(212, 175, 55) // Gold
    doc.setLineWidth(0.5)
    doc.rect(pageWidth - margin - 70, 20, 70, 25)
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(COLOR_GOLD)
    doc.text("INFORMACIÓN DEL PROYECTO", pageWidth - margin - 65, 26)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(COLOR_TEXT)
    doc.text(`ID: ${new Date().getTime().toString().substr(-6)}`, pageWidth - margin - 65, 32)
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, pageWidth - margin - 65, 37)
    doc.text(`Cliente: ${data.clientName || 'N/A'}`, pageWidth - margin - 65, 42)

    let y = 60

    // 1. Client & Objective
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("1. Resumen Estratégico", margin, y)
    y += 10

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(COLOR_TEXT)
    const descLines = doc.splitTextToSize(data.description || 'Sin descripción detallada.', pageWidth - (margin * 2))
    doc.text(descLines, margin, y, { align: 'justify', maxWidth: pageWidth - (margin * 2) })
    y += (descLines.length * 5) + 15

    // 2. Executive Summary Bullets
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("2. Alcance y Volumetría", margin, y)
    y += 10

    const bullets = [
        `Complejidad: ${data.complexity.toUpperCase()}`,
        `Frecuencia: ${data.updateFrequency.toUpperCase()}`,
        `Volumetría: ${data.pipelinesCount} Pipelines, ${data.notebooksCount} Notebooks`,
        `Modelos IA/ML: ${data.dsModelsCount}`,
        `Consumo: ${data.reportUsers} Usuarios Finales (${data.dashboardsCount + data.reportsCount} reportes)`,
        `Nivel de Soporte: ${data.supportHours === '24/7' ? '24/7 CRITICAL' : 'Horario de Oficina (9-18h)'}`,
        `Riesgo Evaluado: ${data.criticitness.enabled ? 'ALTO' : 'ESTÁNDAR'}`
    ]

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(COLOR_TEXT)

    bullets.forEach(b => {
        doc.text(`• ${b}`, margin + 5, y)
        y += 7
    })

    // Footer P1
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text("Confidencial - Antigravity Solutions | Página 1 de 2", margin, pageHeight - 10)


    // --- PAGE 2: DIAGRAM & BUDGET ---
    doc.addPage()
    y = 20

    // Header P2 (Simplified)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(COLOR_GOLD)
    doc.text("ARQUITECTURA Y PRESUPUESTO", margin, y)
    y += 15

    // 3. Diagram (Centered Large)
    if (data.diagramImage) {
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(COLOR_CHARCOAL)
        doc.text("3. Arquitectura Propuesta", margin, y)
        y += 10

        const imgProps = doc.getImageProperties(data.diagramImage)
        const pdfWidth = pageWidth - (margin * 2)
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
        const maxH = 120 // Limit height
        const finalH = pdfHeight > maxH ? maxH : pdfHeight

        // Frame
        doc.setDrawColor(200)
        doc.rect(margin, y, pdfWidth, finalH + 4)
        doc.addImage(data.diagramImage, 'PNG', margin + 2, y + 2, pdfWidth - 4, finalH)

        y += finalH + 20
    }

    // 4. Budget Table
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("4. Inversión Requerida", margin, y)
    y += 10

    // Table Header
    doc.setFillColor(51, 53, 51) // Charcoal
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.text("ROL / CONCEPTO", margin + 5, y + 5)
    doc.text("TARIFA", margin + 80, y + 5)
    doc.text("CANT.", margin + 110, y + 5)
    doc.text("SUBTOTAL", margin + 140, y + 5)
    y += 8

    // Rows
    doc.setTextColor(COLOR_TEXT)
    doc.setFont("helvetica", "normal")
    let isGray = true

    // Row Helper
    const drawRow = (label: string, rate: string, count: string, total: string) => {
        if (isGray) {
            doc.setFillColor(245, 245, 245)
            doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F')
        }
        isGray = !isGray
        doc.text(label, margin + 5, y + 5)
        doc.text(rate, margin + 80, y + 5)
        doc.text(count, margin + 110, y + 5)
        doc.text(total, margin + 140, y + 5)
        y += 8
    }

    Object.entries(data.roles).forEach(([role, count]) => {
        if (count > 0) {
            const rate = RATES[role] || 0
            drawRow(role.replace(/_/g, ' ').toUpperCase(), `$${rate.toLocaleString()}`, count.toString(), `$${(rate * count).toLocaleString()}`)
        }
    })

    if (data.l2SupportCost > 0) drawRow("Soporte L2", "-", "Auto", `$${data.l2SupportCost.toLocaleString()}`)
    if (data.riskCost > 0) drawRow("Riesgo Operativo", "-", `${(data.criticitnessLevel?.margin || 0) * 100}%`, `$${data.riskCost.toLocaleString()}`)

    y += 5
    // Totals Box
    doc.setDrawColor(212, 175, 55)
    doc.setLineWidth(0.5)
    doc.rect(margin, y, pageWidth - (margin * 2), 25) // Golden Border

    doc.setTextColor(COLOR_CHARCOAL)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("MENSUAL TOTAL:", margin + 5, y + 8)
    doc.text(`$${data.totalWithRisk.toLocaleString()}`, margin + 140, y + 8)

    doc.setTextColor(COLOR_GOLD) // Gold Text
    doc.setFontSize(14)
    doc.text("INVERSIÓN TOTAL (6 MESES):", margin + 5, y + 18)
    doc.text(`$${(data.totalWithRisk * data.durationMonths).toLocaleString()}`, margin + 140, y + 18)

    // Footer P2
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text("Confidencial - Antigravity Solutions | Página 2 de 2", margin, pageHeight - 10)

    doc.save(`cotizacion_${(data.clientName || 'proyecto').replace(/\s+/g, '_')}.pdf`)
}

// -- Word Export --
export async function exportToWord(data: QuoteState & { diagramImage?: string, totalWithRisk: number, durationMonths: number }) {
    // Colors
    const HEX_GOLD = "D4AF37"
    const HEX_CHARCOAL = "333533"

    // Header Table
    const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "auto" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
            left: { style: BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: "COTIZACIÓN TÉCNICA", bold: true, size: 28, color: HEX_CHARCOAL })] })],
                        width: { size: 60, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({ children: [new TextRun({ text: "METADATOS", bold: true, size: 14, color: HEX_GOLD })], alignment: "right" }),
                            new Paragraph({ text: `Cliente: ${data.clientName}`, alignment: "right" }),
                            new Paragraph({ text: `Fecha: ${new Date().toLocaleDateString()}`, alignment: "right" })
                        ],
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: HEX_GOLD } }
                    })
                ]
            })
        ]
    })

    const children: any[] = [
        headerTable,
        new Paragraph({ text: "", spacing: { after: 200 } }),

        // P1 Content
        new Paragraph({ text: "1. Resumen Estratégico", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: data.description || "N/A", alignment: "both", spacing: { after: 300 } }),

        new Paragraph({ text: "2. Alcance y Volumetría", heading: HeadingLevel.HEADING_2 }),
        ...[
            `Complejidad: ${data.complexity}`,
            `Usuarios: ${data.reportUsers}`,
            `Pipelines: ${data.pipelinesCount}`,
            `Soporte: ${data.supportHours}`
        ].map(b => new Paragraph({ text: `• ${b}`, bullet: { level: 0 } })),

        // Page Break for Info Separation
        new Paragraph({ text: "", pageBreakBefore: true }),

        // P2 Content
        new Paragraph({ text: "3. Arquitectura Propuesta", heading: HeadingLevel.HEADING_2 })
    ]

    // Diagram Image
    if (data.diagramImage) {
        children.push(new Paragraph({
            children: [
                new ImageRun({
                    data: Uint8Array.from(atob(data.diagramImage.split(',')[1]), c => c.charCodeAt(0)),
                    transformation: { width: 500, height: 300 },
                    type: "png"
                })
            ],
            alignment: "center",
            spacing: { after: 300 }
        }))
    }

    // Budget
    children.push(new Paragraph({ text: "4. Inversión Requerida", heading: HeadingLevel.HEADING_2 }))

    // Cost Table
    const costRows = [
        new TableRow({
            children: ["ROL", "TARIFA", "CANT.", "SUBTOTAL"].map(t => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: "FFFFFF" })] })],
                shading: { fill: HEX_CHARCOAL, type: ShadingType.CLEAR, color: "auto" }
            }))
        })
    ]

    Object.entries(data.roles).forEach(([role, count]) => {
        if (count > 0) {
            const rate = RATES[role] || 0
            costRows.push(new TableRow({
                children: [role, `$${rate}`, count.toString(), `$${rate * count}`].map(t => new TableCell({ children: [new Paragraph(t)] }))
            }))
        }
    })

    // Totals Row
    costRows.push(new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL MENSUAL", bold: true })] })], columnSpan: 3, shading: { fill: "EEEEEE", type: ShadingType.CLEAR, color: "auto" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `$${data.totalWithRisk}`, bold: true })] })], shading: { fill: "EEEEEE", type: ShadingType.CLEAR, color: "auto" } })
        ]
    }))

    children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: costRows
    }))

    const doc = new Document({
        sections: [{
            children: children
        }]
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `cotizacion_${(data.clientName || 'proyecto').replace(/\s+/g, '_')}.docx`)
}
