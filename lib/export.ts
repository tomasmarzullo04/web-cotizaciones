import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, ImageRun, ShadingType, AlignmentType, Header, Footer } from 'docx'
import { saveAs } from 'file-saver'
import { LOGO_NESTLE, LOGO_SI } from './logos'

// Rates for internal calculation if needed (fallback)
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
    durationValue: number
    durationUnit: 'days' | 'weeks' | 'months'
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
        solutionName: string
        technicalDescription: string
        techStack: string[]
        metrics: {
            pipelinesCount: number
            notebooksCount: number
            reportsCount: number
            dsModelsCount: number
            automationLevel: number
            updateFrequency: string
        }
        businessOwner: string
        devHours: number
        incidentRate: number
        supportWindow: string
        criticalHours: string
        criticalDays: string
        criticalityMatrix: {
            impactOperative: number
            impactFinancial: number
            userCoverage: number
            countryCoverage: number
            technicalMaturity: number
            dependencies: number
        }
    }
    retention?: {
        enabled: boolean
        percentage: number
    }
    clientContact?: {
        name: string
        role: string
        email: string
        areaLeader?: string
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

// -- PDF Export (Enterprise Standard) --
export async function exportToPDF(data: QuoteState & { totalMonthlyCost: number, l2SupportCost: number, riskCost: number, totalWithRisk: number, discountAmount: number, finalTotal: number, criticitnessLevel: any, diagramImage?: string, currency?: string, exchangeRate?: number, durationMonths: number }) {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
    })

    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 25 // 2.5cm margin standard

    // Colors
    const COLOR_GOLD = '#D4AF37'
    const COLOR_CHARCOAL = '#333533'
    const COLOR_TEXT = '#454545'
    const COLOR_LIGHT_GRAY = '#F5F5F5'

    // Helpers
    const currencyCode = data.currency || 'USD'
    const rateMultiplier = data.exchangeRate || 1.0
    const fmt = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2
        }).format(amount * rateMultiplier)
    }

    const drawHeader = () => {
        // Nestlé Logo (Left)
        if (LOGO_NESTLE) {
            try {
                doc.addImage(LOGO_NESTLE, 'PNG', margin, 10, 25, 25)
            } catch (e) {
                console.warn("Error adding Nestle logo", e)
            }
        }

        // SI Logo (Right)
        if (LOGO_SI) {
            try {
                doc.addImage(LOGO_SI, 'PNG', pageWidth - margin - 35, 12, 35, 15)
            } catch (e) { console.warn("Error adding SI logo", e) }
        } else {
            // Text Fallback
            doc.setFont("times", "bold")
            doc.setFontSize(16)
            doc.setTextColor(COLOR_CHARCOAL)
            doc.text("The Store Intelligence", pageWidth - margin, 20, { align: 'right' })
        }
    }

    const drawFooter = (pageNo: number, totalPages: number) => {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Confidencial - The Store Intelligence | Página ${pageNo} de ${totalPages}`, margin, pageHeight - 10)
    }

    // --- PAGE 1: COVER ---
    drawHeader()

    // Title Block (Centered, Elegant)
    let y = 100
    doc.setFont("helvetica", "bold")
    doc.setFontSize(28)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("PROPUESTA TÉCNICA", pageWidth / 2, y, { align: 'center' })
    y += 15
    doc.setFontSize(16)
    doc.setTextColor(COLOR_GOLD)
    doc.text("ESTIMACIÓN DE INVERSIÓN & ALCANCE", pageWidth / 2, y, { align: 'center' })

    // Project Info
    y = 160
    doc.setLineWidth(0.5)
    doc.setDrawColor(200)
    doc.line(margin + 40, y, pageWidth - margin - 40, y)
    y += 20

    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.setTextColor(COLOR_TEXT)
    const infoX = pageWidth / 2

    doc.text(`Cliente:`, infoX - 10, y, { align: 'right' })
    doc.setFont("helvetica", "bold")
    doc.text(data.clientName || 'N/A', infoX + 5, y)
    y += 10

    doc.setFont("helvetica", "normal")
    doc.text(`Fecha:`, infoX - 10, y, { align: 'right' })
    doc.setFont("helvetica", "bold")
    doc.text(new Date().toLocaleDateString(), infoX + 5, y)
    y += 10

    doc.setFont("helvetica", "normal")
    doc.text(`ID Proyecto:`, infoX - 10, y, { align: 'right' })
    doc.setFont("helvetica", "bold")
    doc.text(new Date().getTime().toString().substr(-6), infoX + 5, y)

    if (data.clientContact?.name) {
        y += 10
        doc.setFont("helvetica", "normal")
        doc.text(`Solicitante:`, infoX - 10, y, { align: 'right' })
        doc.setFont("helvetica", "bold")
        doc.text(data.clientContact.name, infoX + 5, y)
    }

    drawFooter(1, 4)

    // --- PAGE 2: EXECUTIVE SUMMARY ---
    doc.addPage()
    drawHeader()
    y = 50

    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(COLOR_GOLD)
    doc.text("1. RESUMEN EJECUTIVO", margin, y)
    y += 15

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(COLOR_TEXT)

    // Description/Context
    const descText = data.description && data.description.length > 10
        ? data.description
        : `La presente propuesta tiene como objetivo detallar el alcance, la metodología y la inversión requerida para el servicio de ${data.serviceType || 'desarrollo'}. ` +
        "Nuestra solución busca optimizar los procesos de negocio mediante el uso de tecnologías de datos avanzadas, garantizando escalabilidad y eficiencia operativa."

    const splitDesc = doc.splitTextToSize(descText, pageWidth - (margin * 2))
    doc.text(splitDesc, margin, y, { lineHeightFactor: 1.5, align: "justify", maxWidth: pageWidth - (margin * 2) })
    y += (splitDesc.length * 6) + 15

    // Scope / Metrics
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("Alcance y Métricas Clave", margin, y)
    y += 10

    const bullets: string[] = []
    if (data.serviceType === 'Proyecto') {
        bullets.push(`Complejidad del Proyecto: ${data.complexity.toUpperCase()}`)
        bullets.push(`Pipelines de Datos: ${data.pipelinesCount}`)
        bullets.push(`Notebooks de Procesamiento: ${data.notebooksCount}`)
        bullets.push(`Reportes y Dashboards: ${data.reportsCount + data.dashboardsCount}`)
        bullets.push(`Usuarios Finales: ${data.reportUsers}`)
    } else if (data.serviceType === 'Sustain') {
        bullets.push(`Modelo de Servicio: Sustain (Mantenimiento Continuo)`)
        bullets.push(`Ventana de Soporte: ${data.sustainDetails.supportWindow === '24x7' ? '24/7 Crítico' : 'Horario Comercial (9x5)'}`)
        bullets.push(`Nivel de Criticidad: ${data.criticitness.enabled ? 'Alta' : 'Estándar'}`)
        bullets.push(`Objetos bajo Soporte: ${data.metrics?.pipelinesCount || 0} Pipelines, ${data.metrics?.notebooksCount || 0} Notebooks`)
    } else {
        bullets.push(`Servicio: Staffing de Profesionales`)
        bullets.push(`Total de Perfiles: ${data.staffingDetails.profiles.reduce((a, b) => a + b.count, 0)}`)
    }

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    bullets.forEach(b => {
        doc.text(`•  ${b}`, margin + 5, y)
        y += 7
    })

    drawFooter(2, 4)

    // --- PAGE 3: BUDGET DETAIL ---
    doc.addPage()
    drawHeader()
    y = 50

    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(COLOR_GOLD)
    doc.text("2. DETALLE DE INVERSIÓN", margin, y)
    y += 15

    // Table Setup
    const col1X = margin
    const col2X = margin + 90
    const col3X = pageWidth - margin - 35
    const rowHeight = 10

    // Header Row
    doc.setFillColor(COLOR_CHARCOAL)
    doc.rect(margin, y, pageWidth - (margin * 2), rowHeight, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("CONCEPTO / ROL", col1X + 5, y + 6)
    doc.text("DETALLE", margin + 60, y + 6)
    doc.text("DURACIÓN/CANT.", col2X, y + 6)
    doc.text("SUBTOTAL (MES)", col3X, y + 6, { align: 'right' })
    y += rowHeight

    // Data Row Render
    doc.setTextColor(COLOR_TEXT)
    doc.setFont("helvetica", "normal")
    let isGray = true

    const drawRow = (c1: string, c2: string, c3: string, c4: string) => {
        if (isGray) {
            doc.setFillColor(COLOR_LIGHT_GRAY)
            doc.rect(margin, y, pageWidth - (margin * 2), rowHeight, 'F')
        }
        isGray = !isGray

        doc.text(c1, col1X + 5, y + 6)
        doc.text(c2, margin + 60, y + 6)
        doc.text(c3, col2X + 5, y + 6)
        doc.text(c4, col3X, y + 6, { align: 'right' })

        y += rowHeight
    }

    // Populate Rows
    if (data.serviceType === 'Staffing' || data.serviceType === 'Sustain') {
        data.staffingDetails.profiles.forEach(p => {
            const rate = RATES[Object.keys(RATES).find(k => p.role.toLowerCase().includes(k.replace('_', ' '))) || 'react_dev'] || 4000
            const alloc = (p.allocationPercentage || 100) / 100
            const sub = rate * alloc * p.count
            drawRow(p.role, `${p.seniority} (${p.allocationPercentage || 100}%)`, `${p.count} Rec.`, fmt(sub))
        })
    } else {
        Object.entries(data.roles).forEach(([role, count]) => {
            if (count > 0) {
                const rate = RATES[role] || 0
                drawRow(role.replace(/_/g, ' ').toUpperCase(), "Ssr Standard", `${count} Rec.`, fmt(rate * count))
            }
        })
    }

    // Extra Costs
    if (data.l2SupportCost > 0) drawRow("Soporte L2", "Mantenimiento", "10%", fmt(data.l2SupportCost))
    if (data.riskCost > 0) drawRow("Riesgo Operativo", "Markup Criticidad", `${(data.criticitnessLevel?.margin || 0) * 100}%`, fmt(data.riskCost))
    if (data.discountAmount > 0) drawRow("Descuento Comercial", "Bonificación", `${data.commercialDiscount}%`, `-${fmt(data.discountAmount)}`)

    drawFooter(3, 4)

    // --- PAGE 4: TOTALS & CLOSING ---
    doc.addPage()
    drawHeader()
    y = 50

    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(COLOR_GOLD)
    doc.text("3. RESUMEN COMERCIAL", margin, y)
    y += 20

    // Totals Box
    doc.setDrawColor(212, 175, 55)
    doc.setLineWidth(0.8)
    doc.rect(margin + 20, y, pageWidth - (margin * 2) - 40, 45)

    let boxY = y + 15
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(COLOR_CHARCOAL)

    // Monthly Total
    doc.text("INVERSIÓN MENSUAL:", margin + 30, boxY)
    doc.text(fmt(data.finalTotal), pageWidth - margin - 30, boxY, { align: 'right' })
    boxY += 15

    // Project Total
    doc.setFontSize(16)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text(`TOTAL PROYECTO (${data.durationValue} ${data.durationUnit.toUpperCase()}):`, margin + 30, boxY)
    doc.setTextColor(COLOR_GOLD) // Highlight
    doc.text(fmt(data.finalTotal * data.durationMonths), pageWidth - margin - 30, boxY, { align: 'right' })

    y += 65

    // Retentions Note
    if (data.retention?.enabled) {
        doc.setFontSize(9)
        doc.setTextColor(COLOR_TEXT)
        doc.text(`* Nota: Los montos expresados NO incluyen IVA. Se ha considerado una retención de ${data.retention.percentage}% en las proyecciones financieras internas, pero no se descuenta del total a facturar en esta propuesta.`, margin, y, { maxWidth: pageWidth - (margin * 2) })
        y += 20
    }

    // Signatures Placeholders
    y = pageHeight - 60
    doc.setDrawColor(150)
    doc.setLineWidth(0.3)

    // Line 1
    doc.line(margin + 20, y, margin + 70, y)
    doc.setFontSize(8)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("Por THE STORE INTELLIGENCE", margin + 25, y + 5)

    // Line 2
    doc.line(pageWidth - margin - 70, y, pageWidth - margin - 20, y)
    doc.text("Por EL CLIENTE", pageWidth - margin - 60, y + 5)

    drawFooter(4, 4)

    const filename = `cotizacion_${(data.clientName || 'proyecto').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
}

// -- WORD Export (Enterprise Standard) --
export async function exportToWord(data: QuoteState & { totalMonthlyCost: number, l2SupportCost: number, riskCost: number, totalWithRisk: number, discountAmount: number, finalTotal: number, criticitnessLevel: any, diagramImage?: string, currency?: string, exchangeRate?: number, durationMonths: number }) {
    const HEX_GOLD = "D4AF37"
    const HEX_CHARCOAL = "333533"

    // Header Logic (Assuming standard header for now, passing text)
    // Docx headers are tricky with Base64 images without proper sizing, will stick to text for stability or simple images if needed.

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch margins (approx 2.5cm)
                }
            },
            headers: {
                default: new Header({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({ text: "The Store Intelligence", bold: true, size: 24, font: "Calibri" })
                            ],
                            alignment: AlignmentType.RIGHT,
                            spacing: { after: 400 } // Space after header
                        })
                    ]
                })
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: "Confidencial - Documento de Estimación", size: 16, color: "888888" })],
                            alignment: AlignmentType.CENTER
                        })
                    ]
                })
            },
            children: [
                // --- COVER ---
                new Paragraph({ text: "", spacing: { after: 2000 } }), // Top spacer
                new Paragraph({
                    children: [new TextRun({ text: "PROPUESTA TÉCNICA", bold: true, size: 56, font: "Calibri", color: HEX_CHARCOAL })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 }
                }),
                new Paragraph({
                    children: [new TextRun({ text: "ESTIMACIÓN DE INVERSIÓN & ALCANCE", bold: true, size: 32, font: "Calibri", color: HEX_GOLD })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 800 }
                }),

                // Info Table (Invisible Borders)
                new Table({
                    width: { size: 80, type: WidthType.PERCENTAGE },
                    alignment: AlignmentType.CENTER,
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
                                new TableCell({ children: [new Paragraph({ text: "Cliente:", alignment: AlignmentType.RIGHT })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.clientName, bold: true })] })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: "Fecha:", alignment: AlignmentType.RIGHT })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: new Date().toLocaleDateString(), bold: true })] })] })
                            ]
                        })
                    ]
                }),

                new Paragraph({ text: "", pageBreakBefore: true }),

                // --- EXECUTIVE SUMMARY ---
                new Paragraph({
                    children: [new TextRun({ text: "1. RESUMEN EJECUTIVO", bold: true, size: 32, color: HEX_GOLD })],
                    spacing: { after: 300 }
                }),
                new Paragraph({
                    children: [new TextRun({
                        text: data.description || "Propuesta de servicios profesionales y tecnológicos para la optimización de procesos de negocio.",
                        size: 24
                    })],
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 400 }
                }),

                // --- BUDGET ---
                new Paragraph({
                    children: [new TextRun({ text: "2. DETALLE DE INVERSIÓN", bold: true, size: 32, color: HEX_GOLD })],
                    spacing: { before: 400, after: 300 }
                }),

                // Budget Table
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        // Header
                        new TableRow({
                            children: ["CONCEPTO", "DETALLE", "DURACIÓN", "SUBTOTAL"].map(t => new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: "FFFFFF" })] })],
                                shading: { fill: HEX_CHARCOAL, type: ShadingType.CLEAR, color: "auto" }
                            }))
                        }),
                        // Rows (Function to generate)
                        ...generateWordCostRows(data)
                    ]
                }),

                // --- TOTALS ---
                new Paragraph({ text: "", spacing: { after: 400 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "INVERSIÓN TOTAL (" + data.durationValue + " " + data.durationUnit.toUpperCase() + "): ", bold: true, size: 28 }),
                        new TextRun({
                            text: "$" + (data.finalTotal * data.durationMonths).toLocaleString('en-US', { minimumFractionDigits: 2 }),
                            bold: true,
                            size: 32,
                            color: HEX_GOLD
                        })
                    ],
                    alignment: AlignmentType.RIGHT
                })
            ]
        }]
    })

    Packer.toBlob(doc).then(blob => {
        saveAs(blob, `cotizacion_${(data.clientName || 'proyecto').replace(/\s+/g, '_')}.docx`)
    })
}

function generateWordCostRows(data: any): TableRow[] {
    const rows: TableRow[] = []

    // Profiles
    if (data.serviceType === 'Staffing' || data.serviceType === 'Sustain') {
        data.staffingDetails.profiles.forEach((p: any) => {
            const rate = RATES[Object.keys(RATES).find(k => p.role.toLowerCase().includes(k.replace('_', ' '))) || 'react_dev'] || 4000
            const alloc = (p.allocationPercentage || 100) / 100
            const sub = rate * alloc * p.count

            rows.push(new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(p.role)] }),
                    new TableCell({ children: [new Paragraph(`${p.seniority} (${p.allocationPercentage || 100}%)`)] }),
                    new TableCell({ children: [new Paragraph(`${p.count} Rec.`)] }),
                    new TableCell({ children: [new Paragraph(`$${sub.toLocaleString()}`)] }),
                ]
            }))
        })
    } else {
        Object.entries(data.roles).forEach(([role, count]: [string, any]) => {
            if (count > 0) {
                const rate = RATES[role] || 0
                rows.push(new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(role.replace(/_/g, ' ').toUpperCase())] }),
                        new TableCell({ children: [new Paragraph("Ssr Standard")] }),
                        new TableCell({ children: [new Paragraph(`${count} Rec.`)] }),
                        new TableCell({ children: [new Paragraph(`$${(rate * count).toLocaleString()}`)] }),
                    ]
                }))
            }
        })
    }

    return rows
}
