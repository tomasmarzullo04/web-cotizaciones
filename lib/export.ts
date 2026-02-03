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
    const drawHeader = (isCover = false) => {
        const siH = 9.0
        const nestleH = 9.0

        // 1. Blue Background Block for Title (TOP RIGHT)
        doc.setFillColor(COLOR_PRIMARY)
        const blockW = pageWidth * 0.65 // Large block for "INVOICE:" style
        const blockH = 32
        doc.rect(pageWidth - blockW, 0, blockW, blockH, 'F')

        // 2. "COTIZACIÓN" Text in white
        doc.setFont(FONT_BOLD, "bold")
        doc.setFontSize(32)
        doc.setTextColor(255)
        doc.text("COTIZACIÓN:", pageWidth - margin, 20, { align: "right" })

        // 3. logo SI (Left - Vertical Aligned with title)
        if (LOGO_SI) {
            try {
                const props = doc.getImageProperties(LOGO_SI)
                const w = (props.width * siH) / props.height
                doc.addImage(LOGO_SI, 'PNG', margin, 12, w, siH)
            } catch (e) {
                doc.setFontSize(10)
                doc.setTextColor(COLOR_PRIMARY)
                doc.text("STORE INTELLIGENCE", margin, 20)
            }
        }

        // Space/Divider below header
        doc.setDrawColor(COLOR_PRIMARY)
        doc.setLineWidth(0.5)
        doc.line(margin, 35, pageWidth - margin, 35)
    }

    const drawFooter = (pageNum: number) => {
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Confidencial - The Store Intelligence | Pág. ${pageNum}`, margin, pageHeight - 10)
    }

    // --- PAGE 1: INFORMATION + OBJECTIVE + DIAGRAM ---
    drawHeader(true)

    let y = 50

    // INFO BLOCKS IN A SINGLE ROW
    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(9)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("COTIZADO A:", margin, y)
    doc.text("DETALLES DE COTIZACIÓN:", pageWidth / 2 + 5, y)

    y += 6
    doc.setFontSize(12)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text(cleanText(data.clientName), margin, y)

    // Details col
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
    // STRATEGIC OBJECTIVE
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
    y += (objLines.length * 5) + 8

    // DYNAMIC DIAGRAM (Now on Page 1)
    if (data.diagramImage) {
        doc.setFont(FONT_BOLD, "bold")
        doc.setFontSize(10)
        doc.setTextColor(COLOR_PRIMARY)
        doc.text("ARQUITECTURA DE LA SOLUCIÓN", margin, y)
        y += 5

        try {
            const imgProps = doc.getImageProperties(data.diagramImage)
            const imgW = contentWidth
            const imgH = (imgProps.height * imgW) / imgProps.width

            // Check if diagram fits, if not, move to next page or scale down
            if (y + imgH > pageHeight - 20) {
                const scaledH = pageHeight - y - 15
                const scaledW = (imgProps.width * scaledH) / imgProps.height
                doc.addImage(data.diagramImage, 'PNG', margin + (contentWidth - scaledW) / 2, y, scaledW, scaledH)
            } else {
                doc.addImage(data.diagramImage, 'PNG', margin, y, imgW, imgH)
            }
        } catch (e) {
            doc.setFont(FONT_REG, "italic")
            doc.text("[Diagrama no disponible]", margin, y + 5)
        }
    }

    // --- PAGE 2: INVESTMENT + TERMS ---
    doc.addPage()
    drawHeader(false)
    y = 50

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(14)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("DETALLE DE INVERSIÓN", margin, y)
    y += 10

    // Table Header
    doc.setFillColor(COLOR_PRIMARY)
    doc.rect(margin, y, contentWidth, 8, 'F')
    doc.setFontSize(9)
    doc.setTextColor(255)
    doc.text("PERFIL / CONCEPTO", margin + 5, y + 5.5)
    doc.text("CANT.", pageWidth - margin - 75, y + 5.5, { align: 'center' })
    doc.text("MENSUAL", pageWidth - margin - 40, y + 5.5, { align: 'right' })
    doc.text("TOTAL", pageWidth - margin - 5, y + 5.5, { align: 'right' })
    y += 8

    // Rows
    let isReview = true
    const drawRow = (label: string, meta: string, monthly: string, total: string) => {
        if (isReview) {
            doc.setFillColor(COLOR_ROW_ALT)
            doc.rect(margin, y, contentWidth, 7, 'F')
        }
        isReview = !isReview

        doc.setTextColor(COLOR_TEXT)
        doc.setFont(FONT_BOLD, "bold")
        doc.text(cleanText(label), margin + 5, y + 4.5)

        doc.setFont(FONT_REG, "normal")
        doc.text(cleanText(meta), pageWidth - margin - 75, y + 4.5, { align: 'center' })

        doc.setFont(FONT_BOLD, "bold")
        doc.text(monthly, pageWidth - margin - 40, y + 4.5, { align: 'right' })
        doc.text(total, pageWidth - margin - 5, y + 4.5, { align: 'right' })
        y += 7
    }

    if (data.serviceType === 'Staffing' || data.serviceType === 'Sustain') {
        data.staffingDetails.profiles.forEach(p => {
            if ((p.count || 0) <= 0) return

            const rate = p.price || (RATES[Object.keys(RATES).find(k => p.role.toLowerCase().includes(k.replace('_', ' '))) || 'react_dev'] || 4000)
            const alloc = (p.allocationPercentage || 100) / 100
            const monthlySub = rate * alloc * p.count
            const totalSub = monthlySub * data.durationMonths

            drawRow(`${p.role} (${p.seniority || 'Ssr'})`, `${p.count} Rec.`, fmt(monthlySub), fmt(totalSub))
        })
    } else {
        Object.entries(data.roles).forEach(([role, count]) => {
            if (count > 0) {
                const rate = RATES[role] || 0
                const sub = rate * count
                if (sub > 0) {
                    drawRow(role.replace(/_/g, ' ').toUpperCase(), `${count} Rec.`, fmt(sub), fmt(sub * data.durationMonths))
                }
            }
        })
    }

    if (data.l2SupportCost > 0) drawRow("Soporte L2", "10% Mensual", fmt(data.l2SupportCost), fmt(data.l2SupportCost * data.durationMonths))
    if (data.riskCost > 0) drawRow("Fee de Gestión y Riesgo", `${((data.criticitnessLevel?.margin || 0) * 100).toFixed(0)}%`, fmt(data.riskCost), fmt(data.riskCost * data.durationMonths))
    if (data.discountAmount > 0) drawRow("Descuento Comercial", `${data.commercialDiscount}%`, `-${fmt(data.discountAmount)}`, `-${fmt(data.discountAmount * data.durationMonths)}`)

    y += 10

    // --- Calcs for Safety (Direct Dashboard Sync) ---
    const displayGross = data.grossTotal || data.finalTotal
    let displayRetention = data.retentionAmount || 0
    let displayNet = data.finalTotal

    if (data.retention?.enabled && (displayRetention === 0 || !displayRetention)) {
        displayRetention = displayGross * (data.retention.percentage / 100)
        displayNet = displayGross - displayRetention
    }
    // -----------------------------------------

    // Totals Box
    doc.setDrawColor(COLOR_PRIMARY)
    doc.setLineWidth(0.6)
    const boxHeight = data.retention?.enabled ? 55 : 40

    doc.rect(margin + 20, y, contentWidth - 40, boxHeight)

    let ty = y + 15
    doc.setFontSize(11)
    doc.setTextColor(COLOR_TEXT)
    doc.setFont(FONT_REG, "normal")

    if (data.retention?.enabled) {
        doc.text(cleanText("Subtotal:"), margin + 30, ty)
        doc.setFont(FONT_BOLD, "bold")
        doc.text(fmt(displayGross), pageWidth - margin - 30, ty, { align: "right" })

        ty += 10
        doc.setTextColor(COLOR_TEXT)
        doc.setFont(FONT_REG, "normal")
        doc.text(`Retención (${data.retention.percentage}%):`, margin + 30, ty)

        doc.setTextColor(220, 50, 50)
        doc.setFont(FONT_BOLD, "bold")
        doc.text(`- ${fmt(displayRetention)}`, pageWidth - margin - 30, ty, { align: "right" })

        ty += 15
        doc.setTextColor(COLOR_CHARCOAL)
        doc.setFontSize(14)
        doc.text(`TOTAL NETO:`, margin + 30, ty)
        doc.setTextColor(COLOR_PRIMARY)
        doc.setFontSize(18)
        doc.text(fmt(displayNet), pageWidth - margin - 30, ty, { align: "right" })

    } else {
        doc.text(cleanText("TOTAL ESTIMADO:"), margin + 30, ty)
        doc.setFont(FONT_BOLD, "bold")
        doc.text(fmt(data.finalTotal), pageWidth - margin - 30, ty, { align: "right" })

        ty += 15
        doc.setFontSize(14)
        doc.setTextColor(COLOR_CHARCOAL)
        doc.text(`TOTAL PROYECTO (${durationText()}):`, margin + 30, ty)
        doc.setTextColor(COLOR_PRIMARY)
        doc.setFontSize(18)
        doc.text(fmt(data.finalTotal * data.durationMonths), pageWidth - margin - 30, ty, { align: "right" })
    }

    // Notes - Positioned BELOW the box
    y += boxHeight + 8 // Move Y past the box + gap
    doc.setFontSize(8)
    doc.setTextColor(COLOR_TEXT)
    doc.setFont(FONT_REG, "normal")
    doc.text("* Valores no incluyen impuestos aplicables.", margin + 20, y)
    if (data.retention?.enabled) {
        y += 4
        doc.text(`* Retención financiera interna del ${data.retention.percentage}% aplicada pro-forma.`, margin + 20, y)
    }

    drawFooter(3)

    // --- PAGE 4: TERMS & APPROVAL ---
    doc.addPage()
    drawHeader()
    y = 35

    // TÉRMINOS Y CONDICIONES
    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(11) // Header size
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("TÉRMINOS Y CONDICIONES", margin, y)
    y += 8

    doc.setFont(FONT_REG, "normal")
    doc.setFontSize(9) // Legal size
    doc.setTextColor(COLOR_TEXT)

    const terms = [
        "Propuesta Válida durante 30 días desde su emisión.",
        "Proyecto a iniciar por parte de SI cuando exista una Orden de Compra.",
        "El costo de los recursos está tasado al precio acordado con Nestlé regionalmente.",
        "Sustain no se incluye en espera que los requerimientos no evolucionen posterior al proyecto.",
        "Desarrollos adicionales serán cotizados en propuestas adicionales.",
        "Requerimientos: diseño funcional del app y analytics aprobados al inicio del proyecto.",
        "Códigos y entregables serán propiedad de Nestlé finalizado el proyecto.",
        "Los Sprints de Pago se acordaran al inicio del proyecto."
    ]

    const mid = Math.ceil(terms.length / 2)
    const leftTerms = terms.slice(0, mid)
    const rightTerms = terms.slice(mid)

    const termsYStart = y
    leftTerms.forEach((term, idx) => {
        doc.text(`• ${cleanText(term)}`, margin + 2, termsYStart + (idx * 6), { maxWidth: (contentWidth / 2) - 5 })
    })

    rightTerms.forEach((term, idx) => {
        doc.text(`• ${cleanText(term)}`, (pageWidth / 2) + 5, termsYStart + (idx * 6), { maxWidth: (contentWidth / 2) - 5 })
    })

    y = termsYStart + (mid * 6) + 15

    y += 15

    // APPROVAL SECTION
    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(14)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text(cleanText("APROBACIÓN DE PROPUESTA"), margin, y)
    y += 15

    doc.setFont(FONT_REG, "normal")
    doc.setFontSize(10)
    doc.setTextColor(COLOR_TEXT)
    doc.text("Firma de conformidad con la propuesta presentada.", margin, y)

    y += 40

    doc.setDrawColor(150)
    doc.setLineWidth(0.2)

    doc.line(margin + 10, y, margin + 80, y)
    doc.setFontSize(8)
    doc.text("Por THE STORE INTELLIGENCE", margin + 15, y + 5)

    doc.line(pageWidth - margin - 80, y, pageWidth - margin - 10, y)
    doc.text("Por EL CLIENTE", pageWidth - margin - 70, y + 5)

    drawFooter(4)

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
                            new TextRun({ text: `$${(data.finalTotal * data.durationMonths).toLocaleString()}`, bold: true, size: 28, color: "004B8D" })
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
                    "Proyecto a iniciar por parte de SI cuando exista una Orden de Compra.",
                    "El costo de los recursos está tasado al precio acordado con Nestlé regionalmente.",
                    "Sustain no se incluye en espera que los requerimientos no evolucionen posterior al proyecto.",
                    "Desarrollos adicionales serán cotizados en propuestas adicionales.",
                    "Requerimientos: diseño funcional del app y analytics aprobados al inicio del proyecto.",
                    "Códigos y entregables serán propiedad de Nestlé finalizado el proyecto.",
                    "Los Sprints de Pago (en caso de parcialidades) se acordaran al inicio del proyecto."
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
