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
    serviceType?: string
    commercialDiscount?: number
    staffingDetails: {
        profiles: Array<{
            id: string
            role: string
            seniority: string
            skills: string
            count: number
            startDate: string
            endDate: string
            allocationPercentage?: number
        }>
    }
    sustainDetails: {
        technicalDescription: string
        tools: string[]
        operationHours: string
    }
    retention?: {
        enabled: boolean
        percentage: number
    }
    clientContact?: {
        name: string
        role: string
        email: string
        areaLeader?: string // Made optional here to avoid breakage if undefined
    }
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
export async function exportToPDF(data: QuoteState & { totalMonthlyCost: number, l2SupportCost: number, riskCost: number, totalWithRisk: number, discountAmount: number, finalTotal: number, criticitnessLevel: any, diagramImage?: string }) {
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
    doc.rect(pageWidth - margin - 80, 20, 80, 30)
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(COLOR_GOLD)
    doc.text("INFORMACIÓN DEL PROYECTO", pageWidth - margin - 75, 26)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(COLOR_TEXT)
    doc.text(`ID: ${new Date().getTime().toString().substr(-6)}`, pageWidth - margin - 75, 32)
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, pageWidth - margin - 75, 37)
    doc.text(`Cliente: ${data.clientName || 'N/A'}`, pageWidth - margin - 75, 42)
    if (data.clientContact?.name) {
        doc.text(`Solicitante: ${data.clientContact.name}`, pageWidth - margin - 75, 47)
    }

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
    doc.text(descLines, margin, y, { align: 'left', maxWidth: pageWidth - (margin * 2), lineHeightFactor: 1.5 })
    y += (descLines.length * 7) + 15 // Increased spacing multiplier for line height

    // 2. Executive Summary Bullets
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("2. Alcance y Volumetría", margin, y)
    y += 10

    const bullets: string[] = []

    if (data.serviceType === 'Proyecto') {
        bullets.push(`Complejidad: ${data.complexity.toUpperCase()}`)
        bullets.push(`Frecuencia: ${data.updateFrequency.toUpperCase()}`)
        bullets.push(`Volumetría: ${data.pipelinesCount} Pipelines, ${data.notebooksCount} Notebooks`)
        bullets.push(`Modelos IA/ML: ${data.dsModelsCount}`)
        bullets.push(`Consumo: ${data.reportUsers} Usuarios Finales (${data.dashboardsCount + data.reportsCount} reportes)`)
    } else if (data.serviceType === 'Sustain') {
        bullets.push(`Tipo de Servicio: Sustain (Mantenimiento)`)
        bullets.push(`Horario de Soporte: ${data.supportHours === '24/7' ? '24/7 CRITICAL' : 'Business Hours (9-18h)'}`)
        bullets.push(`SLA / Riesgo: ${data.criticitness.enabled ? 'ALTO' : 'ESTÁNDAR'}`)
    } else {
        bullets.push(`Tipo de Servicio: Staffing`)
        bullets.push(`Total Recursos: ${data.staffingDetails.profiles.reduce((acc, p) => acc + p.count, 0)}`)
    }

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(COLOR_TEXT)

    bullets.forEach(b => {
        doc.text(`• ${b}`, margin + 5, y)
        y += 7
    })

    // 2.1 Special Sections based on Service Type
    if (data.serviceType === 'Sustain') {
        y += 10
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(COLOR_CHARCOAL)
        doc.text("3. Niveles de Servicio (SLA)", margin, y)
        y += 10

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(COLOR_TEXT)
        doc.text("• Continuidad Operativa: Mantenimiento correctivo y evolutivo.", margin + 5, y)
        y += 7
        doc.text(`• Respuesta ante Incidentes: ${data.supportHours === '24/7' ? '< 1 hora (Crítico)' : '< 4 horas (Business Hours)'}`, margin + 5, y)
        y += 7
        doc.text("• Monitoreo Proactivo de Pipelines y Procesos", margin + 5, y)
        y += 7
    }

    // Footer P1
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text("Confidencial - The Store Intelligence | Página 1 de 2", margin, pageHeight - 10)


    // --- PAGE 2: DIAGRAM & BUDGET ---
    doc.addPage()
    y = 20

    // Header P2 (Simplified)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(COLOR_GOLD)
    doc.text("ARQUITECTURA Y PRESUPUESTO", margin, y)
    y += 15

    // 3. Diagram (Centered Large) - Enabled for all types (Staffing uses differnt title)
    if (data.diagramImage) {
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(COLOR_CHARCOAL)

        const diagramTitle = data.serviceType === 'Staffing'
            ? "3. Proceso de Implementación y Seguimiento"
            : "3. Arquitectura Propuesta"

        doc.text(diagramTitle, margin, y)
        y += 10

        const imgProps = doc.getImageProperties(data.diagramImage)
        const pdfWidth = pageWidth - (margin * 2)
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
        const maxH = 120 // Limit height
        const finalH = pdfHeight > maxH ? maxH : pdfHeight

        // Frame
        doc.setDrawColor(200)
        doc.rect(margin, y, pdfWidth, finalH + 4)
        try {
            doc.addImage(data.diagramImage, 'PNG', margin + 2, y + 2, pdfWidth - 4, finalH)
        } catch (e) {
            console.error(e)
            doc.text("[Error al renderizar imagen]", margin + 10, y + 10)
        }

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
    doc.text("DETALLE", margin + 80, y + 5)
    doc.text("CANT.", margin + 110, y + 5)
    doc.text("SUBTOTAL", margin + 140, y + 5)
    y += 8

    // Rows
    doc.setTextColor(COLOR_TEXT)
    doc.setFont("helvetica", "normal")
    let isGray = true

    // Row Helper
    const drawRow = (label: string, detail: string, count: string, total: string) => {
        if (isGray) {
            doc.setFillColor(245, 245, 245)
            doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F')
        }
        isGray = !isGray
        doc.text(label, margin + 5, y + 5)
        doc.text(detail, margin + 80, y + 5)
        doc.text(count, margin + 110, y + 5)
        doc.text(total, margin + 140, y + 5)
        y += 8
    }

    // RENDER ROLES
    if (data.serviceType === 'Staffing' || data.serviceType === 'Sustain') {
        data.staffingDetails.profiles.forEach(p => {
            // Basic Cost Estimation per profile (approx)
            const rate = RATES[Object.keys(RATES).find(k => p.role.toLowerCase().includes(k.replace('_', ' '))) || 'react_dev'] || 4000
            const alloc = (p.allocationPercentage || 100) / 100
            const sub = rate * alloc * p.count
            drawRow(p.role, `${p.seniority} - ${p.allocationPercentage || 100}%`, p.count.toString(), `$${sub.toLocaleString()}`)
        })
    } else {
        Object.entries(data.roles).forEach(([role, count]) => {
            if (count > 0) {
                const rate = RATES[role] || 0
                drawRow(role.replace(/_/g, ' ').toUpperCase(), `Ssr Standard`, count.toString(), `$${(rate * count).toLocaleString()}`)
            }
        })
    }

    if (data.l2SupportCost > 0) drawRow("Soporte L2", "10% Costo Operativo", "-", `$${data.l2SupportCost.toLocaleString()}`)
    if (data.riskCost > 0) drawRow("Riesgo Operativo", `${(data.criticitnessLevel?.margin || 0) * 100}% Markup`, "-", `$${data.riskCost.toLocaleString()}`)
    if (data.discountAmount > 0) drawRow("Descuento Comercial", "-", `${data.commercialDiscount}%`, `-$${data.discountAmount.toLocaleString()}`)
    if (data.retention?.enabled && data.retention.percentage > 0) {
        drawRow("Retención IIBB/Ganancias", `${data.retention.percentage}%`, "-", `(No resta del total)`)
    }

    y += 5
    // Totals Box
    doc.setDrawColor(212, 175, 55)
    doc.setLineWidth(0.5)
    doc.rect(margin, y, pageWidth - (margin * 2), 25) // Golden Border

    doc.setTextColor(COLOR_CHARCOAL)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("MENSUAL TOTAL:", margin + 5, y + 8)
    doc.text(`$${data.finalTotal.toLocaleString()}`, margin + 140, y + 8)

    doc.setTextColor(COLOR_GOLD) // Gold Text
    doc.setFontSize(14)
    doc.text("INVERSIÓN TOTAL (6 MESES):", margin + 5, y + 18)
    doc.text(`$${(data.finalTotal * data.durationMonths).toLocaleString()}`, margin + 140, y + 18)

    // Footer P2
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text("Confidencial - The Store Intelligence | Página 2 de 2", margin, pageHeight - 10)

    // Save PDF Locally
    const filename = `cotizacion_${(data.clientName || 'proyecto').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)

    // Save to Google Drive (Non-blocking)
    try {
        const blob = doc.output('blob')
        const formData = new FormData()
        formData.append('file', blob)
        formData.append('filename', filename)

        // Fire and forget - handled by server action
        import('./google-drive').then(({ uploadToDrive }) => {
            uploadToDrive(formData).then(res => {
                if (!res.success) console.warn("Background Drive Upload Warning:", res.error)
            })
        })
    } catch (e) {
        console.warn("Failed to initiate Drive upload:", e)
    }
}

// -- Word Export --
export async function exportToWord(data: QuoteState & { diagramImage?: string, totalWithRisk: number, durationMonths: number, finalTotal: number }) {
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
                            new Paragraph({ text: `Fecha: ${new Date().toLocaleDateString()}`, alignment: "right" }),
                            ...(data.clientContact?.name ? [new Paragraph({ text: `Solicitante: ${data.clientContact.name}`, alignment: "right" })] : []),
                            ...(data.clientContact?.role ? [new Paragraph({ text: `Cargo: ${data.clientContact.role}`, alignment: "right" })] : []),
                            ...(data.clientContact?.email ? [new Paragraph({ text: `Email: ${data.clientContact.email}`, alignment: "right" })] : []),
                            ...(data.clientContact?.areaLeader ? [new Paragraph({ text: `Líder de Área: ${data.clientContact.areaLeader}`, alignment: "right" })] : [])
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
        new Paragraph({ text: "", spacing: { after: 40 } }), // Reduced spacing from 120

        // P1 Content
        new Paragraph({ text: "1. Resumen Estratégico", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: data.description || "N/A", alignment: "both", spacing: { after: 200 } }), // Reduced spacing

        new Paragraph({ text: "2. Alcance y Volumetría", heading: HeadingLevel.HEADING_2 }),
    ]

    // Dynamic Bullets
    const bullets: string[] = []
    if (data.serviceType === 'Proyecto') {
        bullets.push(`Complejidad: ${data.complexity}`)
        bullets.push(`Pipelines: ${data.pipelinesCount}`)
        bullets.push(`Usuarios: ${data.reportUsers}`)
    } else {
        bullets.push(`Tipo de Servicio: ${data.serviceType}`)
        bullets.push(`Perfiles: ${data.staffingDetails.profiles.length}`)
    }

    bullets.forEach(b => children.push(new Paragraph({ text: `• ${b}`, bullet: { level: 0 }, spacing: { after: 50 } }))) // Tighten bullets


    // Page Break for Info Separation
    children.push(new Paragraph({ text: "", pageBreakBefore: true }))

    // P2 Content
    const p2Title = data.serviceType === 'Staffing'
        ? "3. Proceso de Implementación y Seguimiento"
        : "3. Arquitectura Propuesta"

    children.push(new Paragraph({ text: p2Title, heading: HeadingLevel.HEADING_2 }))

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
            children: ["ROL", "DETALLE", "CANT.", "SUBTOTAL"].map(t => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: "FFFFFF" })] })],
                shading: { fill: HEX_CHARCOAL, type: ShadingType.CLEAR, color: "auto" }
            }))
        })
    ]

    // Populate Rows
    if (data.serviceType === 'Staffing' || data.serviceType === 'Sustain') {
        data.staffingDetails.profiles.forEach(p => {
            if (p.count > 0) {
                const rate = RATES[Object.keys(RATES).find(k => p.role.toLowerCase().includes(k.replace('_', ' '))) || 'react_dev'] || 4000
                const alloc = (p.allocationPercentage ?? 100) / 100
                const sub = rate * alloc * p.count
                costRows.push(new TableRow({
                    children: [p.role, `${p.seniority} (${p.allocationPercentage ?? 100}%)`, p.count.toString(), `$${sub.toLocaleString()}`].map(t => new TableCell({ children: [new Paragraph(t)] }))
                }))
            }
        })
    } else {
        Object.entries(data.roles).forEach(([role, count]) => {
            if (count > 0) {
                const rate = RATES[role] || 0
                costRows.push(new TableRow({
                    children: [role, `$${rate}`, count.toString(), `$${rate * count}`].map(t => new TableCell({ children: [new Paragraph(t)] }))
                }))
            }
        })
    }

    // Retention Row (Informational)
    if (data.retention?.enabled && data.retention.percentage > 0) {
        costRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph("Retención IIBB/Ganancias")], columnSpan: 2 }),
                new TableCell({ children: [new Paragraph(`${data.retention.percentage}%`)] }),
                new TableCell({ children: [new Paragraph("(Info Only)")] })
            ]
        }))
    }

    // Totals Rows
    costRows.push(new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "SUBTOTAL BRUTO", bold: true })] })], columnSpan: 3 }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `$${data.finalTotal.toLocaleString()}`, bold: true })] })] })
        ]
    }))

    if (data.retention?.enabled && data.retention.percentage > 0) {
        const retentionAmount = data.finalTotal * (data.retention.percentage / 100)
        const netTotal = data.finalTotal - retentionAmount

        costRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(`Retención (${data.retention.percentage}%)`)], columnSpan: 3 }),
                new TableCell({ children: [new Paragraph(`-$${retentionAmount.toLocaleString()}`)], shading: { fill: "FFF0F0", type: ShadingType.CLEAR, color: "auto" } })
            ]
        }))

        costRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NETO A COBRAR", bold: true, color: "FFFFFF" })] })], columnSpan: 3, shading: { fill: HEX_GOLD, type: ShadingType.CLEAR, color: "auto" } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `$${netTotal.toLocaleString()}`, bold: true })] })], shading: { fill: "FFFFFF", type: ShadingType.CLEAR, color: "auto" } })
            ]
        }))
    } else {
        // Simple Total if no retention
        costRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL MENSUAL", bold: true })] })], columnSpan: 3, shading: { fill: "EEEEEE", type: ShadingType.CLEAR, color: "auto" } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `$${data.finalTotal.toLocaleString()}`, bold: true })] })], shading: { fill: "EEEEEE", type: ShadingType.CLEAR, color: "auto" } })
            ]
        }))
    }

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
