'use server'
// Synced for Vercel

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




// Helper: Send to Monday via n8n
// Helper: Send to Monday via n8n
async function sendToMonday(quote: any, params: any, breakdown: any, userName: string, userEmail: string) {
    const webhookUrl = process.env.N8N_MONDAY_WEBHOOK
    if (!webhookUrl) return { synced: false, reason: "No Webhook URL configured" }

    try {
        const payload = {
            action: "create",
            id: Number(quote.id) || quote.id,
            userName: userName,
            userEmail: userEmail, // Added explicit email field
            clientName: quote.clientName,
            project: quote.projectType,
            serviceType: quote.serviceType,
            description: params.description || '',
            totalCost: Number(quote.estimatedCost), // Already includes commercial discount
            date: new Date().toISOString(),
            status: quote.status,
            ownerId: quote.userId,

            // Full Technical Parameters Object as requested
            technicalParameters: {
                ...params, // Include all raw params (complexity, users, etc.)
                // Ensure specific nested objects are present
                staffingDetails: params.staffingDetails || null,
                sustainDetails: params.sustainDetails || null,
                commercialDiscount: params.commercialDiscount
            },

            // Legacy breakdown for backward compatibility if needed, or just extra detail
            roles: breakdown.roles.map((r: any) => ({
                role: r.role,
                count: Number(r.count),
                hours: Number(r.hours),
                cost: Number(r.cost)
            })),

            architecture: {
                diagramCode: breakdown.diagramCode
            }
        }

        // Fire and forget (await but don't fail main flow)
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        return { synced: true }
    } catch (e: any) {
        // Silent fail for user, but log for admin
        console.error("[n8n Sync Warning]:", e.message)
        return { synced: false, reason: e.message }
    }
}

// --- N8N WEBHOOK SENDER (Strict Schema Compliance) ---
// --- N8N WEBHOOK SENDER (Strict Schema Compliance) ---
export async function sendQuoteToN8N(quoteData: any, pdfBase64: string, filename: string, userEmail: string = "", userName: string = "", currency: string = "USD", exchangeRate: number = 1.0, originalUSDAmount: number = 0) {
    // PRIORITY: User asked for NEXT_PUBLIC_N8N_MONDAY_WEBHOOK specifically
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_MONDAY_WEBHOOK || process.env.N8N_MONDAY_WEBHOOK || process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL

    if (!webhookUrl) {
        console.warn("CRITICAL: N8N Webhook URL not configured. Checked all variants.")
        return { success: false, error: "Configuration missing: No Webhook URL found" }
    }

    try {
        console.log(`Sending quote to n8n Webhook: ${filename}`)

        // 1. Parse JSON fields safely
        const technicalParameters = typeof quoteData.technicalParameters === 'string'
            ? JSON.parse(quoteData.technicalParameters)
            : quoteData.technicalParameters || {}

        const staffingDetails = typeof quoteData.staffingRequirements === 'string'
            ? JSON.parse(quoteData.staffingRequirements)
            : quoteData.staffingRequirements || []

        // 2. Build Base Payload (Shared Fields)
        const basePayload = {
            action: "create",
            id: quoteData.id,
            userEmail: userEmail,
            userName: userName, // Optional but good to have
            clientName: quoteData.clientName,
            serviceType: quoteData.serviceType,
            status: quoteData.status || "BORRADOR",
            totalCost: Number(quoteData.estimatedCost || 0).toFixed(2), // Ensure 2 decimals
            currency: currency, // GLOBAL CURRENCY
            exchangeRate: exchangeRate,
            originalUSDAmount: Number(originalUSDAmount).toFixed(2), // NEW FIELD
            fileBase64: pdfBase64,
            fileName: filename,
            date: new Date().toISOString(),
            // --- CRM FIELDS ---
            clientId: (quoteData as any).crmContext?.clientId || quoteData.linkedClientId,
            isNewClient: (quoteData as any).crmContext?.isNewClient || false,
            newClientData: (quoteData as any).crmContext?.clientData || null
        }

        // 3. Construct Specific Payload based on Type
        let finalPayload: any = { ...basePayload }

        if (quoteData.serviceType === 'Staffing') {
            finalPayload.technicalParameters = {
                clientName: quoteData.clientName,
                serviceType: "Staffing",
                durationMonths: technicalParameters.durationMonths || 6, // Default or actual
                staffingDetails: {
                    profiles: staffingDetails.filter((p: any) => p.count > 0) // Clean empty profiles
                }
            }
        }
        else if (quoteData.serviceType === 'Sustain') {
            finalPayload.technicalParameters = {
                clientName: quoteData.clientName,
                serviceType: "Sustain",
                supportHours: technicalParameters.supportHours || "Business Hours",
                sustainDetails: technicalParameters.sustainDetails || {}
            }
        }
        else if (quoteData.serviceType === 'Proyecto') {
            finalPayload.project = quoteData.projectType || "Proyecto",
                finalPayload.description = technicalParameters.description || "Sin descripción",
                finalPayload.technicalParameters = {
                    serviceType: "Proyecto",
                    complexity: technicalParameters.complexity || "Medium",
                    // Pass through other critical params
                    pipelinesCount: technicalParameters.pipelinesCount,
                    reportUsers: technicalParameters.reportUsers
                }
        }
        else {
            // Fallback for generic types
            finalPayload.technicalParameters = technicalParameters
        }

        console.log("N8N Payload Prepared. Action:", finalPayload.action)
        console.log("Sending to URL:", webhookUrl)

        // Log Payload Size
        const payloadString = JSON.stringify(finalPayload)
        console.log("Payload Size (KB):", payloadString.length / 1024)

        let res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadString
        })

        if (!res.ok) {
            console.error(`n8n Webhook failed with status ${res.status}`)

            // 413 RETRY LOGIC (Payload Too Large)
            if (res.status === 413) {
                console.warn("Error 413 detected. Retrying without PDF to ensure data delivery...")
                finalPayload.fileBase64 = "" // Clear heavy PDF
                finalPayload.fileName = `${finalPayload.fileName} (No PDF - Size Limit)`

                res = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(finalPayload)
                })

                if (res.ok) {
                    console.log("Retry success: Data sent without PDF.")
                    return { success: true, warning: "PDF omitted due to size limit" }
                }
            }

            console.error(`Response Text: ${await res.text()}`)
            return { success: false, error: `Webhook status ${res.status}` }
        }

        console.log("N8N Webhook Sent Successfully!")
        return { success: true }
    } catch (e: any) {
        console.error("Failed to send to n8n:", e)
        return { success: false, error: e.message }
    }
}


// --- CLIENT / CRM ACTIONS ---

export async function searchClients(query: string) {
    // [Autocomplete] Allow empty query for "Recent Clients" initial load
    // if (!query || query.length < 2) return [] 

    // 1. Get User ID
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value
    if (!userId) return []

    try {
        const clients = await prisma.client.findMany({
            where: {
                // Filter by User Ownership
                userId: userId,
                // Partial match if query exists
                ...(query ? {
                    companyName: {
                        contains: query,
                        mode: 'insensitive'
                    }
                } : {})
            },
            orderBy: { createdAt: 'desc' }, // Show most recent first
            take: 10,
            select: { id: true, companyName: true, contactName: true, email: true, status: true }
        })
        return clients
    } catch (e) {
        console.error("Search Clients Failed", e)
        return []
    }
}

export async function createClient(data: { companyName: string, contactName: string, email: string }) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        return { success: false, error: "Sesión expirada. Recarga la página." }
    }

    try {
        const newClient = await prisma.client.create({
            data: {
                companyName: data.companyName,
                contactName: data.contactName,
                email: data.email,
                status: 'PROSPECTO',
                userId: userId // Link to Owner
            }
        })
        return { success: true, client: newClient }
    } catch (e: any) {
        // Handle unique constraint error
        if (e.code === 'P2002') {
            return { success: false, error: "Ya existe un cliente con ese nombre de empresa." }
        }
        console.error("Create Client Failed", e)
        return { success: false, error: e.message }
    }
}


export async function saveQuote(data: {
    clientName: string,
    projectType: string,
    serviceType: string,
    params: TechnicalParameters,
    breakdown: CostBreakdown,
    estimatedCost?: number, // Optional override
    technicalParameters?: string, // Optional override (JSON string)
    clientId?: string, // NEW: Linked Client ID
    isNewClient?: boolean, // NEW: Flag for n8n
    clientData?: { name: string, contact: string, email: string } // NEW: For creating in Monday
}) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        console.error("SaveQuote Error: No User ID in session")
        return { success: false, error: "No user logged in" }
    }

    // Fetch user details for Webhook
    let userName = "Usuario Desconocido"
    let userEmail = "unknown@example.com"
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (user) {
            userName = user.name || user.email // Fallback to email if name is empty
            userEmail = user.email
        }
    } catch (e) {
        console.warn("Failed to fetch user details for webhook", e)
    }

    console.log("Saving quote for user:", userId)

    try {
        const result = await prisma.quote.create({
            data: {
                clientName: data.clientName,
                projectType: data.projectType,
                serviceType: data.serviceType,
                technicalParameters: data.technicalParameters || JSON.stringify(data.params), // Use override or serialize params
                estimatedCost: data.estimatedCost !== undefined ? data.estimatedCost : data.breakdown.totalMonthlyCost, // Use override or breakdown
                staffingRequirements: JSON.stringify(data.breakdown.roles),
                diagramDefinition: data.breakdown.diagramCode,
                userId: userId,
                status: 'BORRADOR',
                linkedClientId: data.clientId || undefined // Link to DB Client
            }
        })

        // Trigger Monday Sync (Fire and forget, but return status)
        // DISABLED to prevent duplicate webhooks. Consolidated into sendQuoteToN8N
        // const syncResult = await sendToMonday(result, data.params, data.breakdown, userName, userEmail)
        const syncResult = { synced: false, reason: "Consolidated into PDF upload" }

        return {
            success: true,
            quote: result,
            sync: syncResult,
            userEmail,
            userName,
            // Pass back context for the next step (n8n PDF upload)
            crmContext: {
                clientId: data.clientId,
                isNewClient: data.isNewClient,
                clientData: data.clientData
            }
        }
    } catch (e: any) {
        console.error("CRITICAL DB ERROR (saveQuote):", e)
        // Return error to client to debug Vercel issue
        return { success: false, error: e.message || "Database Insert Failed" }
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

// --- SERVICE RATES MANAGEMENT ---

export async function getServiceRates() {
    try {
        const rates = await prisma.serviceRate.findMany({
            orderBy: { service: 'asc' }
        })
        return rates
    } catch (e) {
        console.error("Failed to fetch rates", e)
        return []
    }
}

export async function saveServiceRate(rate: {
    id?: string,
    service: string,
    frequency: string,
    complexity: string,
    basePrice: number,
    multiplier: number
}) {
    // Check if user is admin? (Assumed shielded by UI/Middleware for now)
    try {
        if (rate.id) {
            return await prisma.serviceRate.update({
                where: { id: rate.id },
                data: {
                    service: rate.service,
                    frequency: rate.frequency,
                    complexity: rate.complexity,
                    basePrice: rate.basePrice,
                    multiplier: rate.multiplier
                }
            })
        } else {
            return await prisma.serviceRate.create({
                data: {
                    service: rate.service,
                    frequency: rate.frequency,
                    complexity: rate.complexity,
                    basePrice: rate.basePrice,
                    multiplier: rate.multiplier
                }
            })
        }
    } catch (e) {
        console.error("Failed to save rate", e)
        throw new Error("Failed to save rate")
    }
}

export async function deleteServiceRate(id: string) {
    try {
        await prisma.serviceRate.delete({ where: { id } })
        return { success: true }
    } catch (e) {
        console.error("Failed to delete rate", e)
        return { success: false }
    }
}

export async function updateRoleRate(role: string, newMonthlyRate: number) {
    // Legacy support or alias to new system?
    // Implementation not needed if we switch to full CRUD above
    return { success: true }
}

export async function getAllQuotes() {
    try {
        return await prisma.quote.findMany({
            where: {
                user: {
                    email: { not: 'demo@cotizador.com' }
                }
            },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } }
        })
    } catch (e) {
        console.error("DB Failed (getAllQuotes)", e)
        return []
    }
}

import { revalidatePath, unstable_noStore } from 'next/cache'

export async function getAdminStats() {
    unstable_noStore()
    try {
        const totalQuotes = await prisma.quote.count()
        console.log("Admin Stats - Total Quotes:", totalQuotes) // DEBUG

        // Pipeline Value (Sum of estimatedCost)
        const pipelineAgg = await prisma.quote.aggregate({
            _sum: { estimatedCost: true } // Can return null if no records
        })
        const pipelineValue = pipelineAgg._sum.estimatedCost || 0

        // Unique Active Users (Count distinct clientName - SQLite workaround via groupBy)
        // Wrapped in internal try/catch just in case groupBy is not supported or fails
        let activeUsersCount = 0
        try {
            const uniqueClients = await prisma.quote.groupBy({
                by: ['clientName'],
            })
            activeUsersCount = uniqueClients.length
        } catch (err) {
            console.warn("Failed to separate active users count:", err)
        }

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
    } catch (e) {
        console.error("CRITICAL ADMIN STATS ERROR:", e)
        // Safe Fallback to prevent white screen
        return {
            monthlyQuotesCount: 0,
            pipelineValue: 0,
            activeUsersCount: 0,
            conversionRate: 0,
            statusCounts: { 'BORRADOR': 0, 'ENVIADA': 0, 'APROBADA': 0, 'RECHAZADA': 0 }
        }
    }
}

// --- CLIENT STATUS LOGIC ---

export async function convertProspectToClient(email: string) {
    if (!email) return { success: false, error: "No email provided" }

    try {
        // Find client by email or contact email
        // Note: Schema has Client.email and Client.contactName ??
        // Schema: Client { companyName, contactName, email, status, ... }
        // We will match by email.
        const client = await prisma.client.findFirst({
            where: { email: email }
        })

        if (client) {
            await prisma.client.update({
                where: { id: client.id },
                data: { status: 'CLIENTE' }
            })
            console.log(`Converted Prospect ${client.companyName} to CLIENTE`)
            return { success: true }
        } else {
            // Maybe try to create? For now just return false if not found.
            // Or maybe match by Quote's clientName?
            return { success: false, reason: "Client not found" }
        }

    } catch (e: any) {
        console.error("Failed to convert prospect:", e)
        return { success: false, error: e.message }
    }
}



export async function deleteQuote(quoteId: string) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) return { success: false, error: "Unauthorized" }

    try {
        // Ensure user owns the quote
        const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
        if (!quote) return { success: false, error: "Quote not found" }

        // Admin can delete any? Or strict ownership? Sticking to strict ownership for multitenancy unless admin role check.
        const role = cookieStore.get('session_role')?.value
        if (quote.userId !== userId && role !== 'ADMIN') {
            return { success: false, error: "Forbidden: You do not own this quote" }
        }

        await prisma.quote.delete({ where: { id: quoteId } })
        revalidatePath('/dashboard')
        return { success: true }
    } catch (e) {
        console.error("Delete failed", e)
        return { success: false, error: "Deletion failed" }
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



async function sendStatusUpdateToMonday(quote: any, userId: string, userName: string, userEmail: string) {
    const webhookUrl = process.env.N8N_MONDAY_WEBHOOK
    if (!webhookUrl) return

    try {
        const payload = {
            action: "update",
            id: Number(quote.id) || quote.id,
            userName: userName,
            userEmail: userEmail, // Added explicit email field
            status: quote.status,
            clientName: quote.clientName,
            serviceType: quote.serviceType, // Added for consistency
            totalCost: Number(quote.estimatedCost),
            ownerId: userId,
            date: new Date().toISOString()
        }

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
    } catch (e: any) {
        console.error("[n8n Status Update Failed]:", e.message)
    }
}

export async function updateQuoteStatus(quoteId: string, status: string) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) throw new Error("Unauthorized")

    // Fetch user details for Webhook
    let userName = "Usuario Desconocido"
    let userEmail = "unknown@example.com"
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (user) {
            userName = user.name || user.email // Fallback to email if name empty
            userEmail = user.email
        }
    } catch (e) {
        console.warn("Failed to fetch user details for webhook", e)
    }

    try {
        // Check ownership before update
        const existingQuote = await prisma.quote.findUnique({ where: { id: quoteId } })
        if (!existingQuote) return { success: false, error: "Quote not found" }

        // Admin override or Owner check
        const role = cookieStore.get('session_role')?.value
        if (existingQuote.userId !== userId && role !== 'ADMIN') {
            return { success: false, error: "Forbidden" }
        }

        const updatedQuote = await prisma.quote.update({
            where: { id: quoteId },
            data: { status }
        })

        // 1. Notify n8n of status change
        await sendStatusUpdateToMonday(updatedQuote, userId, userName, userEmail)

        // 2. Trigger Prospect Conversion if Approved/Signed
        if (['APROBADA', 'FIRMADA', 'ACEPTADA'].includes(status.toUpperCase())) {
            if (updatedQuote.linkedClientId) {
                await prisma.client.update({
                    where: { id: updatedQuote.linkedClientId },
                    data: { status: 'CLIENTE' }
                })
            } else {
                // Fallback: Try to find client by name
                const client = await prisma.client.findUnique({
                    where: { companyName: updatedQuote.clientName }
                })
                if (client) {
                    await prisma.client.update({
                        where: { id: client.id },
                        data: { status: 'CLIENTE' }
                    })
                }
            }
        }

        revalidatePath('/dashboard')
        revalidatePath('/admin')
        return { success: true }
    } catch (e) {
        console.error("Failed to update status", e)
        return { success: false, error: "Failed to update" }
    }
}
