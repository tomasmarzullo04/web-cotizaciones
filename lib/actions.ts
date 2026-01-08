'use server'

import { prisma } from './prisma'
import { TechnicalParameters, CostBreakdown } from './types'
import { cookies } from 'next/headers'

// Helper to get rates
async function getRates() {
    const rates = await prisma.roleRate.findMany()
    return rates.reduce((acc, rate) => {
        acc[rate.role] = { monthly: rate.monthlyRate, hourly: rate.hourlyRate }
        return acc
    }, {} as Record<string, { monthly: number, hourly: number }>)
}

export async function calculateQuote(params: TechnicalParameters): Promise<CostBreakdown> {
    const rates = await getRates()
    const roles: CostBreakdown['roles'] = []

    // Logic to determine roles based on parameters

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
            cost: deHours * rates['Data Engineer'].hourly
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
            cost: daHours * rates['Data Analyst'].hourly
        })
    }

    // 3. Data Scientists (AI Features)
    if (params.aiFeatures) {
        roles.push({
            role: 'Data Science',
            count: 1,
            hours: 80, // Part time start
            cost: 80 * rates['Data Science'].hourly
        })
    } else if (params.databricksUsage === 'high') {
        // Maybe needs some simple analytics
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
            cost: biHours * rates['BI'].hourly
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

    if (params.databricksUsage !== 'none') {
        diagram += '    Silver -->|Transformación Compleja| Gold[Gold Layer]\n'
        diagram += '    Silver -.->|Ad-hoc| DBX[Databricks SQL]\n'
    } else {
        diagram += '    Silver -->|Modelado| Gold[Data Warehouse]\n'
    }

    // AI/ML Ops
    if (params.aiFeatures) {
        diagram += '    subgraph MLOps [Machine Learning]\n'
        diagram += '       Gold -->|Training| ML[ML Model Training]\n'
        diagram += '       ML -->|Registry| Reg[Model Registry]\n'
        diagram += '       Reg -->|Serving| API[Inference API]\n'
        diagram += '    end\n'
    }

    // Governance
    if (params.securityCompliance === 'strict') {
        diagram += '    gov[Microsoft Purview] -.->|Scan Scanning| Bronze & Silver & Gold\n'
        diagram += '    style gov fill:#f9f,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5\n'

    }
    diagram += '  end\n'

    // Consumption
    diagram += '  Gold -->|Reportes| PBI[Power BI / Tableau]\n'
    if (params.aiFeatures) {
        diagram += '  API -->|Predicciones| App[Aplicación Cliente]\n'
    }

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

    return await prisma.quote.create({
        data: {
            clientName: data.clientName,
            projectType: data.projectType,
            technicalParameters: JSON.stringify(data.params),
            estimatedCost: data.breakdown.totalMonthlyCost,
            staffingRequirements: JSON.stringify(data.breakdown.roles),
            diagramDefinition: data.breakdown.diagramCode,
            userId: userId // Now linking to the logged-in user
        }
    })
}

export async function getUserQuotes() {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) return []

    return await prisma.quote.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    })
}

export async function getRoleRates() {
    return await prisma.roleRate.findMany({
        orderBy: { role: 'asc' }
    })
}

export async function updateRoleRate(role: string, newMonthlyRate: number) {
    const current = await prisma.roleRate.findUnique({ where: { role } })
    if (!current) throw new Error('Role not found')

    return await prisma.roleRate.update({
        where: { role },
        data: {
            monthlyRate: newMonthlyRate,
            hourlyRate: newMonthlyRate / current.baseHours
        }
    })
}

export async function getAllQuotes() {
    return await prisma.quote.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: {
                    name: true,
                    email: true
                }
            }
        }
    })
}

export async function getAdminStats() {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30))

    // 1. Cotizaciones Mes (Last 30 days)
    const monthlyQuotesCount = await prisma.quote.count({
        where: {
            createdAt: { gte: thirtyDaysAgo }
        }
    })

    // 2. Valor Pipeline (Sum estimatedCost last 30 days)
    const monthlyQuotes = await prisma.quote.findMany({
        where: {
            createdAt: { gte: thirtyDaysAgo }
        },
        select: { estimatedCost: true }
    })
    const pipelineValue = monthlyQuotes.reduce((sum, q) => sum + q.estimatedCost, 0)

    // 3. Usuarios Activos (Unique users who created quotes ever - or last 30 days? Prompt says "Usuarios Activos". Let's assume ever or active recently? Usually active means recently active. Let's do unique users in last 30 days for "Active")
    // Re-reading prompt: "Conteo de usuarios únicos que han generado al menos una cotización." This sounds like total unique users with > 0 quotes.
    const uniqueUsers = await prisma.quote.groupBy({
        by: ['userId'],
    })
    const activeUsersCount = uniqueUsers.length

    // 4. Rate (Static for now or derived? Prompt implies "Indicadores (Kpis): Sustituye los valores estáticos". Tasa Conversión isn't explicit in database but I can keep it static or mock it better.)
    // I'll leave conversion static as it requires "closed" status which we don't strictly have (only created).

    return {
        monthlyQuotesCount,
        pipelineValue,
        activeUsersCount,
        conversionRate: 32 // Maintaining static as we don't have "Closed Won" status
    }
}

export async function deleteQuote(quoteId: string) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) throw new Error("Unauthorized")

    // Verify ownership
    const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        select: { userId: true }
    })

    if (!quote) throw new Error("Quote not found")
    if (quote.userId !== userId) throw new Error("Unauthorized access to this quote")

    return await prisma.quote.delete({
        where: { id: quoteId }
    })
}
