import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, ImageRun, ShadingType, AlignmentType, Header, Footer, PageBreak } from 'docx'
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
    clientLogoBase64?: string
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
        const logoClient_Y = 10
        const logoClient_X = margin
        const clientH = 10.94 // Client logo height - INCREASED 25% AGAIN (8.75 to 10.94) - Total +56% from original

        const block_Y = 0
        const block_H = 24  // Reduced from 32 to 24 for minimalism
        const block_W = pageWidth * 0.45 // Reduced from 0.55 to 0.45

        // 1. Blue Background Block for Title (Fixed Position)
        doc.setFillColor(COLOR_PRIMARY)
        doc.rect(pageWidth - block_W, block_Y, block_W, block_H, 'F')

        // 2. "COTIZACIÓN" Text - Smaller and more elegant
        doc.setFont(FONT_BOLD, "bold")
        doc.setFontSize(22)  // Reduced from 30 to 22
        doc.setTextColor(255)
        doc.text("COTIZACIÓN", pageWidth - margin, 16, { align: "right" })  // Adjusted Y from 21 to 16

        // 3. CLIENT LOGO (Fixed Position - Top Left) - SWAPPED & ENLARGED 25%
        if (data.clientLogoBase64) {
            try {
                const props = doc.getImageProperties(data.clientLogoBase64)
                const w = (props.width * clientH) / props.height
                doc.addImage(data.clientLogoBase64, 'PNG', logoClient_X, logoClient_Y, w, clientH)
            } catch (e) {
                doc.setFontSize(10)
                doc.setTextColor(COLOR_PRIMARY)
                doc.text(data.clientName || "CLIENTE", logoClient_X, logoClient_Y + 5)
            }
        }

        // Space/Divider below header (Fixed Y) - Adjusted for smaller header
        doc.setDrawColor(COLOR_PRIMARY)
        doc.setLineWidth(0.4)
        doc.line(margin, 30, pageWidth - margin, 30)  // Moved up from 35 to 30
    }

    const drawFooter = () => {
        const pageCount = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)

            // 1. SI LOGO (Bottom Right - Margin Aligned) - SWAPPED & ENLARGED 20%
            if (LOGO_SI) {
                try {
                    const props = doc.getImageProperties(LOGO_SI)
                    const maxW = 36  // Increased 25% AGAIN (29 to 36) - Total +100% from original 18
                    const maxH = 24  // Increased 25% AGAIN (19 to 24) - Total +100% from original 12
                    let w = (props.width * maxH) / props.height
                    let h = maxH

                    if (w > maxW) {
                        w = maxW
                        h = (props.height * maxW) / props.width
                    }

                    // GEOMETRIC ALIGNMENT:
                    // X: Right edge aligns with page right margin (same as header blue block)
                    // Y: Bottom edge aligns exactly with footer text baseline (pageHeight - 6)
                    const logoX = pageWidth - margin - w  // Right-aligned to margin
                    const logoY = (pageHeight - 6) - h    // Bottom aligns with text baseline

                    doc.addImage(LOGO_SI, 'PNG', logoX, logoY, w, h)
                } catch (e) {
                    console.error("Error drawing SI logo:", e)
                }
            }

            // Footer text - ALL LEFT ALIGNED
            doc.setFontSize(7)
            doc.setFont(FONT_REG, "normal")
            doc.setTextColor(150)
            doc.text(`The Store Intelligence | Confidencial | Pág. ${i} de ${pageCount}`, margin, pageHeight - 10, { align: 'left' })
            doc.text(`Propuesta Comercial SI`, margin, pageHeight - 6, { align: 'left' })
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
    y += (objLines.length * 5) + 8

    // 2.5. AI SUMMARY (if available)
    if (data.description && data.description.trim()) {
        // Blockquote-style design with left border
        const summaryY = y
        const summaryPadding = 8
        const summaryContent = cleanText(data.description)
        const summaryLines = doc.splitTextToSize(summaryContent, contentWidth - summaryPadding - 5)
        const summaryHeight = (summaryLines.length * 4.5) + 10

        // Background box
        doc.setFillColor(240, 245, 250) // Light blue background
        doc.rect(margin, summaryY, contentWidth, summaryHeight, 'F')

        // Left border accent
        doc.setFillColor(0, 75, 141) // Primary blue
        doc.rect(margin, summaryY, 3, summaryHeight, 'F')

        // Summary text
        doc.setFont(FONT_REG, "italic")
        doc.setFontSize(8.5)
        doc.setTextColor(COLOR_TEXT)
        doc.text(summaryLines, margin + summaryPadding, summaryY + 6)

        y += summaryHeight + 12
    } else {
        y += 4
    }

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

    // Fit-to-content totals box - optimized sizing
    const boxPadding = 5
    const boxWidth = data.retention?.enabled ? 75 : 65  // Reduced from 90
    const boxH = data.retention?.enabled ? 28 : 18  // Reduced from 35/25
    if (y + boxH > pageHeight - 30) { doc.addPage(); drawHeader(); y = 45; }

    // Professional Dark Blue Box (fit-to-content)
    doc.setFillColor(0, 75, 141) // #004B8D - Professional Blue
    doc.rect(pageWidth - margin - boxWidth, y, boxWidth, boxH, 'F')

    let ty = y + 6  // Reduced from 7
    doc.setTextColor(255, 255, 255) // White text for contrast
    doc.setFontSize(9)  // Reduced from 10
    doc.text("TOTAL ESTIMADO:", pageWidth - margin - boxWidth + boxPadding, ty)
    doc.text(fmt(displayGross), pageWidth - margin - boxPadding, ty, { align: 'right' })

    if (data.retention?.enabled) {
        ty += 7  // Reduced from 8
        doc.setTextColor(255, 255, 255)
        doc.text(`Retención (${data.retention.percentage}%):`, pageWidth - margin - boxWidth + boxPadding, ty)
        doc.text(`- ${fmt(displayRetention)}`, pageWidth - margin - boxPadding, ty, { align: 'right' })
        ty += 8  // Reduced from 10
        doc.setFontSize(10)  // Reduced from 12
        doc.setTextColor(255, 255, 255)
        doc.text("INVERSIÓN NETA:", pageWidth - margin - boxWidth + boxPadding, ty)
        doc.text(fmt(displayNet), pageWidth - margin - boxPadding, ty, { align: 'right' })
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
            y += imgH + 10

            // TECH STACK LIST (below diagram)
            if (data.techStack && data.techStack.length > 0) {
                y += 5
                doc.setFont(FONT_BOLD, "bold")
                doc.setFontSize(9)
                doc.setTextColor(COLOR_PRIMARY)
                doc.text("STACK TECNOLÓGICO:", margin, y)
                y += 5

                // Map tech IDs to readable names
                const techNames: Record<string, string> = {
                    'azure': 'Azure Data Factory',
                    'databricks': 'Azure Databricks',
                    'synapse': 'Azure Synapse',
                    'snowflake': 'Snowflake',
                    'powerbi': 'Power BI',
                    'sqlserver': 'SQL Server',
                    'logicapps': 'Azure Logic Apps',
                    'tableau': 'Tableau',
                    'python': 'Python/Airflow',
                    'n8n': 'n8n',
                    'antigravity': 'Google Antigravity',
                    'lovable': 'Lovable',
                    'powerapps': 'Power Apps',
                    'azure_df': 'Azure Data Factory',
                    'dotnet': '.NET',
                    'react': 'React',
                    'sql': 'SQL',
                    'streamlit': 'Streamlit',
                    'datascience': 'Data Science / ML',
                    'other': 'Otros'
                }

                // Display tech stack as comma-separated list
                const techList = data.techStack
                    .map((id: string) => techNames[id] || id)
                    .join(' • ')

                doc.setFont(FONT_REG, "normal")
                doc.setFontSize(8.5)
                doc.setTextColor(COLOR_TEXT)
                const techLines = doc.splitTextToSize(techList, contentWidth)
                doc.text(techLines, margin, y)
                y += (techLines.length * 4) + 10
            }

            y += 5
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

    // Single column format for better readability
    const termsYStart = y
    terms.forEach((term, idx) => {
        doc.text(`• ${cleanText(term)}`, margin, termsYStart + (idx * 4.5), { maxWidth: contentWidth })
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
    const displayGross = data.grossTotal || data.finalTotal
    let displayRetention = data.retentionAmount || 0
    let displayNet = data.finalTotal

    if (data.retention?.enabled && (displayRetention === 0 || !displayRetention)) {
        displayRetention = displayGross * (data.retention.percentage / 100)
        displayNet = displayGross - displayRetention
    }

    const COLOR_PRIMARY = "004B8D" // Institutional Blue
    const COLOR_TEXT = "333533"
    const COLOR_GOLD = "F5CB5C"

    // Helper to format currency
    const fmt = (val: number) => `$${val.toLocaleString('en-US')}`

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch margins
                }
            },
            children: [
                // === HEADER SECTION ===
                // Note: Client logo removed from Word export due to docx library TypeScript limitations
                // The logo is still present in the PDF export

                // "COTIZACIÓN" Header (Top Right)
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "COTIZACIÓN",
                            bold: true,
                            size: 44, // 22pt
                            color: "FFFFFF"
                        })
                    ],
                    alignment: AlignmentType.RIGHT,
                    shading: { fill: COLOR_PRIMARY },
                    spacing: { before: 200, after: 400 }
                }),

                // === CLIENT INFO SECTION ===
                new Paragraph({
                    children: [new TextRun({ text: "COTIZADO A:", bold: true, size: 20, color: COLOR_PRIMARY })],
                    spacing: { before: 400, after: 200 }
                }),
                new Paragraph({ text: `Cliente: ${data.clientName}`, spacing: { after: 100 } }),
                new Paragraph({ text: `Duración: ${data.durationMonths} meses`, spacing: { after: 100 } }),
                new Paragraph({ text: `Tipo de Servicio: ${data.serviceType}`, spacing: { after: 300 } }),

                // === INVESTMENT TABLE ===
                new Paragraph({
                    children: [new TextRun({ text: "DETALLE DE INVERSIÓN", bold: true, size: 20, color: COLOR_PRIMARY })],
                    spacing: { before: 400, after: 200 }
                }),

                // Table with institutional blue header
                new Table({
                    rows: [
                        // Header Row
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Concepto", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: COLOR_PRIMARY }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Mensual", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: COLOR_PRIMARY }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: COLOR_PRIMARY }
                                })
                            ]
                        }),
                        // Data Rows - Staffing Profiles
                        ...(data.staffingDetails?.profiles || []).filter((p: any) => (p.count || 0) > 0).map((p: any) => {
                            const rate = p.price || p.cost || 0
                            const monthlySub = rate * (p.allocationPercentage || 100) / 100 * p.count
                            return new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph(`${p.role} (${p.seniority || 'Ssr'})`)] }),
                                    new TableCell({ children: [new Paragraph(fmt(monthlySub))] }),
                                    new TableCell({ children: [new Paragraph(fmt(monthlySub * data.durationMonths))] })
                                ]
                            })
                        })
                    ],
                    width: { size: 100, type: 'pct' }
                }),

                // === TOTALS BOX (Fit-to-content, Institutional Blue) ===
                new Paragraph({ text: "", spacing: { after: 300 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "TOTAL ESTIMADO: ", bold: true, size: 22, color: "FFFFFF" }),
                        new TextRun({ text: fmt(displayGross), bold: true, size: 22, color: "FFFFFF" })
                    ],
                    alignment: AlignmentType.RIGHT,
                    shading: { fill: COLOR_PRIMARY },
                    spacing: { before: 200, after: 200 }
                }),

                ...(data.retention?.enabled ? [
                    new Paragraph({
                        children: [
                            new TextRun({ text: `Retención (${data.retention.percentage}%): `, bold: true, color: "FFFFFF" }),
                            new TextRun({ text: `- ${fmt(displayRetention)}`, bold: true, color: "FFFFFF" })
                        ],
                        alignment: AlignmentType.RIGHT,
                        shading: { fill: COLOR_PRIMARY },
                        spacing: { after: 200 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "INVERSIÓN NETA: ", bold: true, size: 24, color: "FFFFFF" }),
                            new TextRun({ text: fmt(displayNet), bold: true, size: 24, color: "FFFFFF" })
                        ],
                        alignment: AlignmentType.RIGHT,
                        shading: { fill: COLOR_PRIMARY },
                        spacing: { after: 300 }
                    })
                ] : []),

                // === ARCHITECTURE DIAGRAM ===
                // Note: Diagram removed from Word export due to docx library TypeScript limitations
                // The diagram is still present in the PDF export
                ...(data.diagramImage ? [
                    new Paragraph({
                        children: [new TextRun({ text: "ARQUITECTURA DE LA SOLUCIÓN", bold: true, size: 20, color: COLOR_PRIMARY })],
                        spacing: { before: 600, after: 200 }
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: "[Ver diagrama en versión PDF]", italics: true, color: "666666" })],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }
                    })
                ] : []),

                // === AI SUMMARY (Centered) ===
                ...(data.aiSummary ? [
                    new Paragraph({ text: "", spacing: { after: 400 } }),
                    new Paragraph({
                        children: [new TextRun({ text: "RESUMEN EJECUTIVO", bold: true, size: 20, color: COLOR_PRIMARY })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 200 }
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: data.aiSummary, size: 22 })],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }
                    })
                ] : []),

                // === PAGE BREAK ===
                new Paragraph({ children: [new PageBreak()] }),

                // === TERMS AND CONDITIONS (Single Column) ===
                new Paragraph({
                    children: [new TextRun({ text: "TÉRMINOS Y CONDICIONES", bold: true, color: COLOR_PRIMARY, size: 24 })],
                    spacing: { before: 400, after: 300 }
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
                    children: [new TextRun({ text: term, size: 20 })],
                    bullet: { level: 0 },
                    spacing: { after: 150 }
                })),

                // === FOOTER (SI Logo - Absolute Positioning) ===
                new Paragraph({ text: "", spacing: { after: 800 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "The Store Intelligence | Confidencial", size: 16, color: "999999" })
                    ],
                    alignment: AlignmentType.LEFT
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Propuesta Comercial SI", size: 16, color: "999999" })
                    ],
                    alignment: AlignmentType.LEFT
                })
            ]
        }]
    })

    Packer.toBlob(doc).then(blob => {
        saveAs(blob, `cotizacion_${(data.clientName || 'proyecto').replace(/\s+/g, '_')}.docx`)

    })
}
