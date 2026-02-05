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
            status: quoteData.status || "NUEVA",
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
                // Partial match if query exists (UserId filter removed for globalization)
                ...(query ? {
                    companyName: {
                        contains: query,
                        mode: 'insensitive'
                    }
                } : {})
            },
            orderBy: { companyName: 'asc' },
            select: { id: true, companyName: true, contactName: true, email: true, status: true, clientLogoUrl: true }
        })
        return clients
    } catch (e) {
        console.error("Search Clients Failed", e)
        return []
    }
}

export async function createClient(data: { companyName: string, contactName: string, email: string, clientLogoUrl?: string }) {
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
                clientLogoUrl: data.clientLogoUrl,
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

// --- CLIENT LOGO MANAGEMENT ---

export async function uploadClientLogo(formData: FormData, oldLogoUrl?: string) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        return { success: false, error: "Sesión expirada. Recarga la página." }
    }

    try {
        const file = formData.get('file') as File
        if (!file) {
            return { success: false, error: "No se seleccionó ningún archivo" }
        }

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
        if (!validTypes.includes(file.type)) {
            return { success: false, error: "Formato inválido. Solo se permiten PNG y JPG." }
        }

        // Validate file size (2MB max)
        const maxSize = 2 * 1024 * 1024 // 2MB in bytes
        if (file.size > maxSize) {
            return { success: false, error: "El archivo es demasiado grande. Máximo 2MB." }
        }

        // Create Supabase client
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Delete old logo if it exists and is from Supabase Storage
        if (oldLogoUrl && oldLogoUrl.includes('supabase')) {
            await deleteClientLogo(oldLogoUrl)
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        const filePath = `client-logos/${fileName}`

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('client-logos')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            })

        if (uploadError) {
            console.error('Supabase upload error:', uploadError)
            return { success: false, error: `Error al subir archivo: ${uploadError.message}` }
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('client-logos')
            .getPublicUrl(filePath)

        return { success: true, url: publicUrl }

    } catch (e: any) {
        console.error('Upload client logo failed:', e)
        return { success: false, error: e.message || "Error al subir logo" }
    }
}

export async function validateExternalLogoUrl(url: string) {
    try {
        // Basic URL validation
        let parsedUrl: URL
        try {
            parsedUrl = new URL(url)
        } catch {
            return { success: false, error: "URL inválida", valid: false }
        }

        // Only allow http/https
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return { success: false, error: "Solo se permiten URLs HTTP/HTTPS", valid: false }
        }

        // Fetch headers to validate
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })

        if (!response.ok) {
            return { success: false, error: `URL no accesible (${response.status})`, valid: false }
        }

        // Check content type
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.startsWith('image/')) {
            return { success: false, error: "La URL no apunta a una imagen", valid: false }
        }

        // Check content length if available
        const contentLength = response.headers.get('content-length')
        if (contentLength) {
            const size = parseInt(contentLength)
            const maxSize = 2 * 1024 * 1024 // 2MB
            if (size > maxSize) {
                return { success: false, error: "La imagen es demasiado grande (máx 2MB)", valid: false }
            }
        }

        // URL is valid
        return { success: true, valid: true, url: url }

    } catch (e: any) {
        console.error('URL validation failed:', e)
        if (e.name === 'TimeoutError' || e.name === 'AbortError') {
            return { success: false, error: "Timeout: La URL no responde", valid: false }
        }
        return { success: false, error: "No se pudo validar la URL", valid: false }
    }
}

export async function deleteClientLogo(logoUrl: string) {
    try {
        // Check if URL is from Supabase Storage
        if (!logoUrl || !logoUrl.includes('supabase')) {
            return { success: true, message: "Not a Supabase Storage URL, skipping delete" }
        }

        // Extract file path from URL
        // URL format: https://{project}.supabase.co/storage/v1/object/public/client-logos/{filename}
        const urlParts = logoUrl.split('/client-logos/')
        if (urlParts.length < 2) {
            return { success: false, error: "Invalid Supabase Storage URL format" }
        }

        const fileName = urlParts[1]
        const filePath = `client-logos/${fileName}`

        // Create Supabase client
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Delete file
        const { error } = await supabase.storage
            .from('client-logos')
            .remove([filePath])

        if (error) {
            console.error('Failed to delete logo:', error)
            // Don't throw error, just log it (silent fail to not block updates)
            return { success: false, error: error.message }
        }

        return { success: true }

    } catch (e: any) {
        console.error('Delete client logo error:', e)
        // Silent fail - don't block client updates
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
    clientData?: { name: string, contact: string, email: string }, // NEW: For creating in Monday
    pdfBase64?: string // NEW: Snapshot
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
        // Quote Number is handled by DB Autoincrement

        const result = await prisma.quote.create({
            data: {
                clientName: data.clientName,
                projectType: data.projectType,
                serviceType: data.serviceType,
                technicalParameters: data.technicalParameters || JSON.stringify(data.params), // Use override or serialize params
                estimatedCost: data.estimatedCost !== undefined ? data.estimatedCost : data.breakdown.totalMonthlyCost, // Use override or breakdown
                staffingRequirements: JSON.stringify(data.breakdown.roles),
                diagramDefinition: data.breakdown.diagramCode,
                user: { connect: { id: userId } },
                status: 'NUEVA',
                client: data.clientId ? { connect: { id: data.clientId } } : undefined, // Link to DB Client
                pdfSnapshot: data.pdfBase64 || null, // Store Snapshot

            } as any
        })

        // Trigger Monday Sync (Fire and forget, but return status)
        // DISABLED to prevent duplicate webhooks. Consolidated into sendQuoteToN8N
        // const syncResult = await sendToMonday(result, data.params, data.breakdown, userName, userEmail)
        const syncResult = { synced: false, reason: "Consolidated into PDF upload" }

        return {
            success: true,
            quote: result,
            quoteNumber: result.quoteNumber, // Explicitly return ID for frontend update
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

export async function updateQuote(id: string, data: {
    clientName: string,
    projectType: string,
    serviceType: string,
    params: TechnicalParameters,
    breakdown: CostBreakdown,
    estimatedCost?: number,
    technicalParameters?: string,
    clientId?: string,
    isNewClient?: boolean,
    clientData?: { name: string, contact: string, email: string },
    pdfBase64?: string // NEW: Snapshot
}) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        return { success: false, error: "No user logged in" }
    }

    try {
        // Check ownership
        const existing = await prisma.quote.findUnique({ where: { id } })
        if (!existing || existing.userId !== userId) {
            return { success: false, error: "Unauthorized or Quote not found" }
        }

        // Fetch user details
        let userName = "Usuario Desconocido"
        let userEmail = "unknown@example.com"
        try {
            const user = await prisma.user.findUnique({ where: { id: userId } })
            if (user) {
                userName = user.name || user.email
                userEmail = user.email
            }
        } catch (e) { }

        const result = await prisma.quote.update({
            where: { id },
            data: {
                clientName: data.clientName,
                projectType: data.projectType,
                serviceType: data.serviceType,
                technicalParameters: data.technicalParameters || JSON.stringify(data.params),
                estimatedCost: data.estimatedCost !== undefined ? data.estimatedCost : data.breakdown.totalMonthlyCost,
                staffingRequirements: JSON.stringify(data.breakdown.roles),
                diagramDefinition: data.breakdown.diagramCode,
                // Update linked client only if explicitly changed? 
                // Mostly we just update the quote content.
                client: data.clientId ? { connect: { id: data.clientId } } : undefined,
                pdfSnapshot: data.pdfBase64 || undefined, // NEW: Snapshot
                // Preserve quoteNumber if passed in technicalParameters but Prisma handles it.
                // However, we want to make sure we don't accidentally try to "create" a new one if it's an update.
                // Prisma autoincrement doesn't change on update.
            } as any
        })

        // N8N sync is handled client-side via the PDF upload call usually, 
        // but we return the context just in case the client triggered save wants to trigger sync.

        return {
            success: true,
            quote: result,
            userEmail,
            userName,
            crmContext: {
                clientId: data.clientId,
                isNewClient: data.isNewClient,
                clientData: data.clientData
            }
        }
    } catch (e: any) {
        console.error("Update Quote Failed", e)
        return { success: false, error: e.message || "Update Failed" }
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
    try {
        let result;
        if (rate.id) {
            result = await prisma.serviceRate.update({
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
            result = await prisma.serviceRate.create({
                data: {
                    service: rate.service,
                    frequency: rate.frequency,
                    complexity: rate.complexity,
                    basePrice: rate.basePrice,
                    multiplier: rate.multiplier
                }
            })
        }
        revalidatePath('/quote/new')
        revalidatePath('/admin')
        return result
    } catch (e) {
        console.error("Failed to save rate", e)
        throw new Error("Failed to save rate")
    }
}

export async function deleteServiceRate(id: string) {
    try {
        await prisma.serviceRate.delete({ where: { id } })
        revalidatePath('/quote/new')
        revalidatePath('/admin')
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
        const nuevaCount = await prisma.quote.count({ where: { status: 'NUEVA' } })
        const enviadaCount = await prisma.quote.count({ where: { status: 'ENVIADA' } })
        const aprobadaCount = await prisma.quote.count({ where: { status: 'APROBADA' } })
        const rechazadaCount = await prisma.quote.count({ where: { status: 'RECHAZADA' } })

        console.log("Status Counts:", { nuevaCount, enviadaCount, aprobadaCount, rechazadaCount }) // DEBUG

        const statusCounts: Record<string, number> = {
            'NUEVA': nuevaCount,
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
    const role = cookieStore.get('session_role')?.value

    if (!userId) return { success: false, error: "Unauthorized" }

    try {
        const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
        if (!quote) return { success: false, error: "Quote not found" }

        if (quote.userId !== userId && role?.toLowerCase() !== 'admin') {
            return { success: false, error: "Forbidden: You do not own this quote" }
        }

        await prisma.quote.delete({ where: { id: quoteId } })
        revalidatePath('/dashboard')
        revalidatePath('/admin')
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

export async function updateClient(clientId: string, data: { companyName: string, contactName: string, email: string, clientLogoUrl?: string }) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        return { success: false, error: "Sesión expirada" }
    }

    try {
        // Fetch existing client to check if logo changed
        const existingClient = await prisma.client.findUnique({
            where: { id: clientId },
            select: { clientLogoUrl: true }
        })

        // If logo URL changed and old logo was from Supabase Storage, delete it
        if (existingClient &&
            existingClient.clientLogoUrl &&
            data.clientLogoUrl !== existingClient.clientLogoUrl &&
            existingClient.clientLogoUrl.includes('supabase')) {
            // Delete old logo (silent fail - don't block update)
            await deleteClientLogo(existingClient.clientLogoUrl)
        }

        const updatedClient = await prisma.client.update({
            where: { id: clientId }, // Ownership check removed for globalization
            data: {
                companyName: data.companyName,
                contactName: data.contactName,
                email: data.email,
                clientLogoUrl: data.clientLogoUrl
            }
        })
        return { success: true, client: updatedClient }
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { success: false, error: "Ya existe otra empresa con ese nombre." }
        }
        console.error("Update Client Failed", e)
        return { success: false, error: "Error al actualizar cliente" }
    }
}

export async function deleteClient(clientId: string) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        return { success: false, error: "Sesión expirada" }
    }

    try {
        await prisma.client.delete({
            where: { id: clientId, userId: userId } // Ensure ownership
        })
        return { success: true }
    } catch (e) {
        console.error("Delete Client Failed", e)
        return { success: false, error: "Error al eliminar cliente" }
    }
}

export async function getConsultants() {
    try {
        const consultants = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'CONSULTOR' },
                    { role: 'USER' }
                ]
            },
            orderBy: { name: 'asc' },
            select: { name: true, email: true }
        })
        console.log(`Fetched ${consultants.length} consultants (USER/CONSULTOR)`)
        return consultants
    } catch (e) {
        console.error("Failed to fetch consultants", e)
        return []
    }
}

export async function reviewQuote(quoteId: string, status: 'APROBADA' | 'RECHAZADA', comment: string) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    // Optional: Verify Role
    // const role = cookieStore.get('session_role')?.value
    // if (role !== 'ADMIN') return { success: false, error: "Unauthorized" }

    if (!userId) return { success: false, error: "Unauthorized" }

    try {
        const quote = await prisma.quote.update({
            where: { id: quoteId },
            data: {
                status: status,
                adminComment: comment
            } as any,
            include: { user: true }
        }) as any

        // Webhook Notification (Explicit Requirement)
        const webhookUrl = "https://n8n.myinfo.la/webhook/web-cotizaciones-notif"

        if (quote.user?.email) {
            console.log("Triggering Webhook for Quote:", quote.id)

            const formattedStatus = status === 'APROBADA' ? 'Aprobada' : 'Rechazada'

            // Parse params to try getting specific names (e.g. Sustain Solution Name)
            let realProjectName = quote.clientName
            try {
                const params = JSON.parse(quote.technicalParameters)
                if (quote.serviceType === 'Sustain' && params.sustainDetails?.solutionName) {
                    realProjectName = `${quote.clientName} - ${params.sustainDetails.solutionName}`
                }
            } catch (e) {
                // Keep clientName as fallback
            }

            fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quoteNumber: quote.id,
                    projectName: realProjectName, // Fixed: Uses Client Name or Solution Name
                    complexityLevel: quote.projectType, // Mapped current DB value ('medium') to proper field
                    serviceType: quote.serviceType,
                    emailConsultor: quote.user.email,
                    statusUpdate: formattedStatus,
                    adminComment: comment
                })
            })
                .then(res => {
                    if (res.ok) console.log("Webhook sent successfully for", quote.id)
                    else console.error("Webhook failed with status:", res.status)
                })
                .catch(err => console.error("Webhook connection error:", err))
        }

        revalidatePath('/admin')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (e: any) {
        console.error("Review Quote Failed", e)
        return { success: false, error: e.message }
    }
}

export async function getQuoteById(id: string) {
    const cookieStore = await cookies()
    const role = cookieStore.get('session_role')?.value
    // Case insensitive check
    if (role?.toLowerCase() !== 'admin') {
        throw new Error('Unauthorized')
    }

    const quote = await prisma.quote.findUnique({
        where: { id },
        include: {
            user: true, // Fetch Author
            client: true // Fetch Client details if linked
        }
    })
    return quote as any
}

