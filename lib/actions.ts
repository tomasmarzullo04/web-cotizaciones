'use server'

import { prisma } from './prisma'
import { TechnicalParameters, CostBreakdown } from './types'
import { cookies } from 'next/headers'

// Helper to get rates
// Helper to get rates
// Helper to get rates
async function getRates() {
    // Mock internal logic for calculateQuote if used
    return {
        'Data Engineer': { monthly: 4950, hourly: 30.9 },
        'Data Analyst': { monthly: 2500, hourly: 15.6 },
        'Data Science': { monthly: 5100, hourly: 31.8 },
        'BI': { monthly: 4128, hourly: 25.8 }
    }
}

export async function calculateQuote(params: TechnicalParameters): Promise<CostBreakdown> {
    const rates = await getRates() // Now safe
    const roles: CostBreakdown['roles'] = []

    // 1. Data Engineers (Pipelines + Volume + Sources)
    let deHours = 0
    deHours += params.pipelinesCount * 10 // 10h per pipeline setup/maintain
    if (params.dataVolume === 'TB') deHours += 40
    if (params.dataVolume === 'PB') deHours += 80
    if (params.updateFrequency === 'realtime') deHours *= 1.5
    deHours += params.sourceSystemsCount * 5

    // Normalize to full roles if heavy
    const deCount = Math.ceil(deHours / 160)
    if (deCount > 0) {
        roles.push({
            role: 'Data Engineer',
            count: deCount,
            hours: deHours,
            cost: deHours * (rates['Data Engineer']?.hourly || 30.9)
        })
    }

    // 2. Data Analysts (Users + Complexity)
    let daHours = 0
    daHours += params.usersCount * 2 // Support per user
    if (params.reportComplexity === 'medium') daHours += 40
    if (params.reportComplexity === 'high') daHours += 80

    const daCount = Math.ceil(daHours / 160)
    if (daCount > 0) {
        roles.push({
            role: 'Data Analyst',
            count: daCount,
            hours: daHours,
            cost: daHours * (rates['Data Analyst']?.hourly || 15.6)
        })
    }

    // 3. Data Scientists (AI Features)
    if (params.aiFeatures) {
        roles.push({
            role: 'Data Science',
            count: 1,
            hours: 80, // Part time start
            cost: 80 * (rates['Data Science']?.hourly || 31.8)
        })
    }

    // 4. BI (Complexity + Frontend)
    let biHours = 0
    if (params.reportComplexity !== 'low') biHours += 40
    const biCount = Math.ceil(biHours / 160)
    if (biCount > 0) {
        roles.push({
            role: 'BI',
            count: biCount,
            hours: biHours,
            cost: biHours * (rates['BI']?.hourly || 25.8)
        })
    }

    const totalCost = roles.reduce((sum, r) => sum + r.cost, 0)

    // Generate Rich Mermaid Diagram
    let diagram = 'graph LR\n'
    diagram += '  subgraph Sources [Fuentes]\n'
    diagram += '    S1[ERPs] & S2[APIs] & S3[Archivos]\n'
    diagram += '  end\n'

    // Ingest Layer
    if (params.updateFrequency === 'realtime') {
        diagram += '  S1 & S2 -->|Streaming| Kafka[Event Hub/Kafka]\n'
        diagram += '  Kafka -->|Ingesta Continua| Bronze[Lakehouse Bronze]\n'
    } else {
        diagram += '  Sources -->|Batch Ingest| Bronze[Lakehouse Bronze]\n'
    }

    // Processing Layer
    diagram += '  subgraph Platform [Plataforma de Datos]\n'
    diagram += '    Bronze -->|Limpieza| Silver[Silver Layer]\n'
    diagram += '    Silver -->|Modelado| Gold[Data Warehouse]\n'
    if (params.aiFeatures) {
        diagram += '    Gold -->|Training| ML[ML Model]\n'
    }
    diagram += '  end\n'

    // Consumption
    diagram += '  Gold -->|Reportes| PBI[Power BI / Tableau]\n'

    return {
        roles,
        totalMonthlyCost: totalCost,
        diagramCode: diagram
    }
}



export async function saveQuote(data: {
    clientName: string,
    projectType: string,
    params: TechnicalParameters,
    breakdown: CostBreakdown
}) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) throw new Error("User ID not found in session")

    console.log("Saving quote for user:", userId) // DEBUG

    try {
        const result = await prisma.quote.create({
            data: {
                clientName: data.clientName,
                projectType: data.projectType,
                technicalParameters: JSON.stringify(data.params),
                estimatedCost: data.breakdown.totalMonthlyCost,
                staffingRequirements: JSON.stringify(data.breakdown.roles),
                diagramDefinition: data.breakdown.diagramCode,
                userId: userId,
                status: 'BORRADOR'
            }
        })
        console.log("Quote saved successfully:", result.id) // DEBUG
        return result
    } catch (e) {
        console.error("CRITICAL DB ERROR (saveQuote):", e)
        throw e
    }
}

export async function getUserQuotes() {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) return []

    try {
        const quotes = await prisma.quote.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        })
        console.log(`Found ${quotes.length} quotes for user ${userId}`) // DEBUG
        return quotes
    } catch (e) {
        console.error("DB Failed (getUserQuotes)", e)
        return []
    }
}

export async function getRoleRates() {
    // Mock for admin rates editor (though now we use ServiceRates, this might be legacy call)
    return [
        { role: 'Data Engineer', monthlyRate: 4950, hourlyRate: 30.9, baseHours: 160 },
        { role: 'Data Scientist', monthlyRate: 5100, hourlyRate: 31.8, baseHours: 160 }
    ] as any[]
}

export async function updateRoleRate(role: string, newMonthlyRate: number) {
    return { success: true }
}



export async function getAllQuotes() {
    try {
        return await prisma.quote.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } }
        })
    } catch (e) {
        // Mock Admin Data
        return []
    }
}

import { revalidatePath, unstable_noStore } from 'next/cache'

export async function getAdminStats() {
    unstable_noStore()
    // No try/catch - Let it fail if DB is unreachable so we see the error
    const totalQuotes = await prisma.quote.count()
    console.log("Admin Stats - Total Quotes:", totalQuotes) // DEBUG

    // Pipeline Value (Sum of estimatedCost)
    const pipelineAgg = await prisma.quote.aggregate({
        _sum: { estimatedCost: true }
    })
    const pipelineValue = pipelineAgg._sum.estimatedCost || 0

    // Unique Active Users (Count distinct clientName - SQLite workaround via groupBy)
    const uniqueClients = await prisma.quote.groupBy({
        by: ['clientName'],
    })
    const activeUsersCount = uniqueClients.length

    // Approved Count for Conversion Rate
    const approvedCount = await prisma.quote.count({
        where: { status: 'APROBADA' }
    })
    const conversionRate = totalQuotes > 0 ? Math.round((approvedCount / totalQuotes) * 100) : 0

    // Status Distribution - Explicit Counts for Robustness
    const borradorCount = await prisma.quote.count({ where: { status: 'BORRADOR' } })
    const enviadaCount = await prisma.quote.count({ where: { status: 'ENVIADA' } })
    const aprobadaCount = await prisma.quote.count({ where: { status: 'APROBADA' } })
    const rechazadaCount = await prisma.quote.count({ where: { status: 'RECHAZADA' } })

    console.log("Status Counts:", { borradorCount, enviadaCount, aprobadaCount, rechazadaCount }) // DEBUG

    const statusCounts: Record<string, number> = {
        'BORRADOR': borradorCount,
        'ENVIADA': enviadaCount,
        'APROBADA': aprobadaCount,
        'RECHAZADA': rechazadaCount
    }

    return {
        monthlyQuotesCount: totalQuotes,
        pipelineValue,
        activeUsersCount,
        conversionRate,
        statusCounts
    }
}

export async function deleteQuote(quoteId: string) {
    try {
        return await prisma.quote.delete({ where: { id: quoteId } })
    } catch (e) {
        return { success: true }
    }
}

export async function updateQuoteDiagram(quoteId: string, newDiagramCode: string) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) throw new Error("Unauthorized")

    try {
        await prisma.quote.update({
            where: { id: quoteId },
            data: { diagramDefinition: newDiagramCode }
        })
        return { success: true }
    } catch (e) {
        console.error("Failed to update diagram", e)
        return { success: false, error: "Failed to update" }
    }
}



export async function updateQuoteStatus(quoteId: string, status: string) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) throw new Error("Unauthorized")

    try {
        await prisma.quote.update({
            where: { id: quoteId },
            data: { status }
        })
        revalidatePath('/dashboard')
        revalidatePath('/admin')
        return { success: true }
    } catch (e) {
        console.error("Failed to update status", e)
        return { success: false, error: "Failed to update" }
    }
}
