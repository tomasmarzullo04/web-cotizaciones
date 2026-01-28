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

// -- Final Optimized PDF --
function createPDFDocument(data: QuoteState & { totalMonthlyCost: number, l2SupportCost: number, riskCost: number, totalWithRisk: number, discountAmount: number, finalTotal: number, criticitnessLevel: any, diagramImage?: string, currency?: string, exchangeRate?: number, durationMonths: number }) {
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

    // --- Header & Footer ---
    const drawHeader = () => {
        // Balanced Logos: SI smaller, Nestlé larger to look equal weight
        const siLogoH = 9   // Small enough to look sharp
        const nestleLogoH = 12 // Larger to visually balance

        // SI Logo (Left)
        if (LOGO_SI) {
            try {
                const props = doc.getImageProperties(LOGO_SI)
                const w = (props.width * siLogoH) / props.height
                doc.addImage(LOGO_SI, 'PNG', margin, 10, w, siLogoH)
            } catch (e) {
                doc.setFontSize(10)
                doc.text("STORE INTELLIGENCE", margin, 20)
            }
        }

        // Nestlé (Right)
        if (LOGO_NESTLE) {
            try {
                const props = doc.getImageProperties(LOGO_NESTLE)
                const w = (props.width * nestleLogoH) / props.height
                doc.addImage(LOGO_NESTLE, 'PNG', pageWidth - margin - w, 10, w, nestleLogoH)
            } catch (e) { }
        }

        // Blue Divider
        doc.setDrawColor(COLOR_PRIMARY)
        doc.setLineWidth(0.8)
        doc.line(margin, 25, pageWidth - margin, 25)
    }

    const drawFooter = (pageNum: number) => {
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Confidencial - The Store Intelligence | Pág. ${pageNum}`, margin, pageHeight - 10)
    }

    // --- PAGE 1: COVER ---
    drawHeader()

    let y = 100
    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(32)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("PROPUESTA TÉCNICA", pageWidth / 2, y, { align: "center" })

    y += 15
    doc.setFontSize(16)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("ESTIMACIÓN DE ALCANCE E INVERSIÓN", pageWidth / 2, y, { align: "center" })

    y += 50
    // Box for details
    doc.setDrawColor(COLOR_PRIMARY)
    doc.setLineWidth(0.5)
    doc.rect(margin + 20, y, contentWidth - 40, 45)

    let infoY = y + 15
    const drawInfo = (label: string, value: string) => {
        doc.setFontSize(11)
        doc.setFont(FONT_REG, "normal")
        doc.setTextColor(COLOR_TEXT)
        doc.text(label, margin + 40, infoY)

        doc.setFont(FONT_BOLD, "bold")
        doc.text(value, pageWidth - margin - 40, infoY, { align: "right" })
        infoY += 12
    }

    drawInfo("Cliente:", data.clientName)
    drawInfo("Fecha:", new Date().toLocaleDateString())
    drawInfo("Referencia:", `COT-${new Date().getTime().toString().substr(-6)}`)

    drawFooter(1)

    // --- PAGE 2: ARCHITECTURE & STACK (DYNAMIC) ---
    doc.addPage()
    drawHeader()
    y = 35 // Content Start

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(14)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("1. RESUMEN Y ARQUITECTURA", margin, y)
    y += 8

    // Summary
    doc.setFont(FONT_REG, "normal")
    doc.setFontSize(9)
    doc.setTextColor(COLOR_TEXT)
    const desc = data.description || "Solución tecnológica para optimización de datos."
    const splitDesc = doc.splitTextToSize(desc, contentWidth)
    // Left align fixed river issues
    doc.text(splitDesc, margin, y, { align: "left", lineHeightFactor: 1.4, maxWidth: contentWidth })
    y += (splitDesc.length * 5) + 8

    // Diagram - STRICT ASPECT RATIO
    if (data.diagramImage) {
        doc.setFont(FONT_BOLD, "bold")
        doc.setTextColor(COLOR_CHARCOAL)
        doc.text("Diagrama de Solución:", margin, y)
        y += 8 // Increased padding

        const imgProps = doc.getImageProperties(data.diagramImage)

        // Target Box
        const maxW = contentWidth * 0.95
        const maxH = 90

        // Calculate scale ratios
        const scaleW = maxW / imgProps.width
        const scaleH = maxH / imgProps.height

        // Use smallest scale to fit BOTH dimensions without stretching
        const scale = Math.min(scaleW, scaleH)

        const finalW = imgProps.width * scale
        const finalH = imgProps.height * scale

        try {
            const imgX = margin + (contentWidth - finalW) / 2
            doc.addImage(data.diagramImage, 'PNG', imgX, y, finalW, finalH) // No stretching
        } catch (e) {
            doc.text("[Diagrama]", margin, y + 10)
        }
        y += finalH + 15 // Increased padding below
    }

    // DYNAMIC TECH STACK
    if (y + 30 > pageHeight - 20) {
        doc.addPage()
        drawHeader()
        y = 35
    }

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(12)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("STACK TECNOLÓGICO SELECCIONADO", margin, y)
    y += 8

    const stackItems = data.techStack || []

    // Grid (2 Col)
    const colW = (contentWidth / 2) - 3
    const rowH = 10
    const startX = margin

    let colIdx = 0
    let rowY = y

    if (stackItems.length === 0) {
        doc.setFont(FONT_REG, "italic")
        doc.setFontSize(9)
        doc.setTextColor(COLOR_TEXT)
        doc.text("No se han seleccionado tecnologías específicas.", margin, y)
        y += 10
    } else {
        stackItems.forEach((item, i) => {
            const x = colIdx === 0 ? startX : startX + colW + 6

            doc.setFillColor(COLOR_ROW_ALT)
            doc.rect(x, rowY, colW, rowH, 'F')

            doc.setFontSize(9)
            doc.setTextColor(COLOR_PRIMARY)
            doc.setFont(FONT_BOLD, "bold")
            doc.text("Componente:", x + 3, rowY + 6.5)

            doc.setTextColor(COLOR_TEXT)
            doc.setFont(FONT_REG, "normal")
            doc.text(item, x + colW - 3, rowY + 6.5, { align: "right" })

            if (colIdx === 1) {
                rowY += rowH + 2
                colIdx = 0
            } else {
                colIdx = 1
            }
        })
        y = rowY + (colIdx === 1 ? rowH + 2 : 0) + 5
    }

    drawFooter(2)

    // --- PAGE 3: INVESTMENT & SUMMARY (CONSOLIDATED) ---
    doc.addPage()
    drawHeader()
    y = 35

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(14)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("2. DETALLE DE INVERSIÓN", margin, y)
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
    let isReview = true
    const drawRow = (label: string, meta: string, monthly: string, total: string) => {
        if (isReview) {
            doc.setFillColor(COLOR_ROW_ALT)
            doc.rect(margin, y, contentWidth, 8, 'F')
        }
        isReview = !isReview

        doc.setTextColor(COLOR_TEXT)
        doc.setFont(FONT_BOLD, "bold")
        doc.text(label, margin + 5, y + 5)

        doc.setFont(FONT_REG, "normal")
        doc.text(meta, pageWidth - margin - 75, y + 5, { align: 'center' })

        doc.setFont(FONT_BOLD, "bold")
        doc.text(monthly, pageWidth - margin - 40, y + 5, { align: 'right' })
        doc.text(total, pageWidth - margin - 5, y + 5, { align: 'right' })
        y += 8
    }

    if (data.serviceType === 'Staffing' || data.serviceType === 'Sustain') {
        data.staffingDetails.profiles.forEach(p => {
            const rate = RATES[Object.keys(RATES).find(k => p.role.toLowerCase().includes(k.replace('_', ' '))) || 'react_dev'] || 4000
            const alloc = (p.allocationPercentage || 100) / 100
            const sub = rate * alloc * p.count
            drawRow(p.role, `${p.count} Rec. (${p.seniority})`, fmt(sub), fmt(sub * data.durationMonths))
        })
    } else {
        Object.entries(data.roles).forEach(([role, count]) => {
            if (count > 0) {
                const rate = RATES[role] || 0
                const sub = rate * count
                drawRow(role.replace(/_/g, ' ').toUpperCase(), `${count} Rec.`, fmt(sub), fmt(sub * data.durationMonths))
            }
        })
    }

    if (data.l2SupportCost > 0) drawRow("Soporte L2", "Mensual", fmt(data.l2SupportCost), fmt(data.l2SupportCost * data.durationMonths))
    if (data.riskCost > 0) drawRow("Fee de Riesgo", `${((data.criticitnessLevel?.margin || 0) * 100).toFixed(0)}%`, fmt(data.riskCost), fmt(data.riskCost * data.durationMonths))
    if (data.discountAmount > 0) drawRow("Descuento", `${data.commercialDiscount}%`, `-${fmt(data.discountAmount)}`, `-${fmt(data.discountAmount * data.durationMonths)}`)

    // CONSOLIDATED TOTALS (Must stay on Page 3)
    y += 10
    if (y + 40 > pageHeight - 20) {
        doc.addPage()
        drawHeader()
        y = 35
    }

    // Totals Box
    doc.setDrawColor(COLOR_PRIMARY)
    doc.setLineWidth(0.6)
    doc.rect(margin + 20, y, contentWidth - 40, 40)

    let ty = y + 15
    doc.setFontSize(11)
    doc.setTextColor(COLOR_TEXT)
    doc.setFont(FONT_REG, "normal")
    // Explicit encoding check is handled by file saving as UTF-8, jsPDF default font usually ok.
    doc.text("Inversión Mensual Estimada:", margin + 30, ty)
    doc.setFont(FONT_BOLD, "bold")
    doc.text(fmt(data.finalTotal), pageWidth - margin - 30, ty, { align: "right" })

    ty += 15
    doc.setFontSize(14)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text(`TOTAL PROYECTO (${durationText()}):`, margin + 30, ty)
    doc.setTextColor(COLOR_PRIMARY)
    doc.setFontSize(18)
    doc.text(fmt(data.finalTotal * data.durationMonths), pageWidth - margin - 30, ty, { align: "right" })

    // Notes
    y += 50
    doc.setFontSize(8)
    doc.setTextColor(COLOR_TEXT)
    doc.setFont(FONT_REG, "normal")
    doc.text("* Valores no incluyen impuestos aplicables.", margin, y)
    if (data.retention?.enabled) {
        y += 4
        doc.text(`* Retención financiera interna del ${data.retention.percentage}% aplicada pro-forma.`, margin, y)
    }

    drawFooter(3)

    // --- PAGE 4: APPROVAL ---
    doc.addPage()
    drawHeader()
    y = 50

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(14)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text("3. APROBACIÓN", margin, y) // Aprobación with tilde
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

    const filename = `cotizacion_${(data.clientName || 'proyecto').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
    return doc
}

export async function exportToPDF(data: any) {
    createPDFDocument(data)
}

export async function generatePDFBlob(data: any) {
    const doc = createPDFDocument(data)
    return doc.output('blob')
}

// -- Word Export --
export async function exportToWord(data: any) {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ children: [new TextRun({ text: "Propuesta Técnica (Versión Editable)", bold: true, size: 48 })] }),
                new Paragraph({ text: "Versión simplificada.", spacing: { after: 200 } }),
                new Paragraph({ text: `Cliente: ${data.clientName}` }),
                new Paragraph({ text: `Total: $${(data.finalTotal * data.durationMonths).toLocaleString()}` })
            ]
        }]
    })
    Packer.toBlob(doc).then(blob => {
        saveAs(blob, `cotizacion_${(data.clientName || 'proyecto')}.docx`)
    })
}
