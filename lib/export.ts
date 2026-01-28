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

// -- Refined 4-Page PDF --
function createPDFDocument(data: QuoteState & { totalMonthlyCost: number, l2SupportCost: number, riskCost: number, totalWithRisk: number, discountAmount: number, finalTotal: number, criticitnessLevel: any, diagramImage?: string, currency?: string, exchangeRate?: number, durationMonths: number }) {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })

    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 20
    const contentWidth = pageWidth - (margin * 2)

    // Design Tokens
    const COLOR_GOLD = '#D4AF37'
    const COLOR_CHARCOAL = '#333533'
    const COLOR_TEXT = '#454545'
    const COLOR_ROW_ALT = '#F9F9F9' // Very subtle gray for striping

    // Fonts
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
        // Alliance Style: SI Left, Client Right
        if (LOGO_SI) {
            try {
                doc.addImage(LOGO_SI, 'PNG', margin, 10, 40, 18) // Left
            } catch (e) { }
        }
        if (LOGO_NESTLE) {
            try {
                doc.addImage(LOGO_NESTLE, 'PNG', pageWidth - margin - 25, 10, 25, 25) // Right
            } catch (e) { }
        }

        // Gold Divider
        doc.setDrawColor(COLOR_GOLD)
        doc.setLineWidth(0.5)
        doc.line(margin, 40, pageWidth - margin, 40)
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
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("PROPUESTA TÉCNICA", pageWidth / 2, y, { align: "center" })

    y += 15
    doc.setFontSize(16)
    doc.setTextColor(COLOR_GOLD)
    doc.text("ESTIMACIÓN DE ALCANCE E INVERSIÓN", pageWidth / 2, y, { align: "center" })

    y += 50
    // Box for details
    doc.setDrawColor(220)
    doc.setLineWidth(0.1)
    doc.rect(margin + 20, y, contentWidth - 40, 50)

    let infoY = y + 15
    const drawInfo = (label: string, value: string) => {
        doc.setFontSize(11)
        doc.setFont(FONT_REG, "normal")
        doc.setTextColor(COLOR_TEXT)
        doc.text(label, margin + 30, infoY)

        doc.setFont(FONT_BOLD, "bold")
        doc.text(value, pageWidth - margin - 30, infoY, { align: "right" })
        infoY += 10
    }

    drawInfo("Cliente:", data.clientName)
    drawInfo("Fecha:", new Date().toLocaleDateString())
    drawInfo("Referencia:", `COT-${new Date().getTime().toString().substr(-6)}`)
    if (data.clientContact?.name) drawInfo("Solicitado por:", data.clientContact.name)

    drawFooter(1)

    // --- PAGE 2: ARCHITECTURE & SCOPE ---
    doc.addPage()
    drawHeader()
    y = 50

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(16)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("1. RESUMEN Y ARQUITECTURA", margin, y)
    y += 10

    doc.setFont(FONT_REG, "normal")
    doc.setFontSize(10)
    doc.setTextColor(COLOR_TEXT)
    const desc = data.description || "Solución tecnológica para optimización de datos."
    const splitDesc = doc.splitTextToSize(desc, contentWidth)
    doc.text(splitDesc, margin, y, { align: "justify", lineHeightFactor: 1.5, maxWidth: contentWidth })
    y += (splitDesc.length * 6) + 10

    // Diagram
    if (data.diagramImage) {
        doc.setFont(FONT_BOLD, "bold")
        doc.text("Diagrama de Solución (Propuesto)", margin, y)
        y += 8

        const imgProps = doc.getImageProperties(data.diagramImage)
        const pdfW = contentWidth
        const pdfH = (imgProps.height * pdfW) / imgProps.width

        // Ensure it fits (max 120mm height)
        const maxH = 120
        const finalH = Math.min(pdfH, maxH)

        try {
            doc.addImage(data.diagramImage, 'PNG', margin, y, pdfW, finalH)
        } catch (e) {
            doc.text("[Error visualizando diagrama]", margin, y + 10)
        }
        y += finalH + 10
    }

    drawFooter(2)

    // --- PAGE 3: BUDGET ---
    doc.addPage()
    drawHeader()
    y = 50

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(16)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("2. DETALLE DE INVERSIÓN", margin, y)
    y += 15

    // Table Header
    doc.setFillColor(COLOR_CHARCOAL)
    doc.rect(margin, y, contentWidth, 10, 'F')
    doc.setTextColor(255)
    doc.setFontSize(9)
    doc.text("CONCEPTO", margin + 5, y + 6)
    doc.text("DURACIÓN", pageWidth - margin - 80, y + 6, { align: 'center' })
    doc.text("MENSUAL", pageWidth - margin - 40, y + 6, { align: 'right' })
    doc.text("SUBTOTAL", pageWidth - margin - 5, y + 6, { align: 'right' })
    y += 10

    // Rows
    let isReview = true
    const drawRow = (label: string, meta: string, monthly: string, total: string) => {
        if (isReview) {
            doc.setFillColor(COLOR_ROW_ALT)
            doc.rect(margin, y, contentWidth, 10, 'F')
        }
        isReview = !isReview

        doc.setTextColor(COLOR_TEXT)
        doc.setFont(FONT_BOLD, "bold") // Label Bold
        doc.text(label, margin + 5, y + 6)

        doc.setFont(FONT_REG, "normal")
        doc.text(meta, pageWidth - margin - 80, y + 6, { align: 'center' })

        doc.setFont(FONT_BOLD, "bold") // Money Bold
        doc.text(monthly, pageWidth - margin - 40, y + 6, { align: 'right' })
        doc.text(total, pageWidth - margin - 5, y + 6, { align: 'right' })
        y += 10
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

    // Extra Costs
    if (data.l2SupportCost > 0) drawRow("Soporte L2", "Mensual", fmt(data.l2SupportCost), fmt(data.l2SupportCost * data.durationMonths))
    if (data.riskCost > 0) drawRow("Fee de Riesgo/Criticidad", `${((data.criticitnessLevel?.margin || 0) * 100).toFixed(0)}%`, fmt(data.riskCost), fmt(data.riskCost * data.durationMonths))
    if (data.discountAmount > 0) drawRow("Descuento Comercial", `${data.commercialDiscount}%`, `-${fmt(data.discountAmount)}`, `-${fmt(data.discountAmount * data.durationMonths)}`)

    drawFooter(3)

    // --- PAGE 4: SUMMARY & TOTALS ---
    doc.addPage()
    drawHeader()
    y = 50

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(16)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text("3. RESUMEN COMERCIAL Y APROBACIÓN", margin, y)
    y += 20

    // Totals Box (Minimalist, Outline)
    doc.setDrawColor(COLOR_GOLD)
    doc.setLineWidth(0.8)
    doc.rect(margin + 20, y, contentWidth - 40, 45)

    let ty = y + 15
    doc.setFontSize(12)
    doc.setTextColor(COLOR_TEXT)
    doc.text("Inversión Mensual Estimada:", margin + 30, ty)
    doc.setFont(FONT_BOLD, "bold")
    doc.text(fmt(data.finalTotal), pageWidth - margin - 30, ty, { align: "right" })

    ty += 15
    doc.setFontSize(14)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text(`TOTAL PROYECTO (${durationText()}):`, margin + 30, ty)
    doc.setTextColor(COLOR_GOLD)
    doc.setFontSize(18)
    doc.text(fmt(data.finalTotal * data.durationMonths), pageWidth - margin - 30, ty, { align: "right" })

    y += 65

    // Notes
    doc.setFontSize(9)
    doc.setTextColor(COLOR_TEXT)
    doc.setFont(FONT_REG, "normal")
    doc.text("* Valores expresados en la moneda seleccionada. No incluyen IVA.", margin, y)
    if (data.retention?.enabled) {
        y += 5
        doc.text(`* Se ha considerado una retención financiera interna del ${data.retention.percentage}%, ya incluida en los cálculos de margen.`, margin, y)
    }

    // Signatures
    y = pageHeight - 60
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

// -- Word Export (Aligned) --
export async function exportToWord(data: any) {
    // Basic implementation to satisfy build - reusing structures
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ children: [new TextRun({ text: "Propuesta Técnica (Versión Editable)", bold: true, size: 48 })] }),
                new Paragraph({ text: "Por favor use el PDF para la versión oficial y formateada.", spacing: { after: 200 } }),
                new Paragraph({ text: `Cliente: ${data.clientName}` }),
                new Paragraph({ text: `Total Proyecto: $${(data.finalTotal * data.durationMonths).toLocaleString()}` })
            ]
        }]
    })
    Packer.toBlob(doc).then(blob => {
        saveAs(blob, `cotizacion_${(data.clientName || 'proyecto')}.docx`)
    })
}
