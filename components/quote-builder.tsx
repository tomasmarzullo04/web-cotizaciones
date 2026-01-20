'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { MermaidDiagram } from "@/components/mermaid-diagram"
import { Wand2, Download, FileText, Check, ShieldAlert, Network, Cpu, Calculator, Save, Loader2, ClipboardList, Database, Users, Briefcase, Layers, AlertTriangle, Activity, Zap, Edit, X, RefreshCw, ImageDown, Sparkles, Undo2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveQuote } from "@/lib/actions"
import { generateMermaidUpdate } from "@/lib/ai"
import { exportToPDF, exportToWord } from "@/lib/export"
import html2canvas from 'html2canvas'
import { motion, AnimatePresence } from "framer-motion"

// Hardcoded fallback rates in case DB fails or during transition
const FALLBACK_RATES = {
    data_analyst: 2500,
    data_science: 5100,
    bi_developer: 4128,
    data_engineer: 4950,
    power_apps: 4000,
    react_dev: 4500,
    power_automate: 4000
}

const SENIORITY_MODIFIERS = {
    'Jr': 0.7,
    'Ssr': 1.0,
    'Sr': 1.3,
    'Lead': 1.5
}

const HOURS_MODIFIERS = {
    'business': 1.0,
    '24/7': 1.5,
    'combined': 1.2
}

const COMPLEXITY_MODIFIERS = {
    'low': 1.0,
    'medium': 1.2,
    'high': 1.5
}

type RoleKey = keyof typeof FALLBACK_RATES;

interface QuoteState {
    // 1. General
    clientName: string
    description: string
    complexity: 'low' | 'medium' | 'high'
    updateFrequency: 'daily' | 'weekly' | 'monthly' | 'realtime'

    // 2. Team
    roles: Record<RoleKey, number>

    // 3. Volumetry
    pipelinesCount: number
    notebooksCount: number
    manualProcessPct: number
    automationsCount: number
    pipelineExecutions: number
    usersCount: number // Added alias for simpler logic access

    // 4. Consumption
    reportsCount: number
    reportUsers: number
    isFinancialOrSales: boolean

    // 5. Tech
    techStack: string[]

    // 6. Advanced
    dsModelsCount: number
    dashboardsCount: number

    // 7. Criticitness
    criticitness: {
        enabled: boolean
        level: 'low' | 'medium' | 'high'
        impactOperative: 'low' | 'medium' | 'high'
        impactFinancial: 'low' | 'medium' | 'high'
        dataExposure: 'internal' | 'partners' | 'public'
        countriesCount: number
    }

    // New Service Type
    serviceType: 'Proyecto' | 'Staffing' | 'Sustain'

    // Duration & Support
    durationMonths: number
    supportHours: 'business' | '24/7'

    // Wizard Data
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
        technicalDescription: string
        tools: string[]
        operationHours: string
    }

    // Commercial
    commercialDiscount: number
    retention: {
        enabled: boolean
        percentage: number
    }
    clientContact: {
        name: string
        role: string
        email: string
    }
}

const INITIAL_STATE: QuoteState = {
    clientName: '',
    description: '',
    complexity: 'medium',
    updateFrequency: 'daily',
    serviceType: 'Proyecto',
    roles: {
        data_engineer: 0,
        bi_developer: 0,
        data_science: 0,
        power_apps: 0,
        react_dev: 0,
        power_automate: 0,
        data_analyst: 0
    },
    pipelinesCount: 0,
    notebooksCount: 0,
    manualProcessPct: 20,
    automationsCount: 0,
    pipelineExecutions: 0,
    usersCount: 0,
    isFinancialOrSales: false,
    reportsCount: 0,
    reportUsers: 0,


    techStack: [],

    dsModelsCount: 0,
    dashboardsCount: 0,
    criticitness: {
        enabled: false,
        level: 'low',
        impactOperative: 'low',
        impactFinancial: 'low',
        dataExposure: 'internal',
        countriesCount: 1
    },
    durationMonths: 6,
    supportHours: 'business',

    staffingDetails: {
        profiles: []
    },
    sustainDetails: {
        technicalDescription: '',
        tools: [],
        operationHours: 'business'
    },
    commercialDiscount: 0,
    retention: { enabled: false, percentage: 0 },
    clientContact: { name: '', role: '', email: '' }
}

const TECH_OPTIONS = [
    { id: 'azure', name: 'Azure Data Factory' },
    { id: 'databricks', name: 'Azure Databricks' },
    { id: 'synapse', name: 'Azure Synapse' },
    { id: 'snowflake', name: 'Snowflake' },
    { id: 'fabric', name: 'Microsoft Fabric' },
    { id: 'powerbi', name: 'Power BI' },
    { id: 'sqlserver', name: 'SQL Server' },
    { id: 'logicapps', name: 'Azure Logic Apps' },
    { id: 'purview', name: 'Microsoft Purview' },
    { id: 'tableau', name: 'Tableau' },
    { id: 'python', name: 'Python/Airflow' },
]

// --- 2. COMPONENT ---

// Match Prisma Model roughly
type ServiceRate = {
    id: string
    service: string
    frequency: string
    complexity: string
    basePrice: number
    multiplier: number
}

export default function QuoteBuilder({ dbRates = [] }: { dbRates?: ServiceRate[] }) {
    const [state, setState] = useState<QuoteState>(INITIAL_STATE)
    const [chartCode, setChartCode] = useState('')
    const [manualDiagramCode, setManualDiagramCode] = useState<string | null>(null)
    const [isEditingDiagram, setIsEditingDiagram] = useState(false)
    const [tempDiagramCode, setTempDiagramCode] = useState('')
    const [aiPrompt, setAiPrompt] = useState('')
    const [isAiLoading, setIsAiLoading] = useState(false)
    const [diagramHistory, setDiagramHistory] = useState<string[]>([]) // For Undo
    const [polishLoading, setPolishLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [exportType, setExportType] = useState<'pdf' | 'word' | null>(null)
    const [wizardStep, setWizardStep] = useState(0) // 0: Selection, 1: Form
    const router = useRouter()

    const handleStepSelection = (type: 'Proyecto' | 'Staffing' | 'Sustain') => {
        updateState('serviceType', type)
        if (type === 'Sustain') {
            updateCriticitness('enabled', true)
        }
        setWizardStep(1)
    }

    const handleDownloadDiagram = async () => {
        try {
            const element = document.getElementById('diagram-capture-target')
            if (!element) return

            // Use html2canvas to capture the visual representation directly
            const canvas = await html2canvas(element, {
                backgroundColor: '#ffffff',
                scale: 3,
                logging: false,
                useCORS: true
            })

            const link = document.createElement('a')
            link.download = `arquitectura-${state.clientName || 'draft'}.png`
            link.href = canvas.toDataURL('image/png')
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

        } catch (e) {
            console.error("Download failed", e)
            alert("No se pudo descargar el diagrama.")
        }
    }

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return
        setIsAiLoading(true)
        // Push current to history before changing
        setDiagramHistory(prev => [...prev, tempDiagramCode])

        try {
            const newCode = await generateMermaidUpdate(tempDiagramCode, aiPrompt)
            setTempDiagramCode(newCode)
            setAiPrompt('')
        } catch (e) {
            console.error(e)
            alert("Error generando diagrama con IA")
        } finally {
            setIsAiLoading(false)
        }
    }

    const handleUndo = () => {
        if (diagramHistory.length === 0) return
        const previous = diagramHistory[diagramHistory.length - 1]
        setTempDiagramCode(previous)
        setDiagramHistory(prev => prev.slice(0, -1))
    }


    // --- Helpers ---
    const updateState = <K extends keyof QuoteState>(key: K, val: QuoteState[K]) => {
        setState(prev => ({ ...prev, [key]: val }))
    }

    const updateRole = (role: RoleKey, delta: number) => {
        setState(prev => {
            const current = prev.roles[role] || 0
            return {
                ...prev,
                roles: {
                    ...prev.roles,
                    [role]: Math.max(0, current + delta)
                }
            }
        })
    }

    const updateCriticitness = <K extends keyof QuoteState['criticitness']>(key: K, val: QuoteState['criticitness'][K]) => {
        setState(prev => ({
            ...prev,
            criticitness: { ...prev.criticitness, [key]: val }
        }))
    }

    const toggleTech = (id: string) => {
        setState(prev => {
            const exists = prev.techStack.includes(id)
            return {
                ...prev,
                techStack: exists
                    ? prev.techStack.filter(t => t !== id)
                    : [...prev.techStack, id]
            }
        })
    }

    // --- BUSINESS LOGIC ---
    const criticitnessScore = useMemo(() => {
        if (!state.criticitness.enabled) return 0
        let score = 0
        if (state.criticitness.impactOperative === 'high') score += 5
        else if (state.criticitness.impactOperative === 'medium') score += 3
        else score += 1
        if (state.criticitness.impactFinancial === 'high') score += 5
        else if (state.criticitness.impactFinancial === 'medium') score += 3
        else score += 1
        if (state.criticitness.countriesCount > 3) score += 5
        else if (state.criticitness.countriesCount > 1) score += 2
        else score += 1
        if (state.reportUsers > 100) score += 5
        else if (state.reportUsers > 10) score += 3
        else score += 1
        return score
    }, [state.criticitness, state.reportUsers])

    const criticitnessLevel = useMemo(() => {
        if (criticitnessScore >= 15) return { label: 'ALTA', margin: 0.20, color: 'text-red-400' }
        if (criticitnessScore >= 9) return { label: 'MEDIA', margin: 0.10, color: 'text-yellow-400' }
        return { label: 'BAJA', margin: 0.0, color: 'text-[#F5CB5C]' }
    }, [criticitnessScore])

    const handleAiPolish = async () => {
        if (!state.description) return
        setPolishLoading(true)
        // Simulate AI delay
        await new Promise(r => setTimeout(r, 1500))
        updateState('description',
            `PROYECTO: ${state.clientName || 'Empresa'}\n\nOBJETIVO ESTRATÉGICO:\n${state.description}\n\nARQUITECTURA PROPUESTA:\nImplementación de un ecosistema de datos moderno basado en ${state.techStack.join(', ') || 'Azure/AWS'}. Se diseñarán ${state.pipelinesCount} pipelines de ingesta resilientes y se desplegarán ${state.dashboardsCount + state.reportsCount} activos de visualización para soportar la toma de decisiones.\n\nALCANCE:\n- Ingesta: ${state.updateFrequency} (${state.manualProcessPct}% manual actual)\n- Consumo: ${state.reportUsers} usuarios finales\n- Seguridad: ${state.criticitness.enabled ? 'Alta Criticidad (Audit Logs + RLS)' : 'Estándar'}`)
        setPolishLoading(false)
    }

    // --- Dynamic Pricing Core ---
    const findDynamicRate = useCallback((serviceName: string, subParam: string = 'Standard') => {
        if (!dbRates || dbRates.length === 0) return null

        const normalizedService = serviceName.trim().toLowerCase()
        const normalizedParam = subParam.trim().toLowerCase()

        // Try exact match
        let match = dbRates.find(r =>
            r.service.toLowerCase() === normalizedService &&
            r.complexity.toLowerCase() === normalizedParam
        )

        // Fallback: Try match service with "Standard" or "Ssr" or "Media"
        if (!match) {
            match = dbRates.find(r =>
                r.service.toLowerCase() === normalizedService &&
                ['standard', 'media', 'ssr', 'baja'].includes(r.complexity.toLowerCase())
            )
        }

        // Return calculated rate
        if (match) return match.basePrice * match.multiplier

        // Fuzzy match for legacy keys (e.g. 'data_engineer' -> 'Data Engineer')
        if (!match) {
            match = dbRates.find(r => r.service.toLowerCase().replace(/ /g, '_').includes(normalizedService.replace(/ /g, '_')))
        }

        if (match) return match.basePrice * match.multiplier

        return null
    }, [dbRates])


    const { totalMonthlyCost, l2SupportCost, riskCost, totalWithRisk, servicesCost, rolesCost, discountAmount, finalTotal } = useMemo(() => {
        // --- 1. Calculate Roles Cost ---
        let baseRoles = 0

        // Helper: Get best available rate
        const getRate = (role: string, level: string = 'Ssr') => {
            // Mapping internal keys to DB Service Names
            const roleMap: Record<string, string> = {
                'data_engineer': 'Data Engineer',
                'data_analyst': 'Data Analyst',
                'data_science': 'Data Science',
                'bi_developer': 'BI Developer',
                'project_manager': 'Project Manager',
                'qa_automation': 'QA Automation',
                'arquitecto': 'Arquitecto de Datos',
                'power_apps': 'Power Apps', // Assuming exists or fallback
                'react_dev': 'Frontend Developer', // Assuming exists or fallback
                'power_automate': 'Power Automate'
            }

            const dbRoleName = roleMap[role.toLowerCase()] || role

            // 1. Try Dynamic
            const dyn = findDynamicRate(dbRoleName, level)
            if (dyn !== null) return dyn

            // 2. Try Fallback Hardcoded
            // Clean role name for fallback lookup
            const key = Object.keys(FALLBACK_RATES).find(k => role.toLowerCase().includes(k.replace('_', ' '))) as RoleKey | undefined
            const base = key ? FALLBACK_RATES[key] : 4000

            // Apply Manual Logic Multipliers if using Fallback
            let mod = 1.0
            if (level === 'Jr') mod = 0.7
            if (level === 'Sr') mod = 1.3
            if (level === 'Lead') mod = 1.5

            return base * mod
        }

        if (state.serviceType === 'Staffing') {
            // Staffing: Explicit Profile List
            state.staffingDetails.profiles.forEach(p => {
                const cost = getRate(p.role, p.seniority)
                baseRoles += cost * p.count
            })
        } else {
            // Project & Sustain (Role Counters)
            Object.entries(state.roles).forEach(([roleKey, count]) => {
                if (count > 0) {
                    // Assume Ssr/Standard for bulk counters unless we add granularity there
                    const cost = getRate(roleKey, 'Ssr')
                    baseRoles += cost * count
                }
            })
        }

        // Apply Service Type Specific Role Multipliers
        // Sustain: Operation Hours
        if (state.serviceType === 'Sustain') {
            const hoursMod = HOURS_MODIFIERS[state.sustainDetails.operationHours as keyof typeof HOURS_MODIFIERS] || 1.0
            baseRoles *= hoursMod
        }
        // Project: Complexity
        if (state.serviceType === 'Proyecto') {
            const complexityMod = COMPLEXITY_MODIFIERS[state.complexity] || 1.0
            baseRoles *= complexityMod
        }


        // --- 2. Calculate Services Cost ---
        let baseServices = 0
        if (state.serviceType !== 'Staffing') {
            // Use findDynamicRate for these abstract units too
            const pipeRate = findDynamicRate('Pipe') || findDynamicRate('Ingesta') || 2500
            const nbRate = findDynamicRate('Dataset') || findDynamicRate('Notebook') || 2000
            const dbRate = findDynamicRate('Dashboard') || 5000
            const dsRate = findDynamicRate('Algoritmo') || findDynamicRate('DS') || 8000

            if (state.pipelinesCount > 0) baseServices += state.pipelinesCount * pipeRate
            if (state.notebooksCount > 0) baseServices += state.notebooksCount * nbRate
            if (state.dashboardsCount > 0) baseServices += state.dashboardsCount * dbRate
            if (state.dsModelsCount > 0) baseServices += state.dsModelsCount * dsRate
        }

        // --- 3. Totals & Overhead ---
        const l2SupportCost = (baseRoles + baseServices) * 0.10
        const subTotal = baseRoles + baseServices + l2SupportCost

        // Risk (Criticality)
        const riskVal = state.criticitness.enabled ? subTotal * criticitnessLevel.margin : 0

        const preDiscountTotal = subTotal + riskVal

        // --- 4. Commercial Discount ---
        const discountVal = preDiscountTotal * (state.commercialDiscount / 100)
        const final = preDiscountTotal - discountVal

        return {
            rolesCost: baseRoles,
            servicesCost: baseServices,
            l2SupportCost,
            riskCost: riskVal,
            totalWithRisk: preDiscountTotal,
            discountAmount: discountVal,
            finalTotal: final,
            totalMonthlyCost: final
        }
    }, [state, dbRates, criticitnessLevel, findDynamicRate])

    const totalProjectCost = totalWithRisk * state.durationMonths
    const finalTotalProjectCost = finalTotal * state.durationMonths

    // --- Save Quote ---
    const handleSaveQuote = async () => {
        if (!state.clientName) {
            alert("Por favor ingrese un nombre de cliente.")
            return
        }
        setIsSaving(true)
        try {
            const breakdown = {
                roles: Object.entries(state.roles).map(([r, c]) => ({ role: r, count: c, cost: 0, hours: 0 })), // simplified
                totalMonthlyCost: totalMonthlyCost,
                diagramCode: chartCode
            }

            const result = await saveQuote({
                clientName: state.clientName,
                projectType: state.complexity,
                serviceType: state.serviceType,
                params: {
                    ...state,
                    dataVolume: 'TB', // mock
                    sourceSystemsCount: 2, // mock
                    aiFeatures: state.dsModelsCount > 0,
                    reportComplexity: 'medium',
                    usersCount: state.reportUsers,
                    securityCompliance: 'standard',
                    databricksUsage: state.techStack.includes('databricks') ? 'high' : 'none',
                    criticality: state.criticitness.enabled ? 'high' : 'low',
                    updateFrequency: state.updateFrequency === 'realtime' ? 'realtime' : 'daily'
                },
                breakdown: breakdown
            })

            if (!result.success || !result.quote) {
                alert(`Error del Servidor: ${result.error}`)
                return;
            }

            const savedQuote = result.quote

            // Client-Side Persistence Removed - Strictly rely on Server DB

            alert("Cotización guardada exitosamente.")
            router.push('/dashboard')
        } catch (e) {
            console.error(e)
            alert("Error al guardar cotización.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleExport = async (type: 'pdf' | 'word') => {
        setIsExporting(true)
        setExportType(type)
        try {
            let diagramDataUrl = undefined
            // Capture diagram if relevant
            if (state.serviceType !== 'Staffing') {
                const element = document.getElementById('diagram-capture-target')
                if (element) {
                    const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2, useCORS: true })
                    diagramDataUrl = canvas.toDataURL('image/png')
                }
            }

            if (type === 'pdf') {
                await exportToPDF({
                    ...state,
                    totalMonthlyCost,
                    l2SupportCost,
                    riskCost,
                    totalWithRisk,
                    criticitnessLevel,
                    diagramImage: diagramDataUrl,
                    serviceType: state.serviceType,
                    commercialDiscount: state.commercialDiscount,
                    discountAmount,
                    finalTotal
                })
            } else {
                await exportToWord({
                    ...state,
                    totalWithRisk: finalTotal, // Use final total for Word too
                    durationMonths: state.durationMonths,
                    diagramImage: diagramDataUrl
                })
            }
        } catch (e) {
            console.error(e)
            alert("Error al exportar cotización.")
        } finally {
            setIsExporting(false)
        }
    }

    useEffect(() => {
        const { techStack, dsModelsCount } = state
        let nodes = `
    Source[Fuentes]
    Pipe[Ingesta]
    Store[Lakehouse]
    Vis[Power BI]
    User((Usuario))
        `
        let flow = 'Source --> Pipe\nPipe --> Store\nStore --> Vis\nVis --> User\n'

        if (state.criticitness.enabled) {
            nodes += '\n    Gov[Gobierno/Seguridad]'
            flow += 'Gov -.-> Store\n'
        }

        if (techStack.includes('databricks') || dsModelsCount > 0) {
            nodes += '\n    Process[Databricks ML]'
            flow += 'Store --> Process\nProcess --> Store\n'
        }
        // Explode Tech Stack into Subgraph with Row Layout
        if (techStack.length > 0) {
            nodes += '\n    subgraph TechStack [Stack Tecnológico]'
            nodes += '\n    direction TB' // Main stack is top-bottom

            // Helper function to chunk array
            const chunkSize = 4
            for (let i = 0; i < techStack.length; i += chunkSize) {
                const chunk = techStack.slice(i, i + chunkSize)
                const rowId = `Row${i / chunkSize}`

                nodes += `\n    subgraph ${rowId} [ ]` // Boxless subgraph for rows? or explicit?
                nodes += `\n    direction LR` // Items in row flow Left-Right

                chunk.forEach(t => {
                    if (t === 'databricks') return
                    const option = TECH_OPTIONS.find(o => o.id === t)
                    const name = option ? option.name : t
                    const cleanId = `Tech${t.replace(/[^a-zA-Z0-9]/g, '')}`

                    nodes += `\n        ${cleanId}[${name}]`
                    nodes += `\n        style ${cleanId} stroke-dasharray: 5 5`
                })
                nodes += '\n    end'
            }

            // SINGLE LINK: Connect only the main TechStack subgraph to Store
            // This prevents the visual clutter of multiple lines
            if (techStack.some(t => t !== 'databricks')) {
                flow += `\n    TechStack -.- Store`
            }

            nodes += '\n    end'

            // Style the row subgraphs to be invisible containers
            for (let i = 0; i < techStack.length; i += chunkSize) {
                nodes += `\n    style Row${i / chunkSize} fill:none,stroke:none`
            }
        }
        const chart = `
graph TD
    %% Graphite Theme
    classDef default fill:#242423,stroke:#CFDBD5,stroke-width:2px,color:#E8EDDF;
    classDef highlight fill:#242423,stroke:#F5CB5C,stroke-width:2px,color:#F5CB5C;
    linkStyle default stroke:#CFDBD5,stroke-width:2px;
    
    ${nodes}
    ${flow}
    
    class Source,User default
    class Pipe,Store,Vis highlight
        `
        if (manualDiagramCode === null) {
            setChartCode(chart)
        }
    }, [state, manualDiagramCode])

    // --- RENDER WIZARD STEP 0 (SELECTION) ---
    if (wizardStep === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center min-h-screen bg-[#333533] p-4 md:p-6"
            >
                <div className="text-center mb-8 md:mb-16 space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black text-[#E8EDDF] tracking-tighter">
                        Nueva <span className="text-[#F5CB5C]">Estimación</span>
                    </h1>
                    <p className="text-[#CFDBD5] text-lg md:text-xl max-w-2xl mx-auto">
                        Seleccione el tipo de servicio para configurar la cotización adecuada.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl w-full">
                    {[
                        { id: 'Proyecto', icon: Network, title: 'Proyecto', desc: 'Estimación basada en entregables, arquitectura de datos y roadmap de implementación.' },
                        { id: 'Staffing', icon: Briefcase, title: 'Staffing', desc: 'Solicitud de perfiles IT especializados. Defina seniority, skills y duración.' },
                        { id: 'Sustain', icon: ShieldAlert, title: 'Sustain', desc: 'Servicios de soporte y mantenimiento. Configure niveles de servicio (SLA) y criticidad.' }
                    ].map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleStepSelection(item.id as any)}
                            className="bg-[#242423] p-10 rounded-[2.5rem] border border-[#333533] hover:border-[#F5CB5C] cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(245,203,92,0.15)] group hover:scale-[1.02] active:scale-95"
                        >
                            <div className="p-4 bg-[#333533] rounded-2xl w-fit mb-6 group-hover:bg-[#F5CB5C] transition-colors duration-300 shadow-sm">
                                <item.icon className="w-8 h-8 text-[#F5CB5C] group-hover:text-[#242423] transition-colors duration-300" />
                            </div>
                            <h2 className="text-3xl font-bold text-[#E8EDDF] mb-4">{item.title}</h2>
                            <p className="text-[#CFDBD5] leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col lg:flex-row h-screen overflow-hidden bg-[#333533] font-sans pt-24 md:pt-32"
        >

            {/* ================= LEFT COLUMN: FORM SCROLL ================= */}
            <div className="w-full lg:w-2/3 h-full overflow-y-auto scrollbar-custom p-4 md:p-8 lg:p-12">
                <div className="space-y-12 max-w-4xl mx-auto pb-32">

                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" className="text-[#CFDBD5] hover:text-[#E8EDDF]" onClick={() => setWizardStep(0)}>
                            <ArrowRight className="w-6 h-6 rotate-180" />
                        </Button>
                        <div>
                            <h1 className="text-3xl lg:text-5xl font-black text-[#E8EDDF] tracking-tighter mb-1">
                                {state.serviceType === 'Staffing' ? 'Levantamiento de Perfiles' :
                                    state.serviceType === 'Sustain' ? 'Levantamiento de Servicio' :
                                        'Arquitectura de Proyecto'}
                            </h1>
                            <p className="text-[#F5CB5C] font-bold text-lg uppercase tracking-widest">{state.serviceType}</p>
                        </div>
                    </div>

                    {/* 1. GENERAL */}
                    <SectionCard number="01" title="Información General" icon={ClipboardList}>
                        <div className="space-y-8">
                            <div>
                                <Label className="text-[#CFDBD5] text-sm font-bold uppercase tracking-wider mb-2 block">Cliente / Prospecto</Label>
                                <Input
                                    placeholder="Ej. Banco Global - Migración Cloud"
                                    value={state.clientName}
                                    onChange={e => updateState('clientName', e.target.value)}
                                    className="text-lg bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                />
                            </div>
                            <div className="relative">
                                <Label className="text-[#CFDBD5] text-sm font-bold uppercase tracking-wider mb-2 block">
                                    {state.serviceType === 'Staffing' ? 'Contexto de la Búsqueda' : 'Contexto del Proyecto'}
                                </Label>
                                <Textarea
                                    placeholder={
                                        state.serviceType === 'Staffing' ? "Descripción del equipo actual, cultura, y por qué se necesitan estos perfiles..." :
                                            state.serviceType === 'Sustain' ? "Descripción del ecosistema a soportar, dolores actuales en la operación..." :
                                                "Detalle los objetivos de negocio, dolores actuales y requerimientos técnicos..."
                                    }
                                    value={state.description}
                                    onChange={e => updateState('description', e.target.value)}
                                    className="min-h-[120px] resize-none text-base leading-relaxed bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleAiPolish}
                                    className="absolute bottom-4 right-4 text-[#F5CB5C] hover:text-[#242423] hover:bg-[#F5CB5C] border border-[#F5CB5C]/20 bg-[#242423]"
                                    disabled={!state.description || polishLoading}
                                >
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    {polishLoading ? 'Optimizando...' : 'Pulir con IA'}
                                </Button>
                            </div>

                            <div className="bg-[#242423] p-4 rounded-xl border border-[#4A4D4A]">
                                <h4 className="text-[#F5CB5C] font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Datos del Solicitante (CRM)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <Label className="text-[#CFDBD5] mb-2 block">Nombre Completo</Label>
                                        <Input
                                            value={state.clientContact.name}
                                            onChange={e => updateState('clientContact', { ...state.clientContact, name: e.target.value })}
                                            placeholder="Juan Pérez"
                                            className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[#CFDBD5] mb-2 block">Rol / Cargo</Label>
                                        <Input
                                            value={state.clientContact.role}
                                            onChange={e => updateState('clientContact', { ...state.clientContact, role: e.target.value })}
                                            placeholder="CTO / Gerente IT"
                                            className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[#CFDBD5] mb-2 block">Email Corporativo</Label>
                                        <Input
                                            value={state.clientContact.email}
                                            onChange={e => updateState('clientContact', { ...state.clientContact, email: e.target.value })}
                                            placeholder="juan@empresa.com"
                                            className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Type Specific Fields for Section 1 */}
                            {state.serviceType === 'Sustain' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <Label className="text-[#CFDBD5] mb-2 block">Horario de Operación</Label>
                                        <Select value={state.sustainDetails.operationHours} onValueChange={(v: any) => updateState('sustainDetails', { ...state.sustainDetails, operationHours: v })}>
                                            <SelectTrigger className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                <SelectItem value="business">Horario de Oficina (9-18)</SelectItem>
                                                <SelectItem value="extended">Extendido (8-20)</SelectItem>
                                                <SelectItem value="24/7">24/7 Crítico</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {state.serviceType === 'Proyecto' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <Label className="text-[#CFDBD5] mb-2 block">Tipo de Servicio</Label>
                                        <Select value={state.serviceType} onValueChange={(v: any) => updateState('serviceType', v)}>
                                            <SelectTrigger className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                <SelectItem value="Proyecto">Proyecto</SelectItem>
                                                <SelectItem value="Sustain">Sustain (Soporte)</SelectItem>
                                                <SelectItem value="Staffing">Staffing (Perfiles)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-[#CFDBD5] mb-2 block">Complejidad Técnica</Label>
                                        <Select value={state.complexity} onValueChange={(v: any) => updateState('complexity', v)}>
                                            <SelectTrigger className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                <SelectItem value="low">Baja (Estándar)</SelectItem>
                                                <SelectItem value="medium">Media (Integraciones)</SelectItem>
                                                <SelectItem value="high">Alta (Arquitectura Compleja)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-[#CFDBD5] mb-2 block">Frecuencia Actualización</Label>
                                        <Select value={state.updateFrequency} onValueChange={(v: any) => updateState('updateFrequency', v)}>
                                            <SelectTrigger className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                <SelectItem value="daily">Diaria (Batch)</SelectItem>
                                                <SelectItem value="weekly">Semanal</SelectItem>
                                                <SelectItem value="monthly">Mensual</SelectItem>
                                                <SelectItem value="realtime">Tiempo Real / Streaming</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                        </div>
                    </SectionCard>

                    {/* 2. VOLUMETRY - Hidden for Staffing */}
                    {state.serviceType !== 'Staffing' && (
                        <>
                            <SectionCard number="02" title="Volumetría y Técnica" icon={Database}>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                                    <CountInput label="Pipelines" value={state.pipelinesCount} onChange={(v: number) => updateState('pipelinesCount', v)} />
                                    <CountInput label="Notebooks" value={state.notebooksCount} onChange={(v: number) => updateState('notebooksCount', v)} />
                                    <CountInput label="Ejecuciones/Mes" value={state.pipelineExecutions} onChange={(v: number) => updateState('pipelineExecutions', v)} />
                                    <CountInput label="% Manual" value={state.manualProcessPct} onChange={(v: number) => updateState('manualProcessPct', v)} max={100} />
                                    <CountInput label="Dashboards" value={state.dashboardsCount} onChange={(v: number) => updateState('dashboardsCount', v)} />
                                    <CountInput label="Modelos ML" value={state.dsModelsCount} onChange={(v: number) => updateState('dsModelsCount', v)} />
                                </div>
                            </SectionCard>

                            {/* 3. CONSUMPTION */}
                            <SectionCard number="03" title="Consumo y Negocio" icon={Users}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
                                    <CountInput label="# Reportes Finales" value={state.reportsCount} onChange={(v: number) => updateState('reportsCount', v)} />
                                    <CountInput label="# Usuarios Finales" value={state.reportUsers} onChange={(v: number) => updateState('reportUsers', v)} />
                                    <div className="col-span-1 md:col-span-2 bg-[#333533] rounded-[1.5rem] p-8 flex items-center justify-between border border-[#4A4D4A]">
                                        <div>
                                            <h4 className="font-bold text-[#E8EDDF] text-lg">Uso Crítico</h4>
                                            <p className="text-sm text-[#CFDBD5]">¿Impacta Cierre Financiero o Ventas?</p>
                                        </div>
                                        <Switch checked={state.isFinancialOrSales} onCheckedChange={v => updateState('isFinancialOrSales', v)} className="data-[state=checked]:bg-[#F5CB5C]" />
                                    </div>
                                </div>
                            </SectionCard>
                        </>
                    )}

                    {/* 4. TEAM */}
                    <SectionCard number={state.serviceType === 'Staffing' ? "02" : "04"} title={state.serviceType !== 'Proyecto' ? "Perfiles y Talento" : "Equipo Requerido"} icon={Briefcase}>
                        {(state.serviceType === 'Staffing' || state.serviceType === 'Sustain') ? (
                            <div className="space-y-6">
                                {state.staffingDetails.profiles.map((profile, idx) => (
                                    <div key={idx} className="bg-[#333533] p-8 rounded-[1.5rem] border border-white/5 shadow-xl relative group transition-all hover:border-[#F5CB5C]/30 hover:shadow-2xl hover:shadow-black/50">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const newProfiles = [...state.staffingDetails.profiles]
                                                newProfiles.splice(idx, 1)
                                                updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles })
                                            }}
                                            className="absolute top-4 right-4 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-full h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 items-start">
                                            <div className="lg:col-span-3">
                                                <Label className="text-[#CFDBD5] mb-3 block text-xs font-bold uppercase tracking-wider">Rol / Perfil</Label>
                                                <Input
                                                    placeholder="Ej. Java Developer"
                                                    value={profile.role}
                                                    onChange={(e) => {
                                                        const newProfiles = [...state.staffingDetails.profiles]
                                                        newProfiles[idx].role = e.target.value
                                                        updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles })
                                                    }}
                                                    className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-12 rounded-xl focus:border-[#F5CB5C] focus:ring-1 focus:ring-[#F5CB5C] transition-all"
                                                />
                                            </div>
                                            <div className="lg:col-span-3">
                                                <Label className="text-[#CFDBD5] mb-3 block text-xs font-bold uppercase tracking-wider">Seniority</Label>
                                                <Select value={profile.seniority} onValueChange={(v) => {
                                                    const newProfiles = [...state.staffingDetails.profiles]
                                                    newProfiles[idx].seniority = v
                                                    updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles })
                                                }}>
                                                    <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-12 rounded-xl focus:ring-[#F5CB5C]"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                        <SelectItem value="Jr">Junior</SelectItem>
                                                        <SelectItem value="Ssr">Semi-Senior</SelectItem>
                                                        <SelectItem value="Sr">Senior</SelectItem>
                                                        <SelectItem value="Lead">Tech Lead / Architect</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="lg:col-span-4">
                                                <Label className="text-[#CFDBD5] mb-3 block text-xs font-bold uppercase tracking-wider text-center">Dedicación Mensual</Label>
                                                <div className="flex items-center gap-4">
                                                    <div className="relative flex-1">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={100}
                                                            value={profile.allocationPercentage ?? 100}
                                                            onChange={(e) => {
                                                                const newProfiles = [...state.staffingDetails.profiles]
                                                                newProfiles[idx].allocationPercentage = parseInt(e.target.value) || 0
                                                                updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles })
                                                            }}
                                                            className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-14 rounded-2xl text-center text-xl font-bold appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-[#F5CB5C] focus:ring-[2px] focus:ring-[#F5CB5C]/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#CFDBD5]/30 font-bold pointer-events-none">%</span>
                                                    </div>
                                                    <div className="h-14 bg-[#F5CB5C]/5 rounded-2xl border border-[#F5CB5C]/10 min-w-[100px] flex flex-col items-center justify-center backdrop-blur-sm">
                                                        <span className="text-[10px] text-[#F5CB5C]/70 uppercase font-black tracking-widest">Horas</span>
                                                        <span className="text-[#F5CB5C] font-mono font-bold text-lg">
                                                            {(160 * ((profile.allocationPercentage ?? 100) / 100)).toFixed(0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="lg:col-span-2">
                                                <Label className="text-[#CFDBD5] mb-3 block text-xs font-bold uppercase tracking-wider text-center">Cantidad</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={profile.count}
                                                        onChange={(e) => {
                                                            const newProfiles = [...state.staffingDetails.profiles]
                                                            newProfiles[idx].count = parseInt(e.target.value) || 1
                                                            updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles })
                                                        }}
                                                        className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-12 rounded-xl text-center font-bold focus:border-[#F5CB5C] focus:ring-1 focus:ring-[#F5CB5C] transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 lg:col-span-4">
                                                <Label className="text-[#CFDBD5] mb-2 block">Skills / Tecnologías</Label>
                                                <Input
                                                    placeholder="Ej. React, Node.js, AWS, Kubernetes"
                                                    value={profile.skills}
                                                    onChange={(e) => {
                                                        const newProfiles = [...state.staffingDetails.profiles]
                                                        newProfiles[idx].skills = e.target.value
                                                        updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles })
                                                    }}
                                                    className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Button
                                    onClick={() => {
                                        updateState('staffingDetails', {
                                            ...state.staffingDetails,
                                            profiles: [...state.staffingDetails.profiles, { id: Date.now().toString(), role: '', seniority: 'Ssr', skills: '', count: 1, startDate: '', endDate: '', allocationPercentage: 100 }]
                                        })
                                    }}
                                    className="w-full h-12 border-dashed border-2 border-[#4A4D4A] bg-transparent text-[#CFDBD5] hover:border-[#F5CB5C] hover:text-[#F5CB5C] hover:bg-[#F5CB5C]/10"
                                >
                                    + Agregar Perfil Solicitado
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {Object.entries(state.roles).map(([key, count]) => {
                                    const roleName = key.replace(/_/g, ' ')
                                    // Use dynamic lookup or fallback
                                    const dynamicRate = findDynamicRate(roleName)
                                    const rate = dynamicRate || FALLBACK_RATES[key as RoleKey] || 4500

                                    return (
                                        <div key={key} className="flex items-center justify-between p-6 rounded-[1.5rem] border border-[#4A4D4A] bg-[#333533] hover:bg-[#404240] transition-colors group">
                                            <div>
                                                <div className="font-bold capitalize text-[#E8EDDF] text-lg group-hover:text-[#F5CB5C] transition-colors">{key.replace('_', ' ')}</div>
                                                <div className="text-sm text-[#CFDBD5] font-mono">${rate}/mes</div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Button variant="outline" size="icon" className="h-10 w-10 border-[#4A4D4A] text-[#E8EDDF] hover:bg-[#F5CB5C] hover:text-[#242423] rounded-full" onClick={() => updateRole(key as RoleKey, -1)}>-</Button>
                                                <span className="w-8 text-center text-xl font-bold text-[#E8EDDF]">{count}</span>
                                                <Button variant="outline" size="icon" className="h-10 w-10 border-[#4A4D4A] text-[#E8EDDF] hover:bg-[#F5CB5C] hover:text-[#242423] rounded-full" onClick={() => updateRole(key as RoleKey, 1)}>+</Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </SectionCard>

                    {/* 5. TECH */}
                    <SectionCard number="05" title="Stack Tecnológico" icon={Layers}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {TECH_OPTIONS.map(tech => (
                                <div
                                    key={tech.id}
                                    onClick={() => toggleTech(tech.id)}
                                    className={cn(
                                        "p-6 rounded-[1.5rem] border transition-all flex flex-col justify-between h-32 hover:scale-[1.02] cursor-pointer",
                                        state.techStack.includes(tech.id)
                                            ? "bg-[#242423] border-[#F5CB5C] text-[#E8EDDF] shadow-[0_0_20px_rgba(245,203,92,0.15)]"
                                            : "bg-[#333533] text-[#CFDBD5] border-[#4A4D4A] hover:border-[#CFDBD5]"
                                    )}
                                >
                                    <span className="font-bold text-sm leading-tight">{tech.name}</span>
                                    {state.techStack.includes(tech.id) && <Check className="w-6 h-6 self-end text-[#F5CB5C]" />}
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    {/* 6. CRITICITNESS */}
                    {/* 6. CRITICITNESS (Upgraded v2) */}
                    <SectionCard number="06" title={state.serviceType === 'Sustain' ? "Niveles de Servicio (SLA)" : "Evaluación de Criticidad"} icon={ShieldAlert}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#333533] rounded-xl border border-[#4A4D4A]">
                                    <ShieldAlert className="w-6 h-6 text-[#F5CB5C]" />
                                </div>
                                <div>
                                    <p className="text-[#E8EDDF] font-bold">{state.serviceType === 'Sustain' ? 'Continuidad Operativa' : 'Análisis de Riesgo y SLA'}</p>
                                    <p className="text-sm text-[#CFDBD5]">{state.serviceType === 'Sustain' ? 'Garantías de Uptime y Respuesta' : 'Calculadora de márgenes operativos'}</p>
                                </div>
                            </div>
                            <Switch checked={state.criticitness.enabled} onCheckedChange={v => updateCriticitness('enabled', v)} className="data-[state=checked]:bg-[#F5CB5C]" />
                        </div>

                        {state.criticitness.enabled && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">

                                {/* Predictive Logic Alert */}
                                {(state.complexity === 'high' && (state.updateFrequency === 'weekly' || state.updateFrequency === 'realtime') && state.supportHours !== '24/7') && (
                                    <div className="bg-orange-900/20 border border-orange-500/30 rounded-2xl p-4 flex items-start gap-4">
                                        <AlertTriangle className="w-6 h-6 text-orange-400 shrink-0 mt-1" />
                                        <div>
                                            <h4 className="text-orange-300 font-bold text-sm">Nivel de Criticidad Elevado</h4>
                                            <p className="text-xs text-orange-200/70 mt-1">
                                                La combinación de complejidad <strong>Alta</strong> y frecuencia <strong>{state.updateFrequency}</strong> sugiere un esquema de soporte <strong>24/7</strong>.
                                            </p>
                                            <Button
                                                variant="link"
                                                className="text-orange-400 p-0 h-auto text-xs mt-2 underline"
                                                onClick={() => updateState('supportHours', '24/7')}
                                            >
                                                Actualizar a Soporte 24/7
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Main Risk Score Card */}
                                <div className="col-span-1 md:col-span-2 bg-[#333533] rounded-[1.5rem] p-8 border border-[#4A4D4A] flex flex-col md:flex-row justify-between items-center relative overflow-hidden gap-6">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5CB5C]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                                    <div className="relative z-10 flex flex-col gap-2">
                                        <span className="text-xs font-bold text-[#CFDBD5] uppercase tracking-widest flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-[#F5CB5C]" /> Score de Riesgo
                                        </span>
                                        <div className="text-5xl font-black text-[#E8EDDF] flex items-baseline gap-2">
                                            {criticitnessScore}
                                            <span className="text-lg text-[#7C7F7C] font-normal">/100</span>
                                        </div>
                                        <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border w-fit text-sm font-bold", criticitnessLevel.color)}>
                                            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                                            {criticitnessLevel.label}
                                        </div>
                                    </div>

                                    {/* Micro Indicators */}
                                    <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
                                        <div className="bg-[#242423] p-3 rounded-xl border border-[#4A4D4A] text-center">
                                            <Database className={cn("w-5 h-5 mx-auto mb-2", state.updateFrequency === 'realtime' ? "text-red-400" : "text-[#CFDBD5]")} />
                                            <span className="text-[10px] text-[#7C7F7C] uppercase font-bold block">Latencia</span>
                                            <span className="text-xs text-[#E8EDDF] font-bold">{state.updateFrequency === 'realtime' ? 'Crítica' : 'Std'}</span>
                                        </div>
                                        <div className="bg-[#242423] p-3 rounded-xl border border-[#4A4D4A] text-center">
                                            <Layers className={cn("w-5 h-5 mx-auto mb-2", state.complexity === 'high' ? "text-orange-400" : "text-[#CFDBD5]")} />
                                            <span className="text-[10px] text-[#7C7F7C] uppercase font-bold block">Lógica</span>
                                            <span className="text-xs text-[#E8EDDF] font-bold">{state.complexity === 'high' ? 'Compleja' : 'Std'}</span>
                                        </div>
                                        <div className="bg-[#242423] p-3 rounded-xl border border-[#4A4D4A] text-center">
                                            <Users className="w-5 h-5 mx-auto mb-2 text-[#CFDBD5]" />
                                            <span className="text-[10px] text-[#7C7F7C] uppercase font-bold block">Usuarios</span>
                                            <span className="text-xs text-[#E8EDDF] font-bold">{state.usersCount > 50 ? 'Alto Vol.' : 'Bajo Vol.'}</span>
                                        </div>
                                    </div>

                                    <div className="text-right relative z-10 w-full md:w-auto border-t md:border-t-0 border-[#4A4D4A] pt-4 md:pt-0">
                                        <Label className="text-[#7C7F7C] text-xs uppercase font-bold mb-2 block text-left">Nivel de Soporte</Label>
                                        <Select value={state.supportHours} onValueChange={(v: any) => updateState('supportHours', v)}>
                                            <SelectTrigger className="w-full md:w-[180px] h-10 bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                <SelectItem value="business">Business (9-18h)</SelectItem>
                                                <SelectItem value="24/7">24/7 Critical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label className="text-[#CFDBD5] mb-2 block">Impacto Operativo</Label>
                                        <Select value={state.criticitness.impactOperative} onValueChange={(v: any) => updateCriticitness('impactOperative', v)}>
                                            <SelectTrigger className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] h-12 rounded-xl"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                <SelectItem value="low">Bajo (Interno)</SelectItem>
                                                <SelectItem value="medium">Medio (Departamental)</SelectItem>
                                                <SelectItem value="high">Alto (Core Business)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-[#CFDBD5] mb-2 block">Exposición de Datos</Label>
                                        <Select value={state.criticitness.dataExposure} onValueChange={(v: any) => updateCriticitness('dataExposure', v)}>
                                            <SelectTrigger className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] h-12 rounded-xl"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                <SelectItem value="internal">Interna</SelectItem>
                                                <SelectItem value="partners">Partners / Clientes</SelectItem>
                                                <SelectItem value="public">Pública / Regulatoria</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>


                                <div>
                                    <Label className="text-[#CFDBD5] mb-2 block">Impacto Financiero</Label>
                                    <Select value={state.criticitness.impactFinancial} onValueChange={(v: any) => updateCriticitness('impactFinancial', v)}>
                                        <SelectTrigger className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                            <SelectItem value="low">Bajo ({'<'} 10k USD)</SelectItem>
                                            <SelectItem value="medium">Medio (10k - 100k USD)</SelectItem>
                                            <SelectItem value="high">Alto ({'>'} 100k USD)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <CountInput label="Países Involucrados" value={state.criticitness.countriesCount} onChange={(v: number) => updateCriticitness('countriesCount', v)} min={1} />
                                </div>
                            </div>
                        )}
                    </SectionCard>

                </div>
            </div >

            {/* ================= RIGHT COLUMN: INDEPENDENT SCROLL SUMMARY ================= */}
            <div className="w-full lg:w-1/3 h-full overflow-y-auto scrollbar-custom bg-[#242423] border-l border-[#CFDBD5]/10 p-8 lg:p-10 space-y-10 relative">

                {/* Cost Summary */}
                <div className="space-y-6">
                    <div>
                        <h4 className="text-[#F5CB5C] text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Calculator className="w-4 h-4" /> Inversión Estimada
                        </h4>
                        <div className="text-6xl font-mono font-bold tracking-tighter text-[#E8EDDF] drop-shadow-[0_0_15px_rgba(245,203,92,0.1)]">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(finalTotalProjectCost)}
                        </div>
                        <p className="text-[#CFDBD5] mt-2 font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#F5CB5C] animate-pulse" />
                            Total proyecto ({state.durationMonths} meses)
                        </p>
                    </div>

                    <div className="bg-[#333533] rounded-[2rem] p-8 text-sm space-y-5 border border-[#4A4D4A] shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-center text-[#E8EDDF]">
                            <span className="text-[#CFDBD5]">Servicios (Infra/Data)</span>
                            <span className="font-mono text-xl">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(servicesCost)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[#E8EDDF]">
                            <span className="text-[#CFDBD5]">Equipo (Roles)</span>
                            <span className="font-mono text-xl">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(rolesCost)}</span>
                        </div>
                        {l2SupportCost > 0 && (
                            <div className="flex justify-between items-center text-[#F5CB5C] bg-[#F5CB5C]/10 p-3 rounded-xl -mx-2 border border-[#F5CB5C]/20">
                                <span className="text-xs font-bold">SOPORTE L2 (10%)</span>
                                <span className="font-mono text-xl">+ {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(l2SupportCost)}</span>
                            </div>
                        )}
                        {state.criticitness.enabled && (
                            <div className="flex justify-between items-center text-orange-400 bg-orange-900/10 p-3 rounded-xl -mx-2 border border-orange-500/20">
                                <span className="text-xs font-bold">RIESGO ({criticitnessLevel.label})</span>
                                <span className="font-mono text-xl">+ {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(riskCost)}</span>
                            </div>
                        )}
                        <Separator className="bg-[#4A4D4A]" />

                        {/* Commercial Discount Input */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-[#CFDBD5] font-bold">Descuento</span>
                                <span className="text-[10px] text-[#CFDBD5]/50 uppercase tracking-wider">Comercial (%)</span>
                            </div>
                            <div className="flex items-center gap-2 w-[120px]">
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={state.commercialDiscount}
                                    onChange={(e) => updateState('commercialDiscount', parseFloat(e.target.value) || 0)}
                                    className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] text-right font-mono"
                                />
                                <span className="text-[#CFDBD5] font-bold">%</span>
                            </div>
                        </div>

                        {/* Retention Input */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-[#CFDBD5] font-bold">Retenciones</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <Switch
                                        checked={state.retention.enabled}
                                        onCheckedChange={(v) => updateState('retention', { ...state.retention, enabled: v })}
                                        className="h-4 w-7 data-[state=checked]:bg-[#F5CB5C]"
                                    />
                                    <span className="text-[10px] text-[#CFDBD5]/50 uppercase tracking-wider">{state.retention.enabled ? 'Activado' : 'No'}</span>
                                </div>
                            </div>
                            {state.retention.enabled && (
                                <div className="flex items-center gap-2 w-[120px]">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={state.retention.percentage}
                                        onChange={(e) => updateState('retention', { ...state.retention, percentage: parseFloat(e.target.value) || 0 })}
                                        className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] text-right font-mono"
                                    />
                                    <span className="text-[#CFDBD5] font-bold">%</span>
                                </div>
                            )}
                        </div>

                        {state.commercialDiscount > 0 && (
                            <div className="flex justify-between items-center text-green-400">
                                <span>Ahorro Aplicado</span>
                                <span className="font-mono">- {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(discountAmount)}</span>
                            </div>
                        )}

                        <Separator className="bg-[#4A4D4A]" />
                        <div className="flex justify-between items-center text-[#E8EDDF] font-black text-2xl">
                            <span>Mensual</span>
                            <span className="text-[#F5CB5C]">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(finalTotal)}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Button
                            onClick={handleSaveQuote}
                            disabled={isSaving}
                            className="bg-[#F5CB5C] hover:bg-[#E0B84C] text-[#242423] border-0 rounded-2xl h-14 font-bold w-full transition-all text-base shadow-[0_0_20px_rgba(245,203,92,0.3)] hover:shadow-[0_0_25px_rgba(245,203,92,0.5)] transform hover:scale-[1.02]"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                            {isSaving ? 'Guardando...' : 'Guardar Cotización'}
                        </Button>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                onClick={() => handleExport('pdf')}
                                disabled={isExporting}
                                className="bg-[#333533] hover:bg-[#E8EDDF] hover:text-[#242423] text-[#E8EDDF] border border-transparent rounded-2xl h-12 font-bold transition-all text-sm"
                            >
                                {isExporting && exportType === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                PDF
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleExport('word')}
                                disabled={isExporting}
                                className="bg-transparent border-[#4A4D4A] text-[#E8EDDF] hover:bg-[#333533] hover:text-[#E8EDDF] rounded-2xl h-12 font-medium transition-all text-sm"
                            >
                                {isExporting && exportType === 'word' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                                Word
                            </Button>
                        </div>
                    </div>
                </div >

                {/* Architecture Diagram */}
                {state.serviceType !== 'Staffing' && (
                    <div className="space-y-6 pt-10 border-t border-[#CFDBD5]/10">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[#CFDBD5] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <Network className="w-4 h-4 text-[#F5CB5C]" /> Arquitectura Dinámica
                            </h4>
                            <div className="flex gap-4">
                                {!isEditingDiagram ? (
                                    <>
                                        {manualDiagramCode && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    if (confirm("¿Restaurar diagrama automático? Se perderán los cambios manuales.")) {
                                                        setManualDiagramCode(null)
                                                    }
                                                }}
                                                className="h-7 px-2 text-[#CFDBD5] hover:text-[#F5CB5C] text-[10px]"
                                                title="Restaurar Automático"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setTempDiagramCode(chartCode)
                                                setIsEditingDiagram(true)
                                            }}
                                            className="h-7 px-3 text-[#F5CB5C] hover:text-[#E8EDDF] hover:bg-[#F5CB5C]/10 text-[10px] uppercase font-bold tracking-wider"
                                        >
                                            <Edit className="w-3 h-3 mr-2" /> Editar
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleDownloadDiagram}
                                            className="h-7 px-3 text-[#CFDBD5] hover:text-[#F5CB5C] hover:bg-transparent text-[10px] uppercase font-bold tracking-wider transition-colors"
                                        >
                                            <ImageDown className="w-3 h-3 mr-2" />
                                            Descargar Diagrama
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsEditingDiagram(false)}
                                            className="h-7 px-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 text-[10px] uppercase font-bold tracking-wider"
                                        >
                                            <X className="w-3 h-3 mr-2" /> Cancelar
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setManualDiagramCode(tempDiagramCode)
                                                setChartCode(tempDiagramCode)
                                                setIsEditingDiagram(false)
                                            }}
                                            className="h-7 px-3 bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C] text-[10px] uppercase font-bold tracking-wider"
                                        >
                                            <Check className="w-3 h-3 mr-2" /> Aplicar
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {isEditingDiagram ? (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
                                {/* AI Input Section */}
                                <div className="col-span-1 xl:col-span-2 bg-[#2D2D2D] p-3 rounded-xl border border-[#F5CB5C]/20 flex gap-2 items-center mb-2">
                                    <div className="p-2 bg-[#F5CB5C]/10 rounded-lg">
                                        <Sparkles className="w-5 h-5 text-[#F5CB5C]" />
                                    </div>
                                    <Input
                                        placeholder="Describe cambios con IA (ej: 'Agrega validación entre origen e ingesta')"
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        className="bg-transparent border-none text-[#E8EDDF] placeholder:text-[#CFDBD5]/50 focus-visible:ring-0"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleAiGenerate}
                                        disabled={isAiLoading || !aiPrompt.trim()}
                                        className="bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C] font-bold"
                                    >
                                        {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-[#CFDBD5] uppercase tracking-wider">Código Mermaid</label>
                                        {diagramHistory.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleUndo}
                                                className="h-6 text-xs text-[#CFDBD5] hover:text-[#E8EDDF]"
                                            >
                                                <Undo2 className="w-3 h-3 mr-1" /> Deshacer
                                            </Button>
                                        )}
                                    </div>
                                    <Textarea
                                        value={tempDiagramCode}
                                        onChange={(e) => setTempDiagramCode(e.target.value)}
                                        className="font-mono text-xs bg-[#171717] border border-[#CFDBD5]/20 text-[#E8EDDF] resize-none h-[600px] focus-visible:ring-[#F5CB5C] rounded-[1rem] p-4 w-full"
                                        placeholder="graph TD..."
                                    />
                                    <p className="text-[10px] text-[#CFDBD5]/50 flex items-center gap-1">
                                        <ShieldAlert className="w-3 h-3" />
                                        La edición manual desactiva las actualizaciones automáticas.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#CFDBD5] uppercase">Vista Previa</label>
                                    <div className="rounded-[1rem] border border-[#CFDBD5]/20 bg-[#333533] p-4 h-[600px] flex items-center justify-center relative overflow-hidden bg-white">
                                        <MermaidDiagram chart={tempDiagramCode} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div id="diagram-capture-target" className="rounded-[2rem] border border-[#CFDBD5]/20 bg-[#333533] p-4 min-h-[250px] flex items-center justify-center relative overflow-hidden bg-white group">
                                <MermaidDiagram chart={chartCode} />
                                {manualDiagramCode && (
                                    <div className="absolute top-4 left-4 bg-[#F5CB5C] text-[#242423] text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                        Editado Manualmente
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Tech Summary */}
                < div className="space-y-6 pt-10 border-t border-[#CFDBD5]/10" >
                    <h4 className="text-[#CFDBD5] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-[#F5CB5C]" /> Resumen Técnico
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#333533] p-5 rounded-2xl border border-[#4A4D4A] text-center">
                            <span className="block text-3xl font-black text-[#E8EDDF]">{state.pipelinesCount}</span>
                            <span className="text-xs text-[#CFDBD5] uppercase tracking-wider font-bold">Pipelines</span>
                        </div>
                        <div className="bg-[#333533] p-5 rounded-2xl border border-[#4A4D4A] text-center">
                            <span className="block text-3xl font-black text-[#E8EDDF]">{state.dashboardsCount + state.reportsCount}</span>
                            <span className="text-xs text-[#CFDBD5] uppercase tracking-wider font-bold">Visualizaciones</span>
                        </div>
                    </div>
                </div >

            </div >
        </motion.div>
    )
}

interface SectionCardProps {
    title: string
    number: string
    icon: React.ElementType
    children: React.ReactNode
}

function SectionCard({ title, number, icon: Icon, children }: SectionCardProps) {
    return (
        <div className="bg-[#242423] rounded-[2rem] p-10 lg:p-12 border border-[#333533] shadow-sm relative overflow-hidden group hover:border-[#F5CB5C]/30 transition-colors">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon className="w-32 h-32 text-[#F5CB5C]" />
            </div>
            <div className="flex items-center gap-6 mb-10 border-b border-[#333533] pb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-[#333533] text-[#F5CB5C] flex items-center justify-center font-bold text-xl border border-[#4A4D4A] shadow-[0_0_15px_rgba(245,203,92,0.1)]">{number}</div>
                <h2 className="text-3xl font-bold tracking-tight text-[#E8EDDF] flex items-center gap-4">
                    {title}
                    <Icon className="w-8 h-8 text-[#CFDBD5]/50" />
                </h2>
            </div>
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}

interface CountInputProps {
    label: string
    value: number
    onChange: (val: number) => void
    max?: number
    min?: number
}

function CountInput({ label, value, onChange, max, min = 0 }: CountInputProps) {
    return (
        <div className="space-y-4">
            <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider text-center block">{label}</Label>
            <div className="relative">
                <Input
                    type="number"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                    className="text-center font-mono text-2xl h-16 bg-[#333533] text-[#E8EDDF] border-[#4A4D4A]"
                />
            </div>
        </div>
    )
}
