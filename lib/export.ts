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
        const siH = 8.0    // Slightly larger SI logo
        const nestleH = 8.0

        // logo SI (Left)
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

        // Title Block (Right)
        if (!isCover) {
            doc.setFillColor(COLOR_PRIMARY)
            const titleW = 45
            const titleH = 10
            doc.rect(pageWidth - margin - titleW, 10, titleW, titleH, 'F')

            doc.setFont(FONT_BOLD, "bold")
            doc.setFontSize(10)
            doc.setTextColor(255)
            doc.text("COTIZACIÓN", pageWidth - margin - (titleW / 2), 16.5, { align: "center" })
        } else {
            // Nestlé on cover only or all pages? User said "Header: Logo left, title COTIZACIÓN modernized right"
            // Usually logos go in corners. I'll keep Nestlé on the right if not the title block.
            if (LOGO_NESTLE) {
                try {
                    const props = doc.getImageProperties(LOGO_NESTLE)
                    const w = (props.width * nestleH) / props.height
                    doc.addImage(LOGO_NESTLE, 'PNG', pageWidth - margin - w, 12, w, nestleH)
                } catch (e) { }
            }
        }

        // Decorative Line
        doc.setDrawColor(COLOR_PRIMARY)
        doc.setLineWidth(0.5)
        doc.line(margin, 25, pageWidth - margin, 25)
    }

    const drawFooter = (pageNum: number) => {
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Confidencial - The Store Intelligence | Pág. ${pageNum}`, margin, pageHeight - 10)
    }

    // --- PAGE 1: COVER + CLEAN INFO BLOCKS ---
    drawHeader(true)

    let y = 65
    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(40)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("COTIZACIÓN", margin, y)

    y += 12
    doc.setFontSize(12)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.setFont(FONT_REG, "normal")
    doc.text("Estimación de Alcance e Inversión", margin, y)

    y += 35

    // Left Column: Cotizado a
    let leftY = y
    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(10)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("COTIZADO A:", margin, leftY)

    leftY += 8
    doc.setFontSize(14)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text(cleanText(data.clientName), margin, leftY)

    if (data.clientContact?.name) {
        leftY += 6
        doc.setFontSize(10)
        doc.setFont(FONT_REG, "normal")
        doc.setTextColor(COLOR_TEXT)
        doc.text(cleanText(data.clientContact.name), margin, leftY)
    }

    if (data.clientContact?.email) {
        leftY += 5
        doc.setFontSize(9)
        doc.text(data.clientContact.email, margin, leftY)
    }

    // Right Column: Detalles de Cotización
    let rightY = y
    const rightColX = pageWidth / 2 + 10

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(10)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("DETALLES:", rightColX, rightY)

    const drawDetail = (label: string, val: string, currentY: number) => {
        doc.setFont(FONT_REG, "normal")
        doc.setFontSize(9)
        doc.setTextColor(COLOR_TEXT)
        doc.text(label, rightColX, currentY + 7)
        doc.setFont(FONT_BOLD, "bold")
        doc.text(val, pageWidth - margin, currentY + 7, { align: "right" })
        return currentY + 7
    }

    rightY = drawDetail("Fecha de Emisión:", new Date().toLocaleDateString('es-ES'), rightY)
    rightY = drawDetail("ID Cotización:", `SI-${new Date().getTime().toString().substr(-6)}`, rightY)
    rightY = drawDetail("Consultor:", cleanText(data.clientContact?.areaLeader || "Equipo Comercial"), rightY)
    rightY = drawDetail("Validez:", "30 Días", rightY)

    // CENTERED SUMMARY
    y += 55

    // Project Name Block
    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(12)
    doc.setTextColor(COLOR_PRIMARY) // Blue Title
    doc.text("PROYECTO", pageWidth / 2, y, { align: "center" })
    y += 8
    doc.setFont(FONT_REG, "normal")
    doc.setFontSize(10)
    doc.setTextColor(COLOR_TEXT)
    doc.text(cleanText(data.clientName), pageWidth / 2, y, { align: "center" })

    y += 15

    // Objective Block
    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(12)
    doc.setTextColor(COLOR_PRIMARY) // Blue Title
    doc.text("OBJETIVO ESTRATÉGICO", pageWidth / 2, y, { align: "center" })
    y += 8
    doc.setFont(FONT_REG, "normal")
    doc.setFontSize(10)
    doc.setTextColor(COLOR_TEXT)
    const desc = cleanText(data.description || "Solución tecnológica para optimización de datos.")
    const splitDesc = doc.splitTextToSize(desc, contentWidth * 0.8) // Use 80% width for nice centering
    doc.text(splitDesc, pageWidth / 2, y, { align: "center", lineHeightFactor: 1.2 }) // Center, 1.2 spacing

    drawFooter(1)

    // --- PAGE 2: ARCHITECTURE (DIAGRAM + STACK) ---
    doc.addPage()
    drawHeader()
    y = 35

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(14)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("ARQUITECTURA PROPUESTA", margin, y)
    y += 10

    // Diagram (Top)
    if (data.diagramImage) {
        doc.setFont(FONT_BOLD, "bold")
        doc.setTextColor(COLOR_CHARCOAL)
        doc.setFontSize(10)
        doc.text("Flujo de Solución:", margin, y)
        y += 8

        const imgProps = doc.getImageProperties(data.diagramImage)

        const maxW = contentWidth
        const maxH = 120 // More height if needed since summary is gone

        const scaleW = maxW / imgProps.width
        const scaleH = maxH / imgProps.height
        const scale = Math.min(scaleW, scaleH)

        const finalW = imgProps.width * scale
        const finalH = imgProps.height * scale

        try {
            const imgX = margin + (contentWidth - finalW) / 2
            doc.addImage(data.diagramImage, 'PNG', imgX, y, finalW, finalH)
        } catch (e) {
            doc.text("[Diagrama]", margin, y + 10)
        }
        y += finalH + 15
    }

    // TECH STACK (3 Cols)
    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(12)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("STACK TECNOLÓGICO SELECCIONADO", margin, y)
    y += 8

    const stackItems = data.techStack || []

    const colCount = 3
    const colW = (contentWidth / colCount) - 3
    const rowH = 10
    const startX = margin

    if (stackItems.length === 0) {
        doc.setFont(FONT_REG, "italic")
        doc.setFontSize(9)
        doc.setTextColor(COLOR_TEXT)
        doc.text("No se han seleccionado tecnologías específicas.", margin, y)
    } else {
        let colIdx = 0
        let rowY = y

        stackItems.forEach((item, i) => {
            const x = startX + (colIdx * (colW + 4.5))

            doc.setFillColor(COLOR_ROW_ALT)
            doc.rect(x, rowY, colW, rowH, 'F')

            doc.setFontSize(8)
            doc.setTextColor(COLOR_PRIMARY)
            doc.setFont(FONT_BOLD, "bold")
            doc.text("Componente:", x + 2, rowY + 6.5)

            doc.setTextColor(COLOR_TEXT)
            doc.setFont(FONT_REG, "normal")
            doc.text(cleanText(item), x + colW - 2, rowY + 6.5, { align: "right" })

            if (colIdx === colCount - 1) {
                rowY += rowH + 2
                colIdx = 0
            } else {
                colIdx++
            }
        })
    }

    drawFooter(2)

    // --- PAGE 3: INVESTMENT & SUMMARY (CONSOLIDATED) ---
    doc.addPage()
    drawHeader()
    y = 35

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(14)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("DETALLE DE INVERSIÓN", margin, y)
    y += 10

    // Table Header
    doc.setFillColor(COLOR_PRIMARY)
    doc.rect(margin, y, contentWidth, 8, 'F')
    doc.setTextColor(255)
    doc.setFontSize(8)
    doc.setFont(FONT_BOLD, "bold")
    doc.text("CONCEPTO", margin + 5, y + 5)
    doc.text("DURACIÓN", pageWidth - margin - 75, y + 5, { align: 'center' })
    doc.text("MENSUAL", pageWidth - margin - 40, y + 5, { align: 'right' })
    doc.text("SUBTOTAL", pageWidth - margin - 5, y + 5, { align: 'right' })
    y += 8

    // Rows
    // Rows - COMPACT PADDING
    let isReview = true
    const drawRow = (label: string, meta: string, monthly: string, total: string) => {
        if (isReview) {
            doc.setFillColor(COLOR_ROW_ALT)
            doc.rect(margin, y, contentWidth, 7, 'F') // Reduced height from 8 to 7
        }
        isReview = !isReview

        doc.setTextColor(COLOR_TEXT)
        doc.setFont(FONT_BOLD, "bold")
        doc.text(cleanText(label), margin + 5, y + 4.5) // Vertically centered approx

        doc.setFont(FONT_REG, "normal")
        doc.text(cleanText(meta), pageWidth - margin - 75, y + 4.5, { align: 'center' })

        doc.setFont(FONT_BOLD, "bold")
        doc.text(monthly, pageWidth - margin - 40, y + 4.5, { align: 'right' })
        doc.text(total, pageWidth - margin - 5, y + 4.5, { align: 'right' })
        y += 7 // Tighten spacing
    }

    if (data.serviceType === 'Staffing' || data.serviceType === 'Sustain') {
        data.staffingDetails.profiles.forEach(p => {
            if ((p.count || 0) <= 0) return // Skip $0 rows

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

    // CONSOLIDATED TOTALS (Force Page 3)
    y += 10
    const checkH = data.retention?.enabled ? 80 : 60
    if (y + checkH > pageHeight - 20) {
        doc.addPage()
        drawHeader()
        y = 35
    }

    // --- Calcs for Safety (Direct Dashboard Sync) ---
    // Use values EXACTLY as they are in the QuoteBuilder state
    const displayGross = data.grossTotal || data.finalTotal
    let displayRetention = data.retentionAmount || 0
    let displayNet = data.finalTotal

    // Safety: If retention is enabled but amount is 0, calculate it on the fly
    if (data.retention?.enabled && (displayRetention === 0 || !displayRetention)) {
        displayRetention = displayGross * (data.retention.percentage / 100)
        displayNet = displayGross - displayRetention
    }
    // -----------------------------------------

    // Totals Box
    doc.setDrawColor(COLOR_PRIMARY)
    doc.setLineWidth(0.6)
    // Box height dynamic based on retention
    const boxHeight = data.retention?.enabled ? 55 : 40

    doc.rect(margin + 20, y, contentWidth - 40, boxHeight)

    let ty = y + 15
    doc.setFontSize(11)
    doc.setTextColor(COLOR_TEXT)
    doc.setFont(FONT_REG, "normal")

    // 1. Subtotal
    if (data.retention?.enabled) {
        doc.text(cleanText("Subtotal:"), margin + 30, ty)
        doc.setFont(FONT_BOLD, "bold")
        doc.text(fmt(displayGross), pageWidth - margin - 30, ty, { align: "right" })

        // 2. Retention (RED & NEGATIVE)
        ty += 10
        doc.setTextColor(COLOR_TEXT)
        doc.setFont(FONT_REG, "normal")
        doc.text(`Retención (${data.retention.percentage}%):`, margin + 30, ty)

        doc.setTextColor(220, 50, 50) // Red
        doc.setFont(FONT_BOLD, "bold")
        doc.text(`- ${fmt(displayRetention)}`, pageWidth - margin - 30, ty, { align: "right" })

        // 3. Final Net
        ty += 15 // Gap for final
        doc.setTextColor(COLOR_CHARCOAL)
        doc.setFontSize(14)
        doc.text(`TOTAL NETO:`, margin + 30, ty)
        doc.setTextColor(COLOR_PRIMARY)
        doc.setFontSize(18)
        doc.text(fmt(displayNet), pageWidth - margin - 30, ty, { align: "right" })

    } else {
        // Standard view (No retention)
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
