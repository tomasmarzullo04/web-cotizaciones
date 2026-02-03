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
            price?: number
            cost?: number
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

export function downloadCSV(data: any[], filename: string) {
    if (!data || !data.length) return
    const separator = ','
    const keys = Object.keys(data[0])
    const csvContent =
        keys.join(separator) + '\n' +
        data.map(row => {
            return keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k]
                cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""')
                if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`
                return cell
            }).join(separator)
        }).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `${filename}.csv`)
}

// -- Final Design PDF --
function createPDFDocument(data: QuoteState & { totalMonthlyCost: number, l2SupportCost: number, riskCost: number, totalWithRisk: number, discountAmount: number, finalTotal: number, criticitnessLevel: any, diagramImage?: string, currency?: string, exchangeRate?: number, durationMonths: number, grossTotal?: number, retentionAmount?: number }) {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })

    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 20
    const contentWidth = pageWidth - (margin * 2)

    // Corporate Blue 
    const COLOR_PRIMARY = '#004B8D'
    const COLOR_CHARCOAL = '#333533'
    const COLOR_TEXT = '#454545'
    const COLOR_ROW_ALT = '#F0F5FA'

    const FONT_REG = "helvetica"
    const FONT_BOLD = "helvetica"

    const currencyCode = data.currency || 'USD'
    const rateMultiplier = data.exchangeRate || 1.0
    const fmt = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2
        }).format(amount * rateMultiplier)
    }

    const durationText = () => {
        const val = Math.round(data.durationValue) === data.durationValue ? data.durationValue : data.durationValue.toFixed(1)
        return `${val} ${data.durationUnit.toUpperCase()}`
    }

    const cleanText = (str: string) => {
        if (!str) return ""
        return str
            .replace(/Ã³/g, 'ó')
            .replace(/Ã¡/g, 'á')
            .replace(/Ã©/g, 'é')
            .replace(/Ã/g, 'í')
            .replace(/Ãº/g, 'ú')
            .replace(/Ã±/g, 'ñ')
            .replace(/Ã‘/g, 'Ñ')
    }

    // --- Header & Footer ---
    const drawHeader = () => {
        // FIXED COORDINATES - Immune to text flow
        const logoSI_Y = 10
        const logoSI_X = margin
        const siH = 7.0 // Reduced size for prolijidad

        const block_Y = 0
        const block_H = 32
        const block_W = pageWidth * 0.55 // Focused on the right

        // 1. Blue Background Block for Title (Fixed Position)
        doc.setFillColor(COLOR_PRIMARY)
        doc.rect(pageWidth - block_W, block_Y, block_W, block_H, 'F')

        // 2. "COTIZACIÓN" Text
        doc.setFont(FONT_BOLD, "bold")
        doc.setFontSize(30)
        doc.setTextColor(255)
        doc.text("COTIZACIÓN", pageWidth - margin, 21, { align: "right" })

        // 3. logo SI (Fixed Position - Left)
        if (LOGO_SI) {
            try {
                const props = doc.getImageProperties(LOGO_SI)
                const w = (props.width * siH) / props.height
                doc.addImage(LOGO_SI, 'PNG', logoSI_X, logoSI_Y, w, siH)
            } catch (e) {
                doc.setFontSize(10)
                doc.setTextColor(COLOR_PRIMARY)
                doc.text("THE STORE INTELLIGENCE", logoSI_X, logoSI_Y + 5)
            }
        }

        // Space/Divider below header (Fixed Y)
        doc.setDrawColor(COLOR_PRIMARY)
        doc.setLineWidth(0.4)
        doc.line(margin, 35, pageWidth - margin, 35)
    }

    const drawFooter = () => {
        const pageCount = doc.internal.pages.length - 1
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(7)
            doc.setFont(FONT_REG, "normal")
            doc.setTextColor(150)
            doc.text(`The Store Intelligence | Confidencial | Pág. ${i} de ${pageCount}`, margin, pageHeight - 10, { align: 'left' })
            doc.text(`Propuesta Comercial SI`, pageWidth - margin, pageHeight - 10, { align: 'right' })
        }
    }

    // --- CONTENT FLOW ---
    drawHeader()

    let y = 48

    // 1. INFO ROW (Clean side-by-side)
    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(9)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("COTIZADO A:", margin, y)
    doc.text("DETALLES DE COTIZACIÓN:", pageWidth / 2 + 5, y)

    y += 6
    doc.setFontSize(12)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text(cleanText(data.clientName), margin, y)

    const rightX = pageWidth / 2 + 5
    doc.setFontSize(9)
    doc.setFont(FONT_REG, "normal")
    doc.setTextColor(COLOR_TEXT)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, rightX, y)
    doc.text(`ID: SI-${new Date().getTime().toString().substr(-6)}`, pageWidth - margin, y, { align: 'right' })

    y += 5
    if (data.clientContact?.name) {
        doc.text(cleanText(data.clientContact.name), margin, y)
    }
    doc.text(`Validez: 30 Días`, rightX, y)
    doc.text(`Consultor: ${cleanText(data.clientContact?.areaLeader || "Equipo Comercial")}`, pageWidth - margin, y, { align: 'right' })

    y += 15

    // 2. STRATEGIC OBJECTIVE
    doc.setFont(FONT_BOLD, "bold")
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("OBJETIVO ESTRATÉGICO", margin, y)

    y += 6
    doc.setFont(FONT_REG, "normal")
    doc.setFontSize(9.5)
    doc.setTextColor(COLOR_TEXT)
    const objText = data.serviceType === 'Project'
        ? "Diseño e implementación de una solución tecnológica punta a punta, garantizando escalabilidad y alineación con los estándares regionales de Nestlé."
        : data.serviceType === 'Sustain'
            ? "Continuidad operativa y evolución tecnológica de activos digitales existentes, asegurando performance y cumplimiento de KPIs de negocio."
            : "Fortalecimiento de capacidades técnicas a través de talento especializado integrado en células de trabajo bajo demanda."

    const objLines = doc.splitTextToSize(objText, contentWidth)
    doc.text(objLines, margin, y)
    y += (objLines.length * 5) + 12

    // 3. INVESTMENT TABLE (Now BEFORE Diagram)
    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(11)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("DETALLE DE INVERSIÓN", margin, y)
    y += 6

    // Table Header
    doc.setFillColor(COLOR_PRIMARY)
    doc.rect(margin, y, contentWidth, 8, 'F')
    doc.setFontSize(9)
    doc.setTextColor(255)
    doc.text("CONCEPTO / PERFIL", margin + 4, y + 5.5) // Increased padding
    doc.text("CANT.", pageWidth - margin - 75, y + 5.5, { align: 'center' })
    doc.text("MENSUAL", pageWidth - margin - 40, y + 5.5, { align: 'right' })
    doc.text("TOTAL", pageWidth - margin - 5, y + 5.5, { align: 'right' })
    y += 8

    let isReview = true
    const drawRow = (label: string, meta: string, monthly: string, total: string) => {
        if (y > pageHeight - 40) { // Safety page break
            doc.addPage()
            drawHeader()
            y = 45
        }

        if (isReview) {
            doc.setFillColor(COLOR_ROW_ALT)
            doc.rect(margin, y, contentWidth, 7, 'F')
        }
        isReview = !isReview

        doc.setTextColor(COLOR_TEXT)
        doc.setFontSize(8.5)
        doc.setFont(FONT_BOLD, "bold")
        doc.text(cleanText(label), margin + 4, y + 4.5)

        doc.setFont(FONT_REG, "normal")
        doc.text(cleanText(meta), pageWidth - margin - 75, y + 4.5, { align: 'center' })

        doc.setFont(FONT_BOLD, "bold")
        doc.text(monthly, pageWidth - margin - 40, y + 4.5, { align: 'right' })
        doc.text(total, pageWidth - margin - 5, y + 4.5, { align: 'right' })
        y += 7
    }

    const profiles = data.staffingDetails?.profiles || []
    if (profiles.length > 0) {
        profiles.forEach(p => {
            if ((p.count || 0) <= 0) return
            const rate = p.price || p.cost || 0
            const monthlySub = rate * (p.allocationPercentage || 100) / 100 * p.count
            drawRow(`${p.role} (${p.seniority || 'Ssr'})`, `${p.count} Rec.`, fmt(monthlySub), fmt(monthlySub * data.durationMonths))
        })
    } else {
        Object.entries(data.roles || {}).forEach(([role, count]) => {
            if (count > 0) {
                const rate = RATES[role] || 0
                if (rate > 0) drawRow(role.replace(/_/g, ' ').toUpperCase(), `${count} Rec.`, fmt(rate * count), fmt(rate * count * data.durationMonths))
            }
        })
    }

    if (data.l2SupportCost > 0) drawRow("Soporte L2", "10%", fmt(data.l2SupportCost), fmt(data.l2SupportCost * data.durationMonths))
    if (data.riskCost > 0) drawRow("Fee de Gestión y Riesgo", `${((data.criticitnessLevel?.margin || 0) * 100).toFixed(0)}%`, fmt(data.riskCost), fmt(data.riskCost * data.durationMonths))
    if (data.discountAmount > 0) drawRow("Descuento Comercial", `${data.commercialDiscount || 0}%`, `-${fmt(data.discountAmount)}`, `-${fmt(data.discountAmount * data.durationMonths)}`)

    // Totals Box
    y += 10
    const displayGross = data.grossTotal || data.finalTotal
    let displayRetention = data.retentionAmount || 0
    let displayNet = data.finalTotal

    if (data.retention?.enabled && (displayRetention === 0 || !displayRetention)) {
        displayRetention = displayGross * (data.retention.percentage / 100)
        displayNet = displayGross - displayRetention
    }

    const boxH = data.retention?.enabled ? 35 : 25
    if (y + boxH > pageHeight - 30) { doc.addPage(); drawHeader(); y = 45; }

    doc.setFillColor(245, 203, 92) // #F5CB5C
    doc.rect(pageWidth - margin - 90, y, 90, boxH, 'F')

    let ty = y + 7
    doc.setTextColor(COLOR_PRIMARY)
    doc.setFontSize(10)
    doc.text("TOTAL ESTIMADO:", pageWidth - margin - 85, ty)
    doc.text(fmt(displayGross), pageWidth - margin - 5, ty, { align: 'right' })

    if (data.retention?.enabled) {
        ty += 8
        doc.text(`Retención (${data.retention.percentage}%):`, pageWidth - margin - 85, ty)
        doc.text(`- ${fmt(displayRetention)}`, pageWidth - margin - 5, ty, { align: 'right' })
        ty += 10
        doc.setFontSize(12)
        doc.text("INVERSIÓN NETA:", pageWidth - margin - 85, ty)
        doc.text(fmt(displayNet), pageWidth - margin - 5, ty, { align: 'right' })
    }
    y += boxH + 15

    // Notes
    doc.setFontSize(8)
    doc.setTextColor(COLOR_TEXT)
    doc.setFont(FONT_REG, "normal")
    doc.text("* Valores no incluyen impuestos aplicables.", margin, y)
    if (data.retention?.enabled) {
        y += 4
        doc.text(`* Retención financiera interna del ${data.retention.percentage}% aplicada pro-forma.`, margin, y)
    }
    y += 10

    // 4. ARCHITECTURE DIAGRAM
    if (data.diagramImage) {
        const imgProps = doc.getImageProperties(data.diagramImage)
        const imgW = contentWidth
        const imgH = (imgProps.height * imgW) / imgProps.width

        // Critical: If it doesn't fit, move to next page to avoid cuts
        if (y + imgH > pageHeight - 30) {
            doc.addPage()
            drawHeader()
            y = 45
        }

        doc.setFont(FONT_BOLD, "bold")
        doc.setFontSize(11)
        doc.setTextColor(COLOR_PRIMARY)
        doc.text("ARQUITECTURA DE LA SOLUCIÓN", margin, y)
        y += 6

        try {
            doc.addImage(data.diagramImage, 'PNG', margin, y, imgW, imgH)
            y += imgH + 15
        } catch (e) {
            doc.setFont(FONT_REG, "italic")
            doc.text("[Diagrama no disponible]", margin, y + 5)
            y += 10
        }
    }

    // 5. TERMS & CONDITIONS (Bottom of Last Page)
    if (y > pageHeight - 80) { // Safety page break for terms
        doc.addPage()
        drawHeader()
        y = 45
    } else {
        y = Math.max(y + 10, pageHeight - 85)
    }

    doc.setDrawColor(COLOR_PRIMARY)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(10)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("TÉRMINOS Y CONDICIONES:", margin, y)
    y += 6

    doc.setFont(FONT_REG, "normal")
    doc.setFontSize(7) // Slightly smaller for prolijidad
    doc.setTextColor(COLOR_TEXT)

    const terms = [
        "Propuesta Válida durante 30 días desde su emisión.",
        "Proyecto a iniciar con Orden de Compra formal.",
        "Costos tasados según acuerdo regional Store Intelligence.",
        "Sustain no se incluye en espera que el requerimiento no evolucione.",
        "Desarrollos adicionales serán cotizados por separado.",
        "Entregables propiedad de Nestlé finalizado el proyecto.",
        "Sprints de Pago acordados al inicio del proyecto.",
        "Acuerdo de confidencialidad absoluto sobre datos compartidos."
    ]

    const mid = Math.ceil(terms.length / 2)
    const leftTerms = terms.slice(0, mid)
    const rightTerms = terms.slice(mid)

    const termsYStart = y
    leftTerms.forEach((term, idx) => {
        doc.text(`• ${cleanText(term)}`, margin, termsYStart + (idx * 4.2), { maxWidth: (contentWidth / 2) - 5 })
    })

    rightTerms.forEach((term, idx) => {
        doc.text(`• ${cleanText(term)}`, (pageWidth / 2) + 5, termsYStart + (idx * 4.2), { maxWidth: (contentWidth / 2) - 5 })
    })

    drawFooter()

    return doc
}

export async function exportToPDF(data: any) {
    const doc = createPDFDocument(data)
    const filename = `cotizacion_${(data.clientName || 'proyecto').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
}

export async function generatePDFBlob(data: any) {
    const doc = createPDFDocument(data)
    return doc.output('blob')
}

export async function exportToWord(data: any) {
    // Safety Calcs (Direct Dashboard Sync)
    // Use values EXACTLY as they are in the QuoteBuilder state
    const displayGross = data.grossTotal || data.finalTotal
    let displayRetention = data.retentionAmount || 0
    let displayNet = data.finalTotal

    // Safety: If retention is enabled but amount is 0, calculate it on the fly from the Single Period/Total provided
    if (data.retention?.enabled && (displayRetention === 0 || !displayRetention)) {
        displayRetention = displayGross * (data.retention.percentage / 100)
        displayNet = displayGross - displayRetention
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ children: [new TextRun({ text: "Propuesta Técnica (Versión Editable)", bold: true, size: 48 })] }),
                new Paragraph({ text: "Versión simplificada.", spacing: { after: 200 } }),
                new Paragraph({ text: `Cliente: ${data.clientName}` }),

                // Financial Summary
                ...(data.retention?.enabled ? [
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Subtotal: ", bold: true }),
                            new TextRun({ text: `$${displayGross.toLocaleString()}` })
                        ],
                        alignment: AlignmentType.RIGHT
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: `Retención (${data.retention.percentage}%): `, bold: true }),
                            new TextRun({ text: `-$${displayRetention.toLocaleString()}`, color: "DC3232", bold: true })
                        ],
                        alignment: AlignmentType.RIGHT
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Total Neto: ", bold: true, size: 28, color: "004B8D" }),
                            new TextRun({ text: `$${displayNet.toLocaleString()}`, bold: true, size: 28, color: "004B8D" })
                        ],
                        spacing: { before: 100 },
                        alignment: AlignmentType.RIGHT
                    }),
                ] : [
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Total: ", bold: true, size: 28, color: "004B8D" }),
                            new TextRun({ text: `$${(data.finalTotal).toLocaleString()}`, bold: true, size: 28, color: "004B8D" })
                        ],
                        alignment: AlignmentType.RIGHT
                    }),
                ]),

                // Spacing
                new Paragraph({ text: "", spacing: { after: 400 } }),

                // Terms and Conditions
                new Paragraph({
                    children: [new TextRun({ text: "TÉRMINOS Y CONDICIONES", bold: true, color: "004B8D", size: 22 })], // Size 22 is approx 11pt
                    spacing: { after: 200 }
                }),
                ...[
                    "Propuesta Válida durante 30 días desde su emisión.",
                    "Proyecto a iniciar con Orden de Compra formal.",
                    "Costos tasados según acuerdo regional Store Intelligence.",
                    "Sustain no se incluye en espera que el requerimiento no evolucione.",
                    "Desarrollos adicionales serán cotizados por separado.",
                    "Entregables propiedad de Nestlé finalizado el proyecto.",
                    "Sprints de Pago acordados al inicio del proyecto.",
                    "Acuerdo de confidencialidad absoluto sobre datos compartidos."
                ].map(term => new Paragraph({
                    children: [new TextRun({ text: term, size: 18 })], // Size 18 is 9pt
                    bullet: { level: 0 }
                }))
            ]
        }]
    })
    Packer.toBlob(doc).then(blob => {
        saveAs(blob, `cotizacion_${(data.clientName || 'proyecto')}.docx`)
    })
}
