'use server'

import { prisma } from './prisma'
import { TechnicalParameters, CostBreakdown } from './types'

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
    return await prisma.quote.create({
        data: {
            clientName: data.clientName,
            projectType: data.projectType,
            technicalParameters: JSON.stringify(data.params),
            estimatedCost: data.breakdown.totalMonthlyCost,
            staffingRequirements: JSON.stringify(data.breakdown.roles),
            diagramDefinition: data.breakdown.diagramCode
        }
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
        orderBy: { createdAt: 'desc' }
    })
}

export async function getAdminStats() {
    const totalQuotes = await prisma.quote.count()
    const allQuotes = await prisma.quote.findMany()
    const totalValue = allQuotes.reduce((sum, q) => sum + q.estimatedCost, 0)
    const avgValue = totalQuotes > 0 ? totalValue / totalQuotes : 0

    // Simple mocked top client logic for demo speed
    // Ideally we'd use a groupBy here but this is fine for MVP
    const topClient = "Global Corp"

    return {
        totalQuotes,
        totalValue,
        avgValue,
        topClient
    }
}
