import jsPDF from 'jspdf'
// import { Document ... } from 'docx' - Removed for API generation
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

const ROLE_CONFIG: Record<string, { label: string }> = {
    bi_visualization_developer: { label: "BI Visualization Developer" },
    azure_developer: { label: "Azure Developer" },
    solution_architect: { label: "Solution Architect" },
    bi_data_architect: { label: "BI Data Architect" },
    data_engineer: { label: "Data Engineer" },
    data_scientist: { label: "Data Scientist" },
    data_operations_analyst: { label: "Data / Operations Analyst" },
    project_product_manager: { label: "Project / Product Manager" },
    business_analyst: { label: "Business Analyst" },
    low_code_developer: { label: "Low Code Developer" },
    power_app_streamlit_developer: { label: "Power App / Streamlit Developer" }
}

const SUSTAIN_TECH_OPTIONS = [
    { id: 'azure_df', name: 'Azure Data Factory' },
    { id: 'databricks', name: 'Azure Databricks' },
    { id: 'synapse', name: 'Azure Synapse' },
    { id: 'snowflake', name: 'Snowflake' },
    { id: 'powerbi', name: 'Power BI' },
    { id: 'sqlserver', name: 'SQL Server' },
    { id: 'logicapps', name: 'Azure Logic Apps' },
    { id: 'tableau', name: 'Tableau' },
    { id: 'python', name: 'Python/Airflow' },
    { id: 'n8n', name: 'n8n' },
    { id: 'antigravity', name: 'G. Antigravity' },
    { id: 'lovable', name: 'Lovable' },
    { id: 'powerapps', name: 'Power Apps' }
]

interface QuoteState {
    clientName: string
    quoteNumber?: number
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
            dashboardsCount: number
            dsModelsCount: number
            dataSourcesCount: number
            automationLevel: number
            manualProcess: boolean
            systemDependencies: string
            updateFrequency: string
        }
        businessOwner: string
        devHours: number
        incidentRate: number
        supportWindow: string
        criticalHours: string
        criticalDays: string
        updateDuration: string
        updateSchedule: string
        secondaryUpdateSchedule: string
        weekendUsage: boolean
        weekendDays: string[]
        weekendSupportHours: string
        hypercarePeriod: string
        hasHypercare: boolean
        criticalityMatrix: {
            impactOperative: number
            impactFinancial: number
            userCoverage: number
            countryCoverage: number
            technicalMaturity: number
            dependencies: number
            frequencyOfUse: string
            hasCriticalDates: boolean
            criticalDatesDescription: string
            marketsImpacted: number
            usersImpacted: number
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
function createPDFDocument(data: QuoteState & {
    totalMonthlyCost: number,
    l2SupportCost: number,
    riskCost: number,
    totalWithRisk: number,
    discountAmount: number,
    finalTotal: number,
    criticitnessLevel: any,
    diagramImage?: string,
    currency?: string,
    exchangeRate?: number,
    durationMonths: number,
    grossTotal?: number,
    retentionAmount?: number,
    viewMode?: 'monthly' | 'annual'
}) {
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
            currencyDisplay: 'code', // Show "USD", "MXN", etc.
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

        // Quote Number
        if (data.quoteNumber) {
            doc.setFontSize(10)
            doc.setFont(FONT_REG, "normal")
            doc.text(`#${data.quoteNumber.toString().padStart(6, '0')}`, pageWidth - margin, 21, { align: "right" })
        }

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
    const idStr = data.quoteNumber ? data.quoteNumber.toString().padStart(6, '0') : "000000"
    doc.text(`ID: ${idStr}`, pageWidth - margin, y, { align: 'right' })

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
    doc.text("CANT.", pageWidth - margin - 85, y + 5.5, { align: 'right' })
    doc.text(data.viewMode === 'annual' ? "MENSUAL" : "MENSUAL", pageWidth - margin - 45, y + 5.5, { align: 'right' })
    doc.text(data.viewMode === 'annual' ? "TOTAL ANUAL" : "TOTAL PROYECTO", pageWidth - margin - 5, y + 5.5, { align: 'right' })
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
        doc.text(cleanText(meta), pageWidth - margin - 85, y + 4.5, { align: 'right' })

        doc.setFont(FONT_BOLD, "bold")
        doc.text(monthly, pageWidth - margin - 45, y + 4.5, { align: 'right' })
        doc.text(total, pageWidth - margin - 5, y + 4.5, { align: 'right' })
        y += 7
    }

    const profiles = data.staffingDetails?.profiles || []
    if (profiles.length > 0) {
        profiles.forEach(p => {
            if ((p.count || 0) <= 0) return
            const rate = p.price || p.cost || 0
            const monthlySub = rate * (p.allocationPercentage || 100) / 100 * p.count

            // Resolve Display Name
            let displayName = ROLE_CONFIG[p.role]?.label || p.role.replace(/_/g, ' ').toUpperCase()

            // Adjust totals for viewMode
            const displayMonthly = fmt(monthlySub)
            const displayPeriodTotal = data.viewMode === 'annual'
                ? fmt(monthlySub * 12)
                : fmt(monthlySub * data.durationMonths)

            drawRow(`${displayName} (${p.seniority || 'Ssr'})`, `${p.count} Rec.`, displayMonthly, displayPeriodTotal)
        })
    } else {
        Object.entries(data.roles || {}).forEach(([role, count]) => {
            if (count > 0) {
                const rate = RATES[role] || 0
                if (rate > 0) {
                    const monthlySub = rate * count
                    const displayMonthly = fmt(monthlySub)
                    const displayPeriodTotal = data.viewMode === 'annual'
                        ? fmt(monthlySub * 12)
                        : fmt(monthlySub * data.durationMonths)

                    let displayName = ROLE_CONFIG[role]?.label || role.replace(/_/g, ' ').toUpperCase()
                    drawRow(displayName, `${count} Rec.`, displayMonthly, displayPeriodTotal)
                }
            }
        })
    }

    if (data.serviceType !== 'Staffing' && data.l2SupportCost > 0) drawRow("Soporte L2", "10%", fmt(data.l2SupportCost), fmt(data.l2SupportCost * data.durationMonths))
    if (data.riskCost > 0) drawRow("Fee de Gestión y Riesgo", `${((data.criticitnessLevel?.margin || 0) * 100).toFixed(0)}%`, fmt(data.riskCost), fmt(data.riskCost * data.durationMonths))
    if (data.discountAmount > 0) drawRow("Descuento Comercial", `${data.commercialDiscount || 0}%`, `-${fmt(data.discountAmount)}`, `-${fmt(data.discountAmount * data.durationMonths)}`)

    // Totals Box
    y += 10
    const isAnnual = data.viewMode === 'annual'
    const multiplier = isAnnual ? 12 : 1
    const periodLabel = isAnnual ? "ANUALIZADO" : "TOTAL ESTIMADO"
    const netLabel = isAnnual ? "INVERSIÓN ANUAL PROYECTADA" : "INVERSIÓN NETA ESTIMADA"

    const displayGross = (data.grossTotal || data.finalTotal) * multiplier
    let displayRetention = (data.retentionAmount || 0) * multiplier
    let displayNet = data.finalTotal * multiplier

    if (data.retention?.enabled && (displayRetention === 0 || !displayRetention)) {
        displayRetention = displayGross * (data.retention.percentage / 100)
        displayNet = displayGross - displayRetention
    }

    // Fit-to-content totals box - optimized sizing
    const boxPadding = 5
    const boxWidth = 90 // Increased for longer labels
    const boxH = data.retention?.enabled ? 28 : 18
    if (y + boxH > pageHeight - 30) { doc.addPage(); drawHeader(); y = 45; }

    // Professional Dark Blue Box (fit-to-content)
    doc.setFillColor(0, 75, 141) // #004B8D - Professional Blue
    doc.rect(pageWidth - margin - boxWidth, y, boxWidth, boxH, 'F')

    let ty = y + 6
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text(periodLabel + ":", pageWidth - margin - boxWidth + boxPadding, ty)
    doc.setFontSize(9)
    doc.text(fmt(displayGross / multiplier * multiplier), pageWidth - margin - boxPadding, ty, { align: 'right' })

    if (data.retention?.enabled) {
        ty += 7
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.text(`Retención (${data.retention.percentage}%):`, pageWidth - margin - boxWidth + boxPadding, ty)
        doc.setFontSize(9)
        doc.text(`- ${fmt(displayRetention)}`, pageWidth - margin - boxPadding, ty, { align: 'right' })
        ty += 8
        doc.setFontSize(9)
        doc.setTextColor(255, 255, 255)
        doc.setFont(FONT_BOLD, "bold")
        doc.text(netLabel + ":", pageWidth - margin - boxWidth + boxPadding, ty)
        doc.text(fmt(displayNet), pageWidth - margin - boxPadding, ty, { align: 'right' })
    } else {
        ty += 8
        doc.setFontSize(9)
        doc.setTextColor(255, 255, 255)
        doc.setFont(FONT_BOLD, "bold")
        doc.text(netLabel + ":", pageWidth - margin - boxWidth + boxPadding, ty)
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

    // 4. SUSTAIN SPECIFIC DETAILS (Operational & Criticality)
    if (data.serviceType === 'Sustain' && data.sustainDetails) {
        if (y > pageHeight - 60) { doc.addPage(); drawHeader(); y = 45; }

        doc.setFont(FONT_BOLD, "bold")
        doc.setFontSize(11)
        doc.setTextColor(COLOR_PRIMARY)
        doc.text("DEFINICIÓN OPERACIONAL DEL SERVICIO", margin, y)
        y += 6

        // Sustain Info Grid
        const boxHeight = 55 // Further increased for more bottom breathing room
        doc.setFillColor(COLOR_ROW_ALT)
        doc.rect(margin, y, contentWidth, boxHeight, 'F')

        let sy = y + 7 // Increased top padding
        const paddingX = 8 // Increased horizontal padding
        const col2 = margin + contentWidth / 2 + paddingX

        // Row 1: Solution & Owner
        doc.setFontSize(8)
        doc.setFont(FONT_BOLD, "bold")
        doc.setTextColor(COLOR_PRIMARY)
        doc.text("SOLUCIÓN:", margin + paddingX, sy)
        doc.text("OWNER:", col2, sy)

        sy += 5
        doc.setFont(FONT_REG, "normal")
        doc.setTextColor(COLOR_CHARCOAL)
        doc.text(cleanText(data.sustainDetails.solutionName || "N/A"), margin + paddingX, sy)
        doc.text(cleanText(data.sustainDetails.businessOwner || "Pendiente"), col2, sy)

        // Row 2: Schedules
        sy += 8
        doc.setFont(FONT_BOLD, "bold")
        doc.setTextColor(COLOR_PRIMARY)
        doc.text("HORARIO PRINCIPAL:", margin + paddingX, sy)
        doc.text("HORARIO SECUNDARIO:", col2, sy)

        sy += 5
        doc.setFont(FONT_REG, "normal")
        doc.setTextColor(COLOR_CHARCOAL)
        doc.text(data.sustainDetails.updateSchedule || "No definido", margin + paddingX, sy)
        doc.text(data.sustainDetails.secondaryUpdateSchedule || "N/A", col2, sy)

        // Row 3: Freq & Hypercare
        sy += 8
        doc.setFont(FONT_BOLD, "bold")
        doc.setTextColor(COLOR_PRIMARY)
        doc.text("FRECUENCIA / DURACIÓN:", margin + paddingX, sy)
        doc.text("PERIODO HYPERCARE:", col2, sy)

        sy += 5
        doc.setFont(FONT_REG, "normal")
        doc.setTextColor(COLOR_CHARCOAL)
        doc.text(`${(data.sustainDetails.metrics.updateFrequency || 'daily').toUpperCase()} / ${data.sustainDetails.updateDuration || 'N/A'}`, margin + paddingX, sy)
        const hypercareText = data.sustainDetails.hasHypercare ? "ACTIVADO (+1 MES)" : "NO APLICABLE"
        doc.text(hypercareText, col2, sy)

        // Row 4: Weekend Support
        sy += 8
        doc.setFont(FONT_BOLD, "bold")
        doc.setTextColor(COLOR_PRIMARY)
        doc.text("SOPORTE FINES DE SEMANA / HORARIO:", margin + paddingX, sy)

        const weekendText = data.sustainDetails.weekendUsage
            ? `SÍ (+1.5% FEE) - ${(data.sustainDetails.weekendDays || []).join(', ')}`
            : "NO"
        doc.text(weekendText, margin + paddingX, sy)

        // Row 5: Monitoring Hours
        sy += 8
        doc.setFont(FONT_BOLD, "bold")
        doc.setTextColor(COLOR_PRIMARY)
        doc.text("HORAS DE MONITOREO ESTIMADAS:", margin + paddingX, sy)
        sy += 5
        doc.setFont(FONT_REG, "normal")
        doc.setTextColor(COLOR_CHARCOAL)
        doc.text(`${(data.finalTotal / 160).toFixed(1)} HORAS / MES (BASADO EN CLASE ${data.criticitnessLevel?.label || 'S1'})`, margin + paddingX, sy)

        y += boxHeight + 10

        // CRITICALITY MATRIX
        if (y > pageHeight - 60) { doc.addPage(); drawHeader(); y = 45; }

        doc.setFont(FONT_BOLD, "bold")
        doc.setFontSize(11)
        doc.setTextColor(COLOR_PRIMARY)
        doc.text("MATRIZ DE CRITICIDAD Y MÉTRICAS", margin, y)
        y += 6

        const matrix = data.sustainDetails.criticalityMatrix
        const level = data.criticitnessLevel?.label || "MEDIA"
        const levelColor = level === 'ALTA' ? [190, 50, 50] : level === 'BAJA' ? [50, 150, 50] : [220, 180, 0]

        doc.setFillColor(levelColor[0], levelColor[1], levelColor[2])
        doc.rect(margin, y, 45, 10, 'F') // Increased width for "CLASE PREMIUM"
        doc.setTextColor(255)
        doc.setFontSize(10)
        doc.text(`CLASE ${level}`, margin + 22.5, y + 6.5, { align: 'center' })

        doc.setTextColor(COLOR_TEXT)
        doc.setFontSize(9)
        doc.setFont(FONT_BOLD, "bold")
        doc.text("Impacto Operativo:", margin + 45, y + 4)
        doc.text("Impacto Financiero:", margin + 45, y + 9)

        doc.setFont(FONT_REG, "normal")
        const impactText = (val: number) => val >= 4 ? "Alto" : val >= 2 ? "Medio" : "Bajo"
        doc.text(impactText(matrix.impactOperative), margin + 80, y + 4)
        doc.text(impactText(matrix.impactFinancial), margin + 80, y + 9)

        doc.setFont(FONT_BOLD, "bold")
        doc.text("Uso Crítico:", margin + 110, y + 4)
        doc.text("Cierre Financiero:", margin + 110, y + 9)

        doc.setFont(FONT_REG, "normal")
        doc.text((matrix.frequencyOfUse || 'Diario').toUpperCase(), margin + 140, y + 4)
        doc.text(data.isFinancialOrSales ? "SÍ" : "NO", margin + 140, y + 9)

        if (matrix.hasCriticalDates && matrix.criticalDatesDescription) {
            y += 13
            doc.setFont(FONT_BOLD, "bold")
            doc.text("Fechas Críticas:", margin + 45, y)
            doc.setFont(FONT_REG, "normal")
            doc.text(cleanText(matrix.criticalDatesDescription), margin + 80, y)
            y += 5
        } else {
            y += 18
        }

        // DEPENDENCIES TAGS
        if (data.sustainDetails.metrics.systemDependencies) {
            doc.setFont(FONT_BOLD, "bold")
            doc.setFontSize(9)
            doc.setTextColor(COLOR_PRIMARY)
            doc.text("DEPENDENCIAS EXTERNAS:", margin, y)
            y += 5

            const deps = data.sustainDetails.metrics.systemDependencies.split(',').filter((d: string) => d.trim())
            if (deps.length > 0) {
                doc.setFont(FONT_REG, "normal")
                doc.setFontSize(8.5)
                doc.setTextColor(COLOR_TEXT)
                const depText = deps.join(' • ')
                const depLines = doc.splitTextToSize(depText, contentWidth)
                doc.text(depLines, margin, y)
                y += (depLines.length * 4) + 8
            } else {
                y += 5
            }
        } else {
            y += 5
        }
    }

    // 5. ARCHITECTURE DIAGRAM
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
        data.serviceType === 'Staffing'
            ? "Asignación de talento sujeta a disponibilidad y confirmación de perfiles."
            : "Sustain no se incluye en espera que el requerimiento no evolucione.",
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

// Helper for Base64 Type Detection
function getDataURLType(dataURL: string): 'png' | 'jpg' | 'gif' {
    const match = dataURL.match(/^data:image\/(\w+);base64,/)
    if (match) {
        const type = match[1].toLowerCase()
        if (type === 'jpg') return 'jpg'
        if (type === 'jpeg') return 'jpg' // docx expects 'jpg'
        if (type === 'png') return 'png'
        if (type === 'gif') return 'gif'
    }
    return 'png'
}

// Helper for Base64
function base64DataURLToUint8Array(dataURL: string): Uint8Array {
    if (!dataURL) return new Uint8Array(0)
    // Handle optional data: prefix
    const base64Only = dataURL.includes(',') ? dataURL.split(',')[1] : dataURL;
    try {
        const binaryString = atob(base64Only);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    } catch (e) {
        console.error("Base64 conversion failed", e)
        return new Uint8Array(0)
    }
}

export async function exportToWord(data: any) {
    try {
        const response = await fetch('/api/generate-word', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })

        if (!response.ok) {
            throw new Error('Error al generar el documento')
        }

        const blob = await response.blob()

        // Extract filename from header
        const disposition = response.headers.get('Content-Disposition')
        let filename = `cotizacion_${(data.clientName || 'proyecto').replace(/[^a-zA-Z0-9]/g, '_')}.docx`
        if (disposition && disposition.includes('filename=')) {
            const match = disposition.match(/filename="?([^"]+)"?/)
            if (match && match[1]) filename = match[1]
        }

        saveAs(blob, filename)

    } catch (e) {
        console.error("Export failed", e)
        alert("Hubo un error al generar el archivo Word. Por favor intente nuevamente.")
    }
}
/* REMOVED CLIENT-SIDE GENERATION

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch
                }
            },
            headers: {
                default: new Header({
                    children: [
                        // Floating Client Logo (Top Left)
                        ...(clientLogoData && clientLogoData.length > 0 ? [
                            new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: clientLogoData,
                                        transformation: { width: 120, height: 60 }, // +25% size approx
                                        type: clientType,
                                        floating: {
                                            horizontalPosition: {
                                                relative: HorizontalPositionRelativeFrom.PAGE,
                                                // align: HorizontalPositionAlign.LEFT, // Removed to avoid conflict with offset
                                                offset: 1440 // Margin (1 inch) absolute
                                            },
                                            verticalPosition: {
                                                relative: VerticalPositionRelativeFrom.PAGE,
                                                // align: VerticalPositionAlign.TOP,
                                                offset: 720 // 0.5 inch absolute
                                            },
                                            wrap: { type: TextWrappingType.TIGHT },
                                            behindDocument: false
                                        }
                                    })
                                ]
                            })
                        ] : [])
                    ]
                })
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            children: [
                                // Confidentiality Text
                                new TextRun({
                                    text: `Confidencial - Propiedad de Store Intelligence - ID Referencia: ${data.quoteNumber ? data.quoteNumber.toString().padStart(6, '0') : '[NUEVO]'}`,
                                    size: 16,
                                    color: "999999"
                                }),
                                // SI Logo Right aligned (Floating for precision)
                                ...(siLogoData && siLogoData.length > 0 ? [
                                    new ImageRun({
                                        data: siLogoData,
                                        transformation: { width: 120, height: 40 },
                                        type: siType,
                                        floating: {
                                            horizontalPosition: {
                                                relative: HorizontalPositionRelativeFrom.MARGIN,
                                                align: HorizontalPositionAlign.RIGHT,
                                                // offset: 0 // Removed unnecessary offset
                                            },
                                            verticalPosition: {
                                                relative: VerticalPositionRelativeFrom.MARGIN,
                                                align: VerticalPositionAlign.BOTTOM,
                                                // offset: 0 // Removed necessary offset
                                            },
                                            wrap: { type: TextWrappingType.NONE },
                                            behindDocument: false
                                        }
                                    })
                                ] : [])
                            ],
                            alignment: AlignmentType.LEFT
                        })
                    ]
                })
            },
            children: [
                // === HEADER SECTION ===
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "COTIZACIÓN",
                            bold: true,
                            size: 44,
                            color: "FFFFFF"
                        })
                    ],
                    alignment: AlignmentType.RIGHT,
                    shading: { fill: COLOR_PRIMARY },
                    spacing: { before: 200, after: 400 }
                }),

                // === CLIENT INFO ===
                new Paragraph({
                    children: [new TextRun({ text: "COTIZADO A:", bold: true, size: 20, color: COLOR_PRIMARY })],
                    spacing: { before: 400, after: 200 }
                }),
                new Paragraph({ children: [new TextRun({ text: `Cliente: ${data.clientName}` })], spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: `Referencia Global: ${data.quoteNumber ? data.quoteNumber.toString().padStart(6, '0') : '[PENDIENTE]'}` })], spacing: { after: 100 }, style: "Heading2" }), // ID
                new Paragraph({ children: [new TextRun({ text: `Duración: ${data.durationMonths} meses` })], spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: `Tipo de Servicio: ${data.serviceType}` })], spacing: { after: 300 } }),

                // === INVESTMENT TABLE ===
                new Paragraph({
                    children: [new TextRun({ text: "DETALLE DE INVERSIÓN", bold: true, size: 20, color: COLOR_PRIMARY })],
                    spacing: { before: 400, after: 200 }
                }),

                new Table({
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Concepto", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: COLOR_PRIMARY },
                                    borders: {
                                        top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL },
                                        left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Mensual", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: COLOR_PRIMARY },
                                    borders: {
                                        top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL },
                                        left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: COLOR_PRIMARY },
                                    borders: {
                                        top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL },
                                        left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }
                                    }
                                })
                            ]
                        }),
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
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, color: "CCCCCC" },
                        bottom: { style: BorderStyle.SINGLE, color: "CCCCCC" },
                        left: { style: BorderStyle.NIL },
                        right: { style: BorderStyle.NIL },
                        insideHorizontal: { style: BorderStyle.DOTTED, color: "EEEEEE" },
                        insideVertical: { style: BorderStyle.NIL }
                    }
                }),

                // === TOTALS ===
                new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 300 } }),

                // Tight Blue Box for Total
                new Table({
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [
                                            new TextRun({ text: "TOTAL ESTIMADO: ", bold: true, size: 24, color: "FFFFFF" }),
                                            new TextRun({ text: fmt(displayGross), bold: true, size: 24, color: "FFFFFF" })
                                        ],
                                        alignment: AlignmentType.RIGHT
                                    })],
                                    shading: { fill: COLOR_PRIMARY },
                                    borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
                                    width: { size: 100, type: WidthType.PERCENTAGE } // Can be AUTO to be tight? AUTO works usually
                                })
                            ]
                        })
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    alignment: AlignmentType.RIGHT // Moves the whole table to right?
                }),

                ...(data.retention?.enabled ? [
                    new Paragraph({
                        children: [new TextRun({ text: `Retención (-${data.retention.percentage}%): ${fmt(displayRetention)}` })],
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 100 }
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: `INVERSIÓN NETA: ${fmt(displayNet)}`, bold: true, size: 28, color: COLOR_PRIMARY })],
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 100 }
                    })
                ] : []),


                // === PAGE BREAK FOR DIAGRAM ===
                new Paragraph({ children: [new PageBreak()] }),

                // === DIAGRAM ===
                ...(diagramData && diagramData.length > 0 ? [
                    new Paragraph({
                        children: [new TextRun({ text: "ARQUITECTURA DE LA SOLUCIÓN", bold: true, size: 24, color: COLOR_PRIMARY })],
                        spacing: { before: 200, after: 400 }
                    }),
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: diagramData,
                                transformation: { width: 600, height: 400 }, // Scaled
                                type: diagramType // REQUIRED
                            })
                        ],
                        alignment: AlignmentType.CENTER
                    })
                ] : [
                    new Paragraph({
                        children: [new TextRun({ text: "[Diagrama no disponible]", italics: true })]
                    })
                ]),

                // === TECH STACK ===
                new Paragraph({
                    children: [new TextRun({ text: "Stack Tecnológico:", bold: true })],
                    spacing: { before: 400, after: 100 }
                }),
                new Paragraph({
                    children: (data.techStack || []).map((t: string) => new TextRun({ text: `• ${t}  `, size: 20, color: "555555" })),
                    spacing: { after: 400 }
                }),

                // === AI SUMMARY ===
                ...(data.aiSummary ? [
                    new Paragraph({
                        children: [new TextRun({ text: "RESUMEN EJECUTIVO", bold: true, size: 20, color: COLOR_PRIMARY })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 200 }
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: data.aiSummary })], // Paragraph wrapper
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 400 }
                    })
                ] : []),


                // === TERMS AND CONDITIONS ===
                new Paragraph({ children: [new PageBreak()] }),
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
                    children: [new TextRun({ text: `• ${term}`, size: 20 })],
                    spacing: { after: 120 }
                }))
            ]
        }]
    })

*/
