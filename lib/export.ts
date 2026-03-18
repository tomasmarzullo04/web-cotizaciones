import jsPDF from 'jspdf'
// import { Document ... } from 'docx' - Removed for API generation
import { saveAs } from 'file-saver'
import { LOGO_NESTLE, LOGO_SI } from './logos'
import { DICTIONARY, Language, DictionaryKey } from './translations'

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
        updateSchedules: string[]
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
    lang?: Language
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
    viewMode?: 'monthly' | 'annual',
    servicesCost?: number,
    hypercareCost?: number,
    lang?: Language
}) {
    const lang: Language = data.lang || 'ES'
    const t = (key: DictionaryKey) => DICTIONARY[lang][key] || DICTIONARY['ES'][key] || key

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
    const rateMultiplier = typeof data.exchangeRate === 'number' && !isNaN(data.exchangeRate) ? data.exchangeRate : 1.0
    const fmt = (amount: number) => {
        const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            currencyDisplay: 'code',
            minimumFractionDigits: 2
        }).format(value * rateMultiplier)
    }

    const durationText = () => {
        const val = data.durationValue || 0
        const rounded = Math.round(val) === val ? val : val.toFixed(1)
        const unit = data.durationUnit ? data.durationUnit.toUpperCase() : 'MONTHS'
        return `${rounded} ${unit}`
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
        doc.text(lang === 'PT' ? "COTAÇÃO" : lang === 'EN' ? "QUOTE" : "COTIZACIÓN", pageWidth - margin, 16, { align: "right" })  // Adjusted Y from 21 to 16

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
            const footerPage = lang === 'PT' ? 'Pág.' : lang === 'EN' ? 'Page' : 'Pág.'
            const footerOf = lang === 'PT' ? 'de' : lang === 'EN' ? 'of' : 'de'
            const footerConf = lang === 'PT' ? 'Confidencial' : lang === 'EN' ? 'Confidential' : 'Confidencial'
            doc.text(`The Store Intelligence | ${footerConf} | ${footerPage} ${i} ${footerOf} ${pageCount}`, margin, pageHeight - 10, { align: 'left' })
            const footerProp = lang === 'PT' ? 'Proposta Comercial SI' : lang === 'EN' ? 'SI Commercial Proposal' : 'Propuesta Comercial SI'
            doc.text(footerProp, margin, pageHeight - 6, { align: 'left' })
        }
    }

    // --- CONTENT FLOW ---
    drawHeader()

    let y = 48

    // 1. INFO ROW (Clean side-by-side)
    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(9)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text(lang === 'EN' ? "QUOTED TO:" : lang === 'PT' ? "COTADO PARA:" : "COTIZADO A:", margin, y)
    doc.text(lang === 'EN' ? "QUOTE DETAILS:" : lang === 'PT' ? "DETALHES DA COTAÇÃO:" : "DETALLES DE COTIZACIÓN:", pageWidth / 2 + 5, y)

    y += 6
    doc.setFontSize(12)
    doc.setTextColor(COLOR_CHARCOAL)
    doc.text(cleanText(data.clientName), margin, y)

    const rightX = pageWidth / 2 + 5
    doc.setFontSize(9)
    doc.setFont(FONT_REG, "normal")
    doc.setTextColor(COLOR_TEXT)
    const dateLabel = t('date')
    const dateVal = new Date().toLocaleDateString(lang === 'EN' ? 'en-US' : lang === 'PT' ? 'pt-BR' : 'es-ES')
    doc.text(`${dateLabel}: ${dateVal}`, rightX, y)
    const idStr = data.quoteNumber ? data.quoteNumber.toString().padStart(6, '0') : "000000"
    doc.text(`ID: ${idStr}`, pageWidth - margin, y, { align: 'right' })

    y += 5
    if (data.clientContact?.name) {
        doc.text(cleanText(data.clientContact.name), margin, y)
    }
    const validityLabel = lang === 'EN' ? 'Validity' : lang === 'PT' ? 'Validade' : 'Validez'
    const daysLabel = lang === 'EN' ? 'Days' : lang === 'PT' ? 'Dias' : 'Días'
    doc.text(`${validityLabel}: 30 ${daysLabel}`, rightX, y)
    doc.text(`${t('consultant')}: ${cleanText(data.clientContact?.areaLeader || (lang === 'EN' ? "Sales Team" : lang === 'PT' ? "Equipe Comercial" : "Equipo Comercial"))}`, pageWidth - margin, y, { align: 'right' })

    y += 15

    // 2. STRATEGIC OBJECTIVE
    doc.setFont(FONT_BOLD, "bold")
    doc.setTextColor(COLOR_PRIMARY)
    doc.text(t('strategic_objective').toUpperCase(), margin, y)

    y += 6
    doc.setFont(FONT_REG, "normal")
    doc.setFontSize(9.5)
    doc.setTextColor(COLOR_TEXT)
    const objText = data.serviceType === 'Project'
        ? (lang === 'EN' ? "Design and implementation of an end-to-end technological solution, guaranteeing scalability and alignment with regional standards." : lang === 'PT' ? "Design e implementação de uma solução tecnológica de ponta a ponta, garantindo escalabilidade e alinhamento com os padrões regionais." : "Diseño e implementación de una solución tecnológica punta a punta, garantizando escalabilidad y alineación con los estándares regionales de Nestlé.")
        : data.serviceType === 'Sustain'
            ? (lang === 'EN' ? "Operational continuity and technological evolution of existing digital assets, ensuring performance and compliance with business KPIs." : lang === 'PT' ? "Continuidade operacional e evolução tecnológica de ativos digitais existentes, garantindo performance e conformidade com os KPIs de negócio." : "Continuidad operativa y evolución tecnológica de activos digitales existentes, asegurando performance y cumplimiento de KPIs de negocio.")
            : (lang === 'EN' ? "Technical capacity building through specialized talent integrated into on-demand work cells." : lang === 'PT' ? "Fortalecimento de capacidades técnicas através de talento especializado integrado em células de trabalho sob demanda." : "Fortalecimiento de capacidades técnicas a través de talento especializado integrado en células de trabajo bajo demanda.")

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
    doc.text(t('investment_detail').toUpperCase(), margin, y)
    y += 6

    // Table Header
    doc.setFillColor(COLOR_PRIMARY)
    doc.rect(margin, y, contentWidth, 8, 'F')
    doc.setFontSize(9)
    doc.setTextColor(255)
    const conceptLabel = lang === 'EN' ? "CONCEPT / PROFILE" : lang === 'PT' ? "CONCEITO / PERFIL" : "CONCEPTO / PERFIL"
    const countLabel = lang === 'EN' ? "QTY." : lang === 'PT' ? "QTD." : "CANT."
    const monthlyLabel = t('total_monthly').toUpperCase()
    const totalLabel = data.viewMode === 'annual' ? t('annual_total').toUpperCase() : (lang === 'EN' ? "PROJECT TOTAL" : lang === 'PT' ? "TOTAL PROJETO" : "TOTAL PROYECTO")
    
    doc.text(conceptLabel, margin + 4, y + 5.5) // Increased padding
    doc.text(countLabel, pageWidth - margin - 85, y + 5.5, { align: 'right' })
    doc.text(monthlyLabel, pageWidth - margin - 45, y + 5.5, { align: 'right' })
    doc.text(totalLabel, pageWidth - margin - 5, y + 5.5, { align: 'right' })
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

    // Sustain: Base Service Fee (Class Cost)
    if (data.serviceType === 'Sustain' && (data.servicesCost || 0) > 0) {
        const classLabel = data.criticitnessLevel?.label || 'PENDIENTE'
        const monthlyBase = data.servicesCost || 0
        const dur = data.durationMonths || 1
        const complexLabel = lang === 'EN' ? `Service Complexity (Class ${classLabel})` : lang === 'PT' ? `Complexidade do Serviço (Classe ${classLabel})` : `Complejidad del Servicio (Clase ${classLabel})`
        const fijadoLabel = lang === 'EN' ? 'FIXED' : lang === 'PT' ? 'FIXO' : 'FIJO'
        const totalBase = data.viewMode === 'annual' ? monthlyBase * 12 : monthlyBase * dur
        drawRow(complexLabel, fijadoLabel, fmt(monthlyBase), fmt(totalBase))
    }

    const profiles = data.staffingDetails?.profiles || []
    if (profiles.length > 0) {
        profiles.forEach(p => {
            if ((p.count || 0) <= 0) return
            const rate = p.price || p.cost || 0
            const allocation = (p.allocationPercentage ?? 100) / 100
            const monthlySub = rate * allocation * p.count

            // Resolve Display Name
            let displayName = ROLE_CONFIG[p.role]?.label || p.role.replace(/_/g, ' ').toUpperCase()
            if (data.serviceType === 'Sustain') {
                displayName = `Recurso: ${displayName}`
            }

            // Adjust totals for viewMode
            const displayMonthly = fmt(monthlySub)
            const displayPeriodTotal = data.viewMode === 'annual'
                ? fmt(monthlySub * data.durationMonths)
                : fmt(monthlySub * data.durationMonths)

            // Include allocation percentage in label if less than 100%
            const allocationSuffix = p.allocationPercentage && p.allocationPercentage < 100
                ? ` (${p.allocationPercentage}%)`
                : ""

            drawRow(`${displayName} (${p.seniority || 'Ssr'})${allocationSuffix}`, `${p.count} Rec.`, displayMonthly, displayPeriodTotal)
        })
    } else {
        Object.entries(data.roles || {}).forEach(([role, count]) => {
            if (count > 0) {
                const rate = RATES[role] || 0
                if (rate > 0) {
                    const monthlySub = rate * count
                    const displayMonthly = fmt(monthlySub)
                    const displayPeriodTotal = data.viewMode === 'annual'
                        ? fmt(monthlySub * data.durationMonths)
                        : fmt(monthlySub * data.durationMonths)

                    let displayName = ROLE_CONFIG[role]?.label || role.replace(/_/g, ' ').toUpperCase()
                    drawRow(displayName, `${count} Rec.`, displayMonthly, displayPeriodTotal)
                }
            }
        })
    }

    if (data.serviceType !== 'Staffing' && data.l2SupportCost > 0) {
        const dur = data.durationMonths || 1
        drawRow(lang === 'EN' ? "L2 Support" : lang === 'PT' ? "Suporte L2" : "Soporte L2", "10%", fmt(data.l2SupportCost), fmt(data.l2SupportCost * dur))
    }

    const dur = data.durationMonths || 1
    // Sustain Surcharges
    if (data.serviceType === 'Sustain') {
        if (data.riskCost > 0) drawRow(t('weekend_usage'), lang === 'EN' ? '1.5% Base' : '1.5% Base', fmt(data.riskCost), fmt(data.riskCost * dur))
        if ((data.hypercareCost || 0) > 0) {
            const hCost = data.hypercareCost || 0
            const hyperLabel = lang === 'EN' ? '1 Full Month' : lang === 'PT' ? '1 Mês Completo' : '1 Mes Completo'
            drawRow(t('hypercare'), hyperLabel, fmt(0), fmt(hCost))
        }
    } else {
        if (data.riskCost > 0) drawRow(t('risk_management'), `${((data.criticitnessLevel?.margin || 0) * 100).toFixed(0)}%`, fmt(data.riskCost), fmt(data.riskCost * dur))
    }
    if (data.discountAmount > 0) drawRow(t('commercial_discount'), `${data.commercialDiscount || 0}%`, `-${fmt(data.discountAmount)}`, `-${fmt(data.discountAmount * dur)}`)

    // Totals Box
    y += 10
    const isAnnual = data.viewMode === 'annual'
    const dMonths = data.durationMonths || 1
    const multiplier = isAnnual ? dMonths : 1
    const periodLabel = isAnnual
        ? (lang === 'EN' ? 'ANNUALIZED' : lang === 'PT' ? 'ANUALIZADO' : 'ANUALIZADO')
        : (lang === 'EN' ? 'ESTIMATED TOTAL' : lang === 'PT' ? 'TOTAL ESTIMADO' : 'TOTAL ESTIMADO')
    const netLabel = isAnnual
        ? (lang === 'EN' ? 'TOTAL PROJECTED INVESTMENT' : lang === 'PT' ? 'INVESTIMENTO TOTAL PROJETADO' : 'INVERSIÓN TOTAL PROYECTADA')
        : (lang === 'EN' ? 'ESTIMATED NET INVESTMENT' : lang === 'PT' ? 'INVESTIMENTO LÍQUIDO ESTIMADO' : 'INVERSIÓN NETA ESTIMADA')

    const grossBase = (data.grossTotal || data.finalTotal || 0)
    const displayGross = grossBase * multiplier
    let displayRetention = (data.retentionAmount || 0) * multiplier
    let displayNet = (data.finalTotal || 0) * multiplier

    if (data.retention?.enabled && (displayRetention === 0 || !displayRetention)) {
        displayRetention = displayGross * ((data.retention.percentage || 0) / 100)
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
        doc.text(`Retención(${data.retention.percentage} %): `, pageWidth - margin - boxWidth + boxPadding, ty)
        doc.setFontSize(9)
        doc.text(`- ${fmt(displayRetention)} `, pageWidth - margin - boxPadding, ty, { align: 'right' })
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

    doc.setFontSize(8)
    doc.setTextColor(COLOR_TEXT)
    doc.setFont(FONT_REG, "normal")
    const taxNote = lang === 'EN' ? '* Values do not include applicable taxes.' : lang === 'PT' ? '* Valores não incluem impostos aplicáveis.' : '* Valores no incluyen impuestos aplicables.'
    doc.text(taxNote, margin, y)
    if (data.retention?.enabled) {
        y += 4
        const retNote = lang === 'EN'
            ? `* Internal financial retention of ${data.retention.percentage}% applied pro-forma.`
            : lang === 'PT'
                ? `* Retenção financeira interna de ${data.retention.percentage}% aplicada pro-forma.`
                : `* Retención financiera interna del ${data.retention.percentage}% aplicada pro-forma.`
        doc.text(retNote, margin, y)
    }
    y += 10

    // === 4. SUSTAIN SPECIFIC DETAILS (Operational & Criticality) ===
    if (data.serviceType === 'Sustain' && data.sustainDetails) {
        if (y > pageHeight - 60) { doc.addPage(); drawHeader(); y = 45; }
        else y += 10

        doc.setFont(FONT_BOLD, "bold")
        doc.setFontSize(13)
        doc.setTextColor(COLOR_PRIMARY)
        doc.text(t('operational_definition'), margin, y)
        y += 8

        const metricsList = [
            { label: t('solution') + ':', value: cleanText(data.sustainDetails.solutionName) },
            { label: t('owner') + ':', value: cleanText(data.clientName) },
            { label: t('platform') + ':', value: (data.sustainDetails.techStack || []).join(', ') },
            { label: t('frequency') + ':', value: cleanText(data.updateFrequency) }
        ]

        doc.setFont(FONT_REG, "normal")
        doc.setFontSize(9)
        metricsList.forEach((m) => {
            doc.setTextColor(COLOR_PRIMARY)
            doc.setFont(FONT_BOLD, "bold")
            doc.text(m.label, margin, y)
            
            doc.setTextColor(COLOR_TEXT)
            doc.setFont(FONT_REG, "normal")
            const valLines = doc.splitTextToSize(m.value || "N/A", contentWidth - 30)
            doc.text(valLines, margin + 25, y)
            y += (valLines.length * 4.5) + 1
        })
        y += 6

        // CRITICALITY MATRIX REDESIGN
        if (y > pageHeight - 70) { doc.addPage(); drawHeader(); y = 45; }
        doc.setFont(FONT_BOLD, "bold")
        doc.setFontSize(12)
        doc.setTextColor(COLOR_PRIMARY)
        doc.text(t('criticality'), margin, y)
        y += 6

        const level = data.criticitnessLevel?.level || "N/A"
        const score = data.criticitnessLevel?.score || 0
        const lvlColor = level === 'ALTA' || level === 'HIGH' ? '#D32F2F' : level === 'MEDIA' || level === 'MEDIUM' ? '#F57C00' : '#388E3C'

        // Class and Score Badge (Header Table Row)
        doc.setFillColor(lvlColor)
        doc.rect(margin, y, contentWidth, 8, 'F')
        doc.setTextColor(255)
        doc.setFontSize(9)
        doc.text(`${t('clase')}: ${level}`, margin + 5, y + 5.5)
        doc.text(`SCORE: ${score}/30`, margin + contentWidth - 5, y + 5.5, { align: 'right' })
        y += 8

        // Metrics Table Content
        const matrix = data.sustainDetails.criticalityMatrix
        const matrixItems = [
            [t('support_window'), data.supportHours === '24/7' ? '24/7' : 'Standard'],
            [t('hypercare'), data.sustainDetails.hasHypercare ? t('yes') : t('no')],
            [t('impact_operative'), (matrix?.impactOperative !== undefined) ? matrix.impactOperative : 'N/A'],
            [t('impact_financial'), (matrix?.impactFinancial !== undefined) ? matrix.impactFinancial : 'N/A']
        ]

        matrixItems.forEach((item, idx) => {
            if (idx % 2 === 0) {
                const next = matrixItems[idx+1]
                doc.setFillColor(COLOR_ROW_ALT)
                doc.rect(margin, y, contentWidth, 7, 'F')
                
                doc.setFont(FONT_BOLD, "bold")
                doc.setTextColor(COLOR_PRIMARY)
                doc.setFontSize(8.5)
                doc.text(item[0] + ":", margin + 4, y + 4.5)
                doc.setFont(FONT_REG, "normal")
                doc.setTextColor(COLOR_TEXT)
                doc.text(String(item[1]), margin + 40, y + 4.5)

                if (next) {
                    doc.setFont(FONT_BOLD, "bold")
                    doc.setTextColor(COLOR_PRIMARY)
                    doc.text(next[0] + ":", margin + (contentWidth/2), y + 4.5)
                    doc.setFont(FONT_REG, "normal")
                    doc.setTextColor(COLOR_TEXT)
                    doc.text(String(next[1]), margin + (contentWidth/2) + 40, y + 4.5)
                }
                y += 7
            }
        })
        y += 10
    }

    // === 5. ARCHITECTURE DIAGRAM (Fixed Section) ===
    if (y > pageHeight - 80) { doc.addPage(); drawHeader(); y = 45; }
    else { doc.addPage(); drawHeader(); y = 45; } // Force New Page as requested for distinct flow diagram section

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(11)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text(t('solution_architecture'), margin, y)
    y += 8

    if (data.diagramImage) {
        try {
            const imgProps = doc.getImageProperties(data.diagramImage)
            const imgW = contentWidth
            const imgH = Math.min((imgProps.height * imgW) / imgProps.width, pageHeight - y - 40)
            doc.addImage(data.diagramImage, 'PNG', margin, y, imgW, imgH)
            y += imgH + 10
        } catch (e) {
            const noImgTxt = `[${t('operational_flow')} ${t('not_available').toLowerCase()}]`
            doc.setFont(FONT_REG, "italic")
            doc.setFontSize(9)
            doc.setTextColor(COLOR_TEXT)
            doc.text(noImgTxt, margin, y + 5)
            y += 15
        }
    } else {
        const noImgTxt = `[${t('operational_flow')} ${t('not_available').toLowerCase()}]`
        doc.setFont(FONT_REG, "italic")
        doc.setFontSize(9)
        doc.setTextColor(COLOR_TEXT)
        doc.text(noImgTxt, margin, y + 5)
        y += 15
    }

    // TECH STACK (always)
    if (data.techStack && data.techStack.length > 0) {
        const stackTitle = t('tech_stack').toUpperCase() + ':'
        doc.setFont(FONT_BOLD, "bold")
        doc.setFontSize(9)
        doc.setTextColor(COLOR_PRIMARY)
        doc.text(stackTitle, margin, y)
        y += 5

        // External Dependencies
        const depsTitle = t('external_dependencies') + ':'
        doc.setFont(FONT_BOLD, "bold")
        doc.setFontSize(9)
        doc.setTextColor(COLOR_PRIMARY)
        doc.text(depsTitle, margin, y)
        y += 5

        const techNames: Record<string, string> = {
            'azure': 'Azure Data Factory', 'databricks': 'Azure Databricks', 'synapse': 'Azure Synapse', 'snowflake': 'Snowflake',
            'powerbi': 'Power BI', 'sqlserver': 'SQL Server', 'logicapps': 'Azure Logic Apps', 'tableau': 'Tableau',
            'python': 'Python/Airflow', 'n8n': 'n8n', 'antigravity': 'Google Antigravity', 'lovable': 'Lovable',
            'powerapps': 'Power Apps', 'azure_df': 'Azure Data Factory', 'dotnet': '.NET', 'react': 'React',
            'sql': 'SQL', 'streamlit': 'Streamlit', 'datascience': 'Data Science / ML',
            'other': lang === 'EN' ? 'Others' : lang === 'PT' ? 'Outros' : 'Otros'
        }

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

    // 5. TERMS & CONDITIONS
    if (y > pageHeight - 80) {
        doc.addPage()
        drawHeader()
        y = 45
    } else {
        y = Math.max(y + 10, pageHeight - 85)
    }

    const termsTitle = lang === 'EN' ? 'TERMS AND CONDITIONS:' : lang === 'PT' ? 'TERMOS E CONDIÇÕES:' : 'TÉRMINOS Y CONDICIONES:'

    doc.setDrawColor(COLOR_PRIMARY)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    doc.setFont(FONT_BOLD, "bold")
    doc.setFontSize(10)
    doc.setTextColor(COLOR_PRIMARY)
    doc.text(termsTitle, margin, y)
    y += 6

    doc.setFont(FONT_REG, "normal")
    doc.setFontSize(7) // Slightly smaller for prolijidad
    doc.setTextColor(COLOR_TEXT)

    const terms = lang === 'EN' ? [
        "Proposal Valid for 30 days from issuance.",
        "Project to start with formal Purchase Order.",
        "Costs based on Store Intelligence regional agreement.",
        data.serviceType === 'Staffing'
            ? "Talent assignment subject to availability and profile confirmation."
            : "Sustain not included if the requirement does not evolve.",
        "Additional developments will be quoted separately.",
        "Deliverables owned by Nestlé upon project completion.",
        "Payment Sprints agreed upon project start.",
        "Absolute confidentiality agreement on shared data."
    ] : lang === 'PT' ? [
        "Proposta Válida por 30 dias a partir da emissão.",
        "Projeto a iniciar com Ordem de Compra formal.",
        "Custos baseados no acordo regional da Store Intelligence.",
        data.serviceType === 'Staffing'
            ? "Atribuição de talento sujeita a disponibilidade e confirmação de perfis."
            : "Sustain não incluído caso o requisito não evolua.",
        "Desenvolvimentos adicionais serão cotados separadamente.",
        "Entregas de propriedade da Nestlé após a conclusão do projeto.",
        "Sprints de Pagamento acordados no início do projeto.",
        "Acordo de confidencialidade absoluto sobre dados compartilhados."
    ] : [
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

// --- Export Functions ---

export function exportToPDF(state: any, lang: Language = 'ES') {
    const data = { ...state, lang }
    const doc = createPDFDocument(data)
    doc.save(`cotizacion_${(state.clientName || 'draft').replace(/\s+/g, '_')}_${lang}.pdf`)
}

export async function generatePDFBlob(state: any, lang: Language = 'ES') {
    const data = { ...state, lang }
    const doc = createPDFDocument(data)
    return doc.output('blob')
}

export function exportToWord(state: any, lang: Language = 'ES') {
    const filename = `cotizacion_${(state.clientName || 'draft').replace(/\s+/g, '_')}_${lang}.docx`
    
    fetch('/api/generate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, lang })
    })
    .then(async res => {
        if (res.ok) {
            const blob = await res.blob()
            saveAs(blob, filename)
        } else {
            const err = await res.text()
            console.error("Error generating word:", err)
            alert("Error al generar documento Word")
        }
    })
    .catch(err => {
        console.error("Error calling word api:", err)
        alert("Error de conexión al generar Word")
    })
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
