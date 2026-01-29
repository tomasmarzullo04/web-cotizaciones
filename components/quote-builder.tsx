'use client'
// Synced for Vercel (Fix Drive Race Condition)

import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { MermaidDiagram } from "@/components/mermaid-diagram"
import { Wand2, Download, FileText, Check, ShieldAlert, Network, Cpu, Calculator, Save, Loader2, ClipboardList, Database, Users, Briefcase, Layers, AlertTriangle, Activity, Zap, Edit, X, RefreshCw, ImageDown, Sparkles, Undo2, ArrowRight, Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveQuote } from "@/lib/actions"
import { generateMermaidUpdate } from "@/lib/ai"
import { exportToPDF, exportToWord, generatePDFBlob } from "@/lib/export"
import html2canvas from 'html2canvas'
import { motion, AnimatePresence } from "framer-motion"
import { sendQuoteToN8N } from "@/lib/actions"
import { ClientSelector, ClientData } from "@/components/client-selector"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

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
    '9x5': 1.0,
    '24/7': 1.5,
    '24x7': 1.5,
    'combined': 1.2,
    'custom': 1.2
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
    clientId?: string // NEW: Linked Client ID
    isNewClient?: boolean // NEW: Flag
    newClientData?: ClientData // NEW: For Context
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
    durationValue: number
    durationUnit: 'days' | 'weeks' | 'months'
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
    // Sustain Specific Data (New)
    sustainDetails: {
        // Section 1: Technical Profile
        solutionName: string
        technicalDescription: string
        techStack: string[] // Specific for Sustain
        metrics: {
            pipelinesCount: number
            notebooksCount: number
            reportsCount: number
            dsModelsCount: number
            automationLevel: number
            updateFrequency: string
        }

        // Section 2: Operational Definition
        businessOwner: string
        devHours: number
        incidentRate: number
        supportWindow: string
        criticalHours: string
        criticalDays: string

        // Section 3: Criticality Matrix (Values 1, 3, 5)
        criticalityMatrix: {
            impactOperative: number
            impactFinancial: number
            userCoverage: number
            countryCoverage: number
            technicalMaturity: number
            dependencies: number
        }
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
        areaLeader: string
    }
}

const INITIAL_STATE: QuoteState = {
    clientName: '',
    clientId: undefined,
    isNewClient: false,
    newClientData: undefined,
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
    durationValue: 6,
    durationUnit: 'months',
    supportHours: 'business',

    staffingDetails: {
        profiles: []
    },
    sustainDetails: {
        solutionName: '',
        technicalDescription: '',
        techStack: [],
        metrics: {
            pipelinesCount: 0,
            notebooksCount: 0,
            reportsCount: 0,
            dsModelsCount: 0,
            automationLevel: 0,
            updateFrequency: 'daily'
        },
        businessOwner: '',
        devHours: 0,
        incidentRate: 0,
        supportWindow: '9x5',
        criticalHours: '',
        criticalDays: '',
        criticalityMatrix: {
            impactOperative: 1,
            impactFinancial: 1,
            userCoverage: 1,
            countryCoverage: 1,
            technicalMaturity: 1,
            dependencies: 1
        }
    },
    commercialDiscount: 0,
    retention: { enabled: false, percentage: 0 },
    clientContact: { name: '', role: '', email: '', areaLeader: '' }
}

const TECH_OPTIONS = [
    { id: 'azure', name: 'Azure Data Factory' },
    { id: 'databricks', name: 'Azure Databricks' },
    { id: 'synapse', name: 'Azure Synapse' },
    { id: 'snowflake', name: 'Snowflake' },
    { id: 'powerbi', name: 'Power BI' },
    { id: 'sqlserver', name: 'SQL Server' },
    { id: 'logicapps', name: 'Azure Logic Apps' },
    { id: 'tableau', name: 'Tableau' },
    { id: 'python', name: 'Python/Airflow' },
    { id: 'n8n', name: 'n8n' },
    { id: 'antigravity', name: 'Google Antigravity' },
    { id: 'lovable', name: 'Lovable' },
    { id: 'powerapps', name: 'Power Apps' },
]

const SUSTAIN_TECH_OPTIONS = [
    { id: 'azure_df', name: 'Azure Data Factory' },
    { id: 'databricks', name: 'Databricks' },
    { id: 'powerbi', name: 'Power BI' },
    { id: 'dotnet', name: '.NET' },
    { id: 'react', name: 'React' },
    { id: 'python', name: 'Python' },
    { id: 'sql', name: 'SQL' },
    { id: 'streamlit', name: 'Streamlit' },
    { id: 'datascience', name: 'Data Science / ML' },
    { id: 'snowflake', name: 'Snowflake' },
    { id: 'other', name: 'Otros' }
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
    const [isNetTotalFlashing, setIsNetTotalFlashing] = useState(false)
    const [diagramHistory, setDiagramHistory] = useState<string[]>([]) // For Undo
    const [polishLoading, setPolishLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [exportType, setExportType] = useState<'pdf' | 'word' | null>(null)
    const [wizardStep, setWizardStep] = useState(0) // 0: Selection, 1: Form
    const router = useRouter()

    // --- Currency State (Global API) ---
    // --- Currency State (Global API) ---
    const FALLBACK_EXCHANGE_RATES: Record<string, number> = {
        'USD': 1.0,
        'EUR': 0.92,
        'ARS': 1200.0,
        'MXN': 17.50,
        'COP': 3900.0,
        'CLP': 980.0
    }
    const [currency, setCurrency] = useState('USD')
    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(FALLBACK_EXCHANGE_RATES)

    // Fetch Real-Time Rates
    useEffect(() => {
        const fetchRates = async () => {
            try {
                const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
                if (res.ok) {
                    const data = await res.json()
                    setExchangeRates(prev => ({ ...prev, ...data.rates }))
                }
            } catch (e) {
                console.warn("Failed to fetch exchange rates, using fallback:", e)
            }
        }
        fetchRates()
    }, [])

    const convert = useCallback((amount: number) => {
        const rate = exchangeRates[currency] || 1.0
        return Number((amount * rate).toFixed(2))
    }, [currency, exchangeRates])

    const formatMoney = useCallback((amount: number) => {
        const rate = exchangeRates[currency] || 1.0
        const converted = amount * rate
        // Standard Format: {CODE} {Value} -> e.g. "USD 6,600.00" or "MXN 116,226.00"
        return `${currency} ${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }, [currency, exchangeRates])

    // --- State Reset on Mount ---
    useEffect(() => {
        // Reset to default state on mount to ensure clean sheet
        setState(JSON.parse(JSON.stringify(INITIAL_STATE)))
        setChartCode('')
        setWizardStep(0)
    }, [])

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

    const getDurationInMonths = useCallback(() => {
        const { durationValue, durationUnit } = state
        if (durationUnit === 'weeks') return durationValue / 4.33
        if (durationUnit === 'days') return durationValue / 30
        return durationValue
    }, [state.durationValue, state.durationUnit])

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

    // --- SUSTAIN LOGIC ---
    const sustainScore = useMemo(() => {
        if (state.serviceType !== 'Sustain') return 0
        const { impactOperative, impactFinancial, userCoverage, countryCoverage, technicalMaturity, dependencies } = state.sustainDetails.criticalityMatrix
        return impactOperative + impactFinancial + userCoverage + countryCoverage + technicalMaturity + dependencies
    }, [state.sustainDetails.criticalityMatrix, state.serviceType])

    const sustainLevel = useMemo(() => {
        if (sustainScore >= 15) return { label: 'ALTA', color: 'bg-red-500/10 text-red-400 border-red-500/20' }
        if (sustainScore >= 9) return { label: 'MEDIA', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' }
        return { label: 'BAJA', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
    }, [sustainScore])

    const handleAiPolish = async () => {
        if (!state.description) return
        setPolishLoading(true)
        // Simulate AI delay
        await new Promise(r => setTimeout(r, 1500))
        updateState('description',
            `PROYECTO: ${state.clientName || 'Empresa'}\n\nOBJETIVO ESTRATÉGICO:\n${state.description}\n\nARQUITECTURA PROPUESTA:\nImplementaciÃ³n de un ecosistema de datos moderno basado en ${state.techStack.join(', ') || 'Azure/AWS'}. Se diseñarán ${state.pipelinesCount} pipelines de ingesta resilientes y se desplegarán ${state.dashboardsCount + state.reportsCount} activos de visualización para soportar la toma de decisiones.\n\nALCANCE:\n- Ingesta: ${state.updateFrequency} (${state.manualProcessPct}% manual actual)\n- Consumo: ${state.reportUsers} usuarios finales\n- Seguridad: ${state.criticitness.enabled ? 'Alta Criticidad (Audit Logs + RLS)' : 'Estándar'}`)
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

        if (state.serviceType === 'Staffing' || state.serviceType === 'Sustain') {
            // Staffing & Sustain: Explicit Profile List
            state.staffingDetails.profiles.forEach(p => {
                const cost = getRate(p.role, p.seniority)
                const allocation = (p.allocationPercentage ?? 100) / 100
                baseRoles += cost * p.count * allocation
            })
        } else {
            // Project (Role Counters)
            Object.entries(state.roles).forEach(([roleKey, count]) => {
                if (count > 0) {
                    // Assume Ssr/Standard for bulk counters unless we add granularity there
                    const cost = getRate(roleKey, 'Ssr')
                    baseRoles += cost * count
                }
            })
        }

        // Apply Service Type Specific Role Multipliers
        // Sustain: Operation Hours (Now Support Window)
        if (state.serviceType === 'Sustain') {
            const hoursMod = HOURS_MODIFIERS[state.sustainDetails.supportWindow as keyof typeof HOURS_MODIFIERS] || 1.0
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
        let riskMargin = 0
        if (state.serviceType === 'Sustain') {
            if (sustainLevel.label === 'ALTA') riskMargin = 0.20
            else if (sustainLevel.label === 'MEDIA') riskMargin = 0.10
        } else if (state.criticitness.enabled) {
            riskMargin = criticitnessLevel.margin
        }

        const riskVal = subTotal * riskMargin

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

    // --- Retention & Net Logic (Reactive) ---
    const retentionAmount = state.retention.enabled ? finalTotal * (state.retention.percentage / 100) : 0
    const netTotal = finalTotal - retentionAmount

    // Flash effect when Net Total changes
    useEffect(() => {
        if (state.retention.enabled) {
            setIsNetTotalFlashing(true)
            const t = setTimeout(() => setIsNetTotalFlashing(false), 500)
            return () => clearTimeout(t)
        }
    }, [netTotal, state.retention.enabled])

    const durationInMonths = getDurationInMonths()
    const totalProjectCost = totalWithRisk * durationInMonths
    const finalTotalProjectCost = finalTotal * durationInMonths

    // --- Save Quote ---
    const handleSaveQuote = async () => {
        if (!state.clientName) {
            alert("Por favor ingrese un nombre de cliente.")
            return
        }
        setIsSaving(true)
        let diagramDataUrl: string | undefined = undefined

        try {
            // 1. Capture Diagram (if not Staffing)
            try {
                const element = document.getElementById('diagram-capture-target')
                if (element && state.serviceType !== 'Staffing') {
                    const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 4, useCORS: true })
                    diagramDataUrl = canvas.toDataURL('image/png')
                }
            } catch (err) {
                console.warn("Diagram capture failed, proceeding without it", err)
            }

            // Use existing calculated values (from useMemo)
            const totalMonthlyCostVal = totalMonthlyCost
            const l2SupportCostVal = l2SupportCost
            const riskCostVal = riskCost
            const totalWithRiskVal = totalWithRisk
            const discountAmountVal = discountAmount
            const finalTotalUSD = finalTotal

            // Convert using Global Hooks
            const finalTotalConverted = convert(finalTotalUSD)
            const exchangeRate = exchangeRates[currency] || 1.0

            // 2. Save to DB
            const result = await saveQuote({
                clientName: state.clientName,
                projectType: state.complexity, // Use state.complexity as projectType
                serviceType: state.serviceType,
                params: {
                    projectDescription: state.description,
                    updateFrequency: state.updateFrequency === 'realtime' ? 'realtime' : 'daily',
                    usersCount: state.usersCount,
                    pipelinesCount: state.pipelinesCount,
                    // Mandatory TechnicalParameters
                    databricksUsage: state.techStack.includes('databricks') ? 'high' : 'none',
                    criticality: state.criticitness.enabled ? 'high' : 'low',
                    dataVolume: 'GB',
                    sourceSystemsCount: 1,
                    securityCompliance: 'standard',
                    reportComplexity: 'medium',
                    aiFeatures: state.dsModelsCount > 0,
                    // We can pass extra fields if the backend ignored them, but TS is strict.
                    // If we need to save StaffingDetails/SustainDetails, we might need to cast or update types.
                    // But lib/actions calls them "extra" params in n8n.
                    // Let's cast to any if needed, but better to stick to interface.
                    // Wait, saveQuote takes `params: TechnicalParameters`.
                    // Does TechnicalParameters allow extras? No, it's an interface.
                    // But we used to pass `staffingDetails` etc. 
                    // Let's check if the backend actually saves the WHOLE params object as JSON?
                    // Yes: `technicalParameters: data.technicalParameters || JSON.stringify(data.params)`
                    // So we SHOULD pass the extra data even if the Type doesn't say so?
                    // TS will complain.
                    // We should cast to `any` or `TechnicalParameters & { ... }` to bypass TS if we want to save extra data.
                    // Or relies on `technicalParameters` string override?
                } as any, // Cast to any to allow saving full state in valid JSON column
                breakdown: {
                    roles: Object.entries(state.roles).map(([r, c]) => ({ role: r, count: c, cost: 0, hours: 0 })), // Populate roles
                    totalMonthlyCost: totalMonthlyCostVal,
                    diagramCode: chartCode
                },
                estimatedCost: finalTotalConverted,
                technicalParameters: JSON.stringify({
                    ...state.criticitness,
                    description: state.description,
                    complexity: state.complexity,
                    pipelinesCount: state.pipelinesCount,
                    reportUsers: state.reportUsers,
                    currency: currency,
                    exchangeRate: exchangeRate,
                    originalUSDAmount: finalTotalUSD
                }),
                clientId: state.clientId,
                isNewClient: state.isNewClient,
                clientData: state.newClientData ? {
                    name: state.newClientData.companyName,
                    contact: state.newClientData.contactName || '',
                    email: state.newClientData.email || ''
                } : undefined
            })

            if (!result.success || !result.quote) throw new Error(result.error || "Error desconocido al guardar")

            // 3. Webhook Handling (Silent PDF Generation)
            try {
                // Generate Blob (No Download)
                const pdfBlob = await generatePDFBlob({
                    ...state,
                    totalMonthlyCost: totalMonthlyCostVal,
                    l2SupportCost: l2SupportCostVal,
                    riskCost: riskCostVal,
                    totalWithRisk: totalWithRiskVal,
                    criticitnessLevel: criticitnessLevel as any,
                    diagramImage: diagramDataUrl,
                    serviceType: state.serviceType,
                    commercialDiscount: state.commercialDiscount,
                    discountAmount: discountAmountVal,
                    finalTotal: finalTotalUSD,
                    currency: currency,
                    exchangeRate: exchangeRate,
                    durationMonths: getDurationInMonths()
                })

                // Convert to Base64
                const reader = new FileReader()
                reader.readAsDataURL(pdfBlob)
                const base64String = await new Promise<string>((resolve) => {
                    reader.onloadend = () => {
                        const base64 = (reader.result as string || "").split(',')[1]
                        resolve(base64)
                    }
                })

                const filename = `cotizacion_${(state.clientName || 'draft').replace(/\s+/g, '_')}.pdf`

                await sendQuoteToN8N(
                    result.quote,
                    base64String || "",
                    filename,
                    result.userEmail,
                    result.userName,
                    currency,
                    exchangeRate,
                    finalTotalUSD
                );
            } catch (whErr) {
                console.error("Webhook fail", whErr)
                // Do not block success message if webhook fails
            }

            toast.success("Cotización guardada exitosamente.")

            // Redirect to Dashboard (Mis Cotizaciones) after 1s delay
            setTimeout(() => {
                router.push('/dashboard')
            }, 1000)

        } catch (e: any) {
            console.error("Failed to save quote (DB Error):", e)
            toast.error(`Error al guardar: ${e.message}`)
        } finally {
            setIsSaving(false)
        }
    }

    // --- RESET LOGIC ---
    const resetQuoteState = () => {
        setState({
            clientName: '',
            clientId: undefined,
            isNewClient: false,
            newClientData: undefined,
            description: '',
            complexity: 'medium',
            updateFrequency: 'daily',
            roles: Object.keys(FALLBACK_RATES).reduce((acc, key) => ({ ...acc, [key]: 0 }), {} as Record<RoleKey, number>),
            pipelinesCount: 0,
            notebooksCount: 0,
            manualProcessPct: 0,
            automationsCount: 0,
            pipelineExecutions: 0,
            usersCount: 0,
            reportsCount: 0,
            reportUsers: 0,
            isFinancialOrSales: false,
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
            serviceType: 'Proyecto', // Reset to default
            durationValue: 6,
            durationUnit: 'months',
            supportHours: 'business',
            staffingDetails: { profiles: [] },
            sustainDetails: {
                solutionName: '',
                technicalDescription: '',
                techStack: [],
                metrics: {
                    pipelinesCount: 0,
                    notebooksCount: 0,
                    reportsCount: 0,
                    dsModelsCount: 0,
                    automationLevel: 0,
                    updateFrequency: 'daily'
                },
                businessOwner: '',
                devHours: 0,
                incidentRate: 0,
                supportWindow: '9x5',
                criticalHours: '',
                criticalDays: '',
                criticalityMatrix: {
                    impactOperative: 1,
                    impactFinancial: 1,
                    userCoverage: 1,
                    countryCoverage: 1,
                    technicalMaturity: 1,
                    dependencies: 1
                }
            },
            commercialDiscount: 0,
            retention: { enabled: false, percentage: 0 },
            clientContact: { name: '', role: '', email: '', areaLeader: '' }
        })
        setChartCode('graph LR\n  Start --> End') // Reset Diagram
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
                    const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 4, useCORS: true })
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
                    finalTotal,
                    durationMonths: getDurationInMonths()
                })
            } else {
                await exportToWord({
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
                    finalTotal,
                    durationMonths: getDurationInMonths()
                })
            }
        } catch (e) {
            console.error(e)
            alert("Error al exportar cotizaciÃ³n.")
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

        // Default Flow Logic
        // Gov/Security Node removed by request

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
                                <ClientSelector
                                    value={state.clientId}
                                    clientName={state.clientName}
                                    onClientSelect={(client, isNew) => {
                                        console.log("Client Selected:", client)
                                        setState(prev => ({
                                            ...prev,
                                            clientName: client.companyName,
                                            clientId: client.id,
                                            isNewClient: isNew,
                                            newClientData: client,
                                            // Auto-fill contact info if available
                                            clientContact: {
                                                ...prev.clientContact,
                                                name: client.contactName || prev.clientContact.name,
                                                email: client.email || prev.clientContact.email
                                            }
                                        }))
                                    }}
                                />
                            </div>

                            {/* DURATION SELECTOR */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label className="text-[#CFDBD5] text-sm font-bold uppercase tracking-wider mb-2 block">Duración del Proyecto</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={state.durationValue}
                                            onChange={(e) => updateState('durationValue', Number(e.target.value))}
                                            className="bg-[#242423] border-[#333533] text-[#E8EDDF] focus:ring-[#F5CB5C] focus:border-[#F5CB5C]"
                                            min={1}
                                        />
                                        <Select
                                            value={state.durationUnit}
                                            onValueChange={(val: any) => updateState('durationUnit', val)}
                                        >
                                            <SelectTrigger className="w-[180px] bg-[#242423] border-[#333533] text-[#E8EDDF]">
                                                <SelectValue placeholder="Unidad" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#242423] border-[#333533] text-[#E8EDDF]">
                                                <SelectItem value="days">Días</SelectItem>
                                                <SelectItem value="weeks">Semanas</SelectItem>
                                                <SelectItem value="months">Meses</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-end pb-2">
                                    <p className="text-[#CFDBD5] text-sm italic">
                                        Tiempo efectivo calculado: <span className="text-[#F5CB5C] font-bold">{getDurationInMonths().toFixed(1)} meses</span>
                                    </p>
                                </div>
                            </div>

                            {/* SUSTAIN SCORECARD */}
                            {state.serviceType === 'Sustain' ? (
                                <div className="space-y-6">
                                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">

                                        {/* SECTION 1: PERFIL TÉCNICO */}
                                        <AccordionItem value="item-1" className="border-b border-[#4A4D4A]">
                                            <AccordionTrigger className="text-[#E8EDDF] hover:text-[#F5CB5C] hover:no-underline">
                                                <span className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                                    <Cpu className="w-4 h-4 text-[#F5CB5C]" /> 1. Perfil Técnico
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4 space-y-6 bg-[#242423]/50 rounded-b-xl">
                                                <div className="space-y-4">
                                                    <div>
                                                        <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Nombre Solución / Producto</Label>
                                                        <Input
                                                            value={state.sustainDetails.solutionName}
                                                            onChange={e => updateState('sustainDetails', { ...state.sustainDetails, solutionName: e.target.value })}
                                                            className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"
                                                            placeholder="Ej. Data Lake Comercial"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Descripción Funcional</Label>
                                                        <Textarea
                                                            value={state.sustainDetails.technicalDescription}
                                                            onChange={e => updateState('sustainDetails', { ...state.sustainDetails, technicalDescription: e.target.value })}
                                                            className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] min-h-[100px]"
                                                            placeholder="Describe qué hace la solución, usuarios clave y flujo de datos..."
                                                        />
                                                    </div>

                                                    {/* Tech Stack Multi-Select */}
                                                    <div>
                                                        <Label className="text-[#CFDBD5] mb-3 block text-xs uppercase font-bold">Stack Tecnológico</Label>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            {SUSTAIN_TECH_OPTIONS.map((item) => {
                                                                const isSelected = state.sustainDetails.techStack.includes(item.id)
                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => {
                                                                            const current = state.sustainDetails.techStack
                                                                            const newVal = isSelected ? current.filter(i => i !== item.id) : [...current, item.id]
                                                                            updateState('sustainDetails', { ...state.sustainDetails, techStack: newVal })
                                                                        }}
                                                                        className={cn(
                                                                            "cursor-pointer text-xs px-3 py-2 rounded-lg border transition-all flex items-center gap-2",
                                                                            isSelected ? "bg-[#F5CB5C]/10 border-[#F5CB5C] text-[#F5CB5C]" : "bg-[#333533] border-[#4A4D4A] text-[#CFDBD5] hover:border-[#CFDBD5]"
                                                                        )}
                                                                    >
                                                                        <div className={cn("w-3 h-3 rounded border flex items-center justify-center", isSelected ? "border-[#F5CB5C] bg-[#F5CB5C]" : "border-[#CFDBD5]")}>
                                                                            {isSelected && <Check className="w-2 h-2 text-[#242423]" />}
                                                                        </div>
                                                                        {item.name}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Metrics Grid */}
                                                    <div>
                                                        <Label className="text-[#CFDBD5] mb-3 block text-xs uppercase font-bold">Métricas Volumetría</Label>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                            <div className="space-y-1">
                                                                <Label className="text-[#7C7F7C] text-[10px] uppercase">Pipelines</Label>
                                                                <Input type="number" className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-9"
                                                                    value={state.sustainDetails.metrics.pipelinesCount} onChange={e => updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, pipelinesCount: parseInt(e.target.value) || 0 } })} />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[#7C7F7C] text-[10px] uppercase">Notebooks</Label>
                                                                <Input type="number" className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-9"
                                                                    value={state.sustainDetails.metrics.notebooksCount} onChange={e => updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, notebooksCount: parseInt(e.target.value) || 0 } })} />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[#7C7F7C] text-[10px] uppercase">Nivel Auto %</Label>
                                                                <Input type="number" max={100} className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-9"
                                                                    value={state.sustainDetails.metrics.automationLevel} onChange={e => updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, automationLevel: parseInt(e.target.value) || 0 } })} />
                                                            </div>
                                                            {state.sustainDetails.techStack.includes('powerbi') && (
                                                                <div className="space-y-1 animate-in fade-in">
                                                                    <Label className="text-[#7C7F7C] text-[10px] uppercase">Reportes</Label>
                                                                    <Input type="number" className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-9"
                                                                        value={state.sustainDetails.metrics.reportsCount} onChange={e => updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, reportsCount: parseInt(e.target.value) || 0 } })} />
                                                                </div>
                                                            )}
                                                            {(state.sustainDetails.techStack.includes('datascience') || state.sustainDetails.techStack.includes('databricks')) && (
                                                                <div className="space-y-1 animate-in fade-in">
                                                                    <Label className="text-[#7C7F7C] text-[10px] uppercase">Modelos ML</Label>
                                                                    <Input type="number" className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-9"
                                                                        value={state.sustainDetails.metrics.dsModelsCount} onChange={e => updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, dsModelsCount: parseInt(e.target.value) || 0 } })} />
                                                                </div>
                                                            )}
                                                            <div className="space-y-1">
                                                                <Label className="text-[#7C7F7C] text-[10px] uppercase">Frecuencia Update</Label>
                                                                <Select value={state.sustainDetails.metrics.updateFrequency} onValueChange={v => updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, updateFrequency: v } })}>
                                                                    <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-9 text-xs"><SelectValue /></SelectTrigger>
                                                                    <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                                        <SelectItem value="realtime">Real-time</SelectItem>
                                                                        <SelectItem value="hourly">Hora</SelectItem>
                                                                        <SelectItem value="daily">Diaria</SelectItem>
                                                                        <SelectItem value="weekly">Semanal</SelectItem>
                                                                        <SelectItem value="monthly">Mensual</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>

                                        {/* SECTION 2: OPERACIONAL */}
                                        <AccordionItem value="item-2" className="border-b border-[#4A4D4A]">
                                            <AccordionTrigger className="text-[#E8EDDF] hover:text-[#F5CB5C] hover:no-underline">
                                                <span className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                                    <Activity className="w-4 h-4 text-[#F5CB5C]" /> 2. Definición Operacional
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4 space-y-6 bg-[#242423]/50 rounded-b-xl">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Owner de Negocio</Label>
                                                        <Input
                                                            value={state.sustainDetails.businessOwner}
                                                            onChange={e => updateState('sustainDetails', { ...state.sustainDetails, businessOwner: e.target.value })}
                                                            className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Horas Dev Mensuales</Label>
                                                        <Input type="number"
                                                            value={state.sustainDetails.devHours}
                                                            onChange={e => updateState('sustainDetails', { ...state.sustainDetails, devHours: parseInt(e.target.value) || 0 })}
                                                            className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Tasa Incidentes (Mes)</Label>
                                                        <Input type="number"
                                                            value={state.sustainDetails.incidentRate}
                                                            onChange={e => updateState('sustainDetails', { ...state.sustainDetails, incidentRate: parseInt(e.target.value) || 0 })}
                                                            className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Ventana Soporte</Label>
                                                        <Select value={state.sustainDetails.supportWindow} onValueChange={v => updateState('sustainDetails', { ...state.sustainDetails, supportWindow: v })}>
                                                            <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                                <SelectItem value="9x5">9x5 (Horario Oficina)</SelectItem>
                                                                <SelectItem value="24x7">24x7 (Crítico)</SelectItem>
                                                                <SelectItem value="custom">Personalizado</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="col-span-1 md:col-span-2">
                                                        <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Horario/Días Críticos</Label>
                                                        <Input
                                                            placeholder="Ej. Cierre de mes, Lunes mañana"
                                                            value={state.sustainDetails.criticalDays}
                                                            onChange={e => updateState('sustainDetails', { ...state.sustainDetails, criticalDays: e.target.value })}
                                                            className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"
                                                        />
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>

                                        {/* SECTION 3: MATRIZ CRITICIDAD */}
                                        <AccordionItem value="item-3" className="border-b-0">
                                            <AccordionTrigger className="text-[#E8EDDF] hover:text-[#F5CB5C] hover:no-underline">
                                                <span className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                                    <Calculator className="w-4 h-4 text-[#F5CB5C]" /> 3. Matriz de Criticidad
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4 space-y-6 bg-[#242423]/50 rounded-b-xl">

                                                {/* SCORECARD BADGE */}
                                                <div className={cn("flex items-center justify-between p-4 rounded-xl border mb-6 transition-all", sustainLevel.color)}>
                                                    <div>
                                                        <h4 className="font-black text-2xl tracking-tighter">NIVEL {sustainLevel.label}</h4>
                                                        <p className="text-xs opacity-80">Score Acumulado: {sustainScore} puntos</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs font-bold uppercase tracking-wider block">Recomendación</span>
                                                        <span className="text-sm font-medium">
                                                            {sustainLevel.label === 'ALTA' ? 'Soporte Dedicado / 24x7' :
                                                                sustainLevel.label === 'MEDIA' ? 'Soporte Semi-Dedicado' : 'Bolsa de Horas'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* 1. Impacto Operativo */}
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <Label className="text-[#CFDBD5] text-xs uppercase font-bold">1. Impacto Operativo</Label>
                                                            <span className="text-[#F5CB5C] text-xs font-mono">{state.sustainDetails.criticalityMatrix.impactOperative} pts</span>
                                                        </div>
                                                        <Select value={state.sustainDetails.criticalityMatrix.impactOperative.toString()}
                                                            onValueChange={v => updateState('sustainDetails', { ...state.sustainDetails, criticalityMatrix: { ...state.sustainDetails.criticalityMatrix, impactOperative: parseInt(v) } })}>
                                                            <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                                <SelectItem value="1">Bajo (1) - Impacto menor</SelectItem>
                                                                <SelectItem value="3">Importante (3) - Afecta área</SelectItem>
                                                                <SelectItem value="5">Crítico (5) - Detiene operación</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* 2. Impacto Financiero */}
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <Label className="text-[#CFDBD5] text-xs uppercase font-bold">2. Impacto Financiero</Label>
                                                            <span className="text-[#F5CB5C] text-xs font-mono">{state.sustainDetails.criticalityMatrix.impactFinancial} pts</span>
                                                        </div>
                                                        <Select value={state.sustainDetails.criticalityMatrix.impactFinancial.toString()}
                                                            onValueChange={v => updateState('sustainDetails', { ...state.sustainDetails, criticalityMatrix: { ...state.sustainDetails.criticalityMatrix, impactFinancial: parseInt(v) } })}>
                                                            <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                                <SelectItem value="1">Bajo (1)</SelectItem>
                                                                <SelectItem value="3">Medio (3)</SelectItem>
                                                                <SelectItem value="5">Alto (5)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* 3. Cobertura Usuarios */}
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <Label className="text-[#CFDBD5] text-xs uppercase font-bold">3. Usuarios</Label>
                                                            <span className="text-[#F5CB5C] text-xs font-mono">{state.sustainDetails.criticalityMatrix.userCoverage} pts</span>
                                                        </div>
                                                        <Select value={state.sustainDetails.criticalityMatrix.userCoverage.toString()}
                                                            onValueChange={v => updateState('sustainDetails', { ...state.sustainDetails, criticalityMatrix: { ...state.sustainDetails.criticalityMatrix, userCoverage: parseInt(v) } })}>
                                                            <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                                <SelectItem value="1">Menos de 100 (1)</SelectItem>
                                                                <SelectItem value="3">100 - 500 (3)</SelectItem>
                                                                <SelectItem value="5">Más de 500 (5)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* 4. Cobertura Países */}
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <Label className="text-[#CFDBD5] text-xs uppercase font-bold">4. Países</Label>
                                                            <span className="text-[#F5CB5C] text-xs font-mono">{state.sustainDetails.criticalityMatrix.countryCoverage} pts</span>
                                                        </div>
                                                        <Select value={state.sustainDetails.criticalityMatrix.countryCoverage.toString()}
                                                            onValueChange={v => updateState('sustainDetails', { ...state.sustainDetails, criticalityMatrix: { ...state.sustainDetails.criticalityMatrix, countryCoverage: parseInt(v) } })}>
                                                            <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                                <SelectItem value="1">Local / 1 País (1)</SelectItem>
                                                                <SelectItem value="3">Regional / 2-3 Países (3)</SelectItem>
                                                                <SelectItem value="5">Global / 4+ Países (5)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* 5. Madurez Técnica */}
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <Label className="text-[#CFDBD5] text-xs uppercase font-bold">5. Madurez Técnica</Label>
                                                            <span className="text-[#F5CB5C] text-xs font-mono">{state.sustainDetails.criticalityMatrix.technicalMaturity} pts</span>
                                                        </div>
                                                        <Select value={state.sustainDetails.criticalityMatrix.technicalMaturity.toString()}
                                                            onValueChange={v => updateState('sustainDetails', { ...state.sustainDetails, criticalityMatrix: { ...state.sustainDetails.criticalityMatrix, technicalMaturity: parseInt(v) } })}>
                                                            <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                                <SelectItem value="1">Alta / Estable (1)</SelectItem>
                                                                <SelectItem value="3">Media (3)</SelectItem>
                                                                <SelectItem value="5">Baja / Incidentes (5)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* 6. Dependencias */}
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <Label className="text-[#CFDBD5] text-xs uppercase font-bold">6. Dependencias</Label>
                                                            <span className="text-[#F5CB5C] text-xs font-mono">{state.sustainDetails.criticalityMatrix.dependencies} pts</span>
                                                        </div>
                                                        <Select value={state.sustainDetails.criticalityMatrix.dependencies.toString()}
                                                            onValueChange={v => updateState('sustainDetails', { ...state.sustainDetails, criticalityMatrix: { ...state.sustainDetails.criticalityMatrix, dependencies: parseInt(v) } })}>
                                                            <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                                <SelectItem value="1">Ninguna / Baja (1)</SelectItem>
                                                                <SelectItem value="3">Media (3)</SelectItem>
                                                                <SelectItem value="5">Alta / Compleja (5)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            ) : (
                                /* OLD TEXTAREA FOR OTHER TYPES */
                                <div className="relative">
                                    <Label className="text-[#CFDBD5] text-sm font-bold uppercase tracking-wider mb-2 block">
                                        {state.serviceType === 'Staffing' ? 'Contexto de la Búsqueda' : 'Contexto del Proyecto'}
                                    </Label>
                                    <Textarea
                                        placeholder={
                                            state.serviceType === 'Staffing' ? "Descripción del equipo actual, cultura, y por qué se necesitan estos perfiles..." :
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

                    {/* 2. VOLUMETRY - Hidden for Staffing & Sustain */}
                    {state.serviceType !== 'Staffing' && state.serviceType !== 'Sustain' && (
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
                                    <div key={idx} className="bg-[#333533] p-6 rounded-[2rem] border border-white/5 shadow-lg relative group transition-all hover:border-[#F5CB5C]/30 hover:shadow-xl hover:shadow-black/50 overflow-hidden">

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const newProfiles = [...state.staffingDetails.profiles]
                                                newProfiles.splice(idx, 1)
                                                updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles })
                                            }}
                                            className="absolute top-4 right-4 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-full h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>

                                        <div className="grid grid-cols-4 gap-6">

                                            {/* Row 1: Labels (Perfect Alignment) */}
                                            <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider pl-1">Rol / Perfil</Label>
                                            <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider pl-1">Seniority</Label>
                                            <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider pl-1">Dedicación</Label>
                                            <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider pl-1 text-center">Cantidad</Label>

                                            {/* Row 2: Inputs (Perfect Alignment) */}

                                            {/* 1. Rol Input */}
                                            <Input
                                                placeholder="Ej. Java Developer"
                                                value={profile.role}
                                                onChange={(e) => {
                                                    const newProfiles = [...state.staffingDetails.profiles]
                                                    newProfiles[idx].role = e.target.value
                                                    updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles })
                                                }}
                                                className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-[50px] rounded-[1rem] text-sm font-medium focus:border-[#F5CB5C] transition-all hover:border-[#F5CB5C]/50"
                                            />

                                            {/* 2. Seniority Input */}
                                            <Select value={profile.seniority} onValueChange={(v) => {
                                                const newProfiles = [...state.staffingDetails.profiles]
                                                newProfiles[idx].seniority = v
                                                updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles })
                                            }}>
                                                <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-[50px] rounded-[1rem] text-sm hover:border-[#F5CB5C]/50 transition-all focus:ring-0 focus:border-[#F5CB5C]"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                    <SelectItem value="Jr">Junior</SelectItem>
                                                    <SelectItem value="Ssr">Semi-Senior</SelectItem>
                                                    <SelectItem value="Sr">Senior</SelectItem>
                                                    <SelectItem value="Lead">Tech Lead / Architect</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {/* 3. Dedicación Input (Clon Visual) */}
                                            <div className="flex h-[50px] bg-[#242423] border border-[#4A4D4A] rounded-[1rem] overflow-hidden hover:border-[#F5CB5C]/50 transition-colors group/dedication relative">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        let val = (profile.allocationPercentage ?? 100) - 5;
                                                        if (val < 0) val = 0;
                                                        const newProfiles = [...state.staffingDetails.profiles];
                                                        newProfiles[idx].allocationPercentage = val;
                                                        updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles });
                                                    }}
                                                    className="h-full w-10 absolute left-0 top-0 z-10 hover:bg-[#F5CB5C]/10 hover:text-[#F5CB5C] text-[#CFDBD5]/30 rounded-none transition-colors"
                                                >
                                                    -
                                                </Button>

                                                <div className="flex-1 flex flex-col items-center justify-center relative w-full pointer-events-none">
                                                    <div className="flex items-baseline gap-0.5">
                                                        <span className="text-[#E8EDDF] text-base font-bold tracking-tight">
                                                            {profile.allocationPercentage ?? 100}
                                                        </span>
                                                        <span className="text-[#F5CB5C] text-xs font-bold mb-0.5">%</span>
                                                    </div>
                                                    <span className="text-[9px] text-[#CFDBD5]/50 font-mono tracking-tight leading-none -mt-0.5">
                                                        {(160 * ((profile.allocationPercentage ?? 100) / 100)).toFixed(0)} h/mes
                                                    </span>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        let val = (profile.allocationPercentage ?? 100) + 5;
                                                        if (val > 100) val = 100;
                                                        const newProfiles = [...state.staffingDetails.profiles];
                                                        newProfiles[idx].allocationPercentage = val;
                                                        updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles });
                                                    }}
                                                    className="h-full w-10 absolute right-0 top-0 z-10 hover:bg-[#F5CB5C]/10 hover:text-[#F5CB5C] text-[#CFDBD5]/30 rounded-none transition-colors"
                                                >
                                                    +
                                                </Button>
                                            </div>

                                            {/* 4. Cantidad Input */}
                                            <Input
                                                type="number"
                                                min={1}
                                                value={profile.count}
                                                onChange={(e) => {
                                                    const newProfiles = [...state.staffingDetails.profiles]
                                                    newProfiles[idx].count = parseInt(e.target.value) || 1
                                                    updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles })
                                                }}
                                                className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-[50px] rounded-[1rem] text-center font-bold text-base focus:border-[#F5CB5C] transition-all hover:border-[#F5CB5C]/50"
                                            />

                                        </div>
                                        <div className="mt-4">
                                            <Input
                                                placeholder="Skills / Tecnologías (Ej. React, Node.js, AWS, Kubernetes)"
                                                value={profile.skills}
                                                onChange={(e) => {
                                                    const newProfiles = [...state.staffingDetails.profiles]
                                                    newProfiles[idx].skills = e.target.value
                                                    updateState('staffingDetails', { ...state.staffingDetails, profiles: newProfiles })
                                                }}
                                                className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-10 rounded-lg text-xs hover:border-[#F5CB5C]/50 transition-all focus:border-[#F5CB5C]"
                                            />
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
                                    className="w-full h-12 border-dashed border border-[#4A4D4A] bg-transparent text-[#CFDBD5] hover:border-[#F5CB5C] hover:text-[#F5CB5C] hover:bg-[#F5CB5C]/5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all"
                                >
                                    + Agregar Perfil
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
                    {/* 5. TECH - Included in Scorecard for Sustain */}
                    {state.serviceType !== 'Sustain' && (
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
                    )}

                    {/* 6. CRITICITNESS */}
                    {/* 6. CRITICITNESS (Upgraded v2) */}
                    {/* 6. CRITICITNESS (Fixed) - Hidden for Sustain (now in Scorecard) */}
                    {state.serviceType !== 'Sustain' && (
                        <SectionCard number="06" title="Evaluación de Criticidad" icon={ShieldAlert}>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#333533] rounded-xl border border-[#4A4D4A]">
                                        <ShieldAlert className="w-6 h-6 text-[#F5CB5C]" />
                                    </div>
                                    <div>
                                        <p className="text-[#E8EDDF] font-bold">Análisis de Riesgo y SLA</p>
                                        <p className="text-sm text-[#CFDBD5]">Calculadora de márgenes operativos</p>
                                    </div>
                                </div>
                                <Switch checked={state.criticitness.enabled} onCheckedChange={v => updateCriticitness('enabled', v)} className="data-[state=checked]:bg-[#F5CB5C]" />
                            </div>

                            {/* Predictive Logic Alert (Only if enabled and update frequency/complexity mismatch) */}
                            {(state.criticitness.enabled && state.complexity === 'high' && (state.updateFrequency === 'weekly' || state.updateFrequency === 'realtime') && state.supportHours !== '24/7') && (
                                <div className="bg-orange-900/20 border border-orange-500/30 rounded-2xl p-4 flex items-start gap-4 mb-6">
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

                            {/* Conditional Criticality Inputs */}
                            {state.criticitness.enabled && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">

                                    {/* Score Display (Moved inside for context) */}
                                    <div className="relative z-10 flex flex-col md:flex-row gap-4 items-center bg-[#F5CB5C]/5 p-4 rounded-2xl border border-[#F5CB5C]/20 w-full">
                                        <div className="flex-1">
                                            <span className="text-xs font-bold text-[#CFDBD5] uppercase tracking-widest flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-[#F5CB5C]" /> Score de Riesgo Calculado
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-4xl font-black text-[#E8EDDF] flex items-baseline gap-2">
                                                {criticitnessScore}
                                                <span className="text-lg text-[#7C7F7C] font-normal">/100</span>
                                            </div>
                                            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border w-fit text-sm font-bold", criticitnessLevel.color)}>
                                                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                                                {criticitnessLevel.label}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label className="text-[#CFDBD5] mb-2 block">Nivel de Soporte</Label>
                                            <Select value={state.supportHours} onValueChange={(v: any) => updateState('supportHours', v)}>
                                                <SelectTrigger className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] h-12 rounded-xl"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                    <SelectItem value="business">Business (9-18h)</SelectItem>
                                                    <SelectItem value="24/7">24/7 Critical</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
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
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <div>
                                            <Label className="text-[#CFDBD5] mb-2 block">Impacto Financiero</Label>
                                            <Select value={state.criticitness.impactFinancial} onValueChange={(v: any) => updateCriticitness('impactFinancial', v)}>
                                                <SelectTrigger className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] h-12 rounded-xl"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                    <SelectItem value="low">Bajo ({'<'} 10k USD)</SelectItem>
                                                    <SelectItem value="medium">Medio (10k - 100k USD)</SelectItem>
                                                    <SelectItem value="high">Alto ({'>'} 100k USD)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <CountInput label="Países Involucrados" value={state.criticitness.countriesCount} onChange={(v: number) => updateCriticitness('countriesCount', v)} min={1} />
                                    </div>
                                </div>
                            )}
                        </SectionCard>
                    )}

                    {/* 7. COMMERCIAL DATA & RETENTION */}
                    <SectionCard number="07" title="Datos Comercial & Retenciones" icon={Users}>
                        <div className="space-y-6">
                            {/* ROW 1: Contact Info (4 Columns) */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider pl-1">Solicitante</Label>
                                    <Input
                                        value={state.clientContact.name}
                                        onChange={e => updateState('clientContact', { ...state.clientContact, name: e.target.value })}
                                        placeholder="Nombre"
                                        className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-[50px] rounded-[1rem] focus:border-[#F5CB5C] transition-all hover:border-[#F5CB5C]/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider pl-1">Cargo / Rol</Label>
                                    <Input
                                        value={state.clientContact.role}
                                        onChange={e => updateState('clientContact', { ...state.clientContact, role: e.target.value })}
                                        placeholder="Cargo"
                                        className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-[50px] rounded-[1rem] focus:border-[#F5CB5C] transition-all hover:border-[#F5CB5C]/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider pl-1">Email</Label>
                                    <Input
                                        value={state.clientContact.email}
                                        onChange={e => updateState('clientContact', { ...state.clientContact, email: e.target.value })}
                                        placeholder="Email"
                                        className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-[50px] rounded-[1rem] focus:border-[#F5CB5C] transition-all hover:border-[#F5CB5C]/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider pl-1">Líder de Área</Label>
                                    <Input
                                        value={state.clientContact.areaLeader || ''}
                                        onChange={e => updateState('clientContact', { ...state.clientContact, areaLeader: e.target.value })}
                                        placeholder="Líder"
                                        className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-[50px] rounded-[1rem] focus:border-[#F5CB5C] transition-all hover:border-[#F5CB5C]/50"
                                    />
                                </div>
                            </div>

                            {/* ROW 2: Retention Logic (Dynamic) */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                {/* Selector (Col 1) */}
                                <div className="space-y-2">
                                    <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider pl-1">Retención Fiscal</Label>
                                    <Select
                                        value={state.retention.enabled ? "yes" : "no"}
                                        onValueChange={(v) => updateState('retention', { ...state.retention, enabled: v === 'yes' })}
                                    >
                                        <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-[50px] rounded-[1rem] focus:ring-[#F5CB5C] transition-all hover:border-[#F5CB5C]/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                            <SelectItem value="no">No aplica</SelectItem>
                                            <SelectItem value="yes">Sí, aplica retención</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Dynamic Fields (Col 2-4) */}
                                <AnimatePresence mode="popLayout">
                                    {state.retention.enabled && (
                                        <>
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.2 }}
                                                className="space-y-2"
                                            >
                                                <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider pl-1">% Porcentaje</Label>
                                                {/* Dedication-Style Container */}
                                                <div className="flex h-[50px] bg-[#242423] border border-[#4A4D4A] rounded-[1rem] overflow-hidden hover:border-[#F5CB5C]/50 transition-colors relative z-10 group/retention">

                                                    {/* Button Minus */}
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => updateState('retention', { ...state.retention, percentage: Math.max(0, state.retention.percentage - 1) })}
                                                        className="h-full w-10 absolute left-0 top-0 z-20 hover:bg-[#F5CB5C]/10 hover:text-[#F5CB5C] text-[#CFDBD5]/30 rounded-none transition-colors text-xl font-light"
                                                    >
                                                        -
                                                    </Button>

                                                    {/* Center Group: Input + % */}
                                                    <div className="flex-1 flex flex-col items-center justify-center h-full relative">
                                                        <div className="flex items-center justify-center gap-0.5 w-full px-10">
                                                            <input
                                                                type="number"
                                                                value={state.retention.percentage}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value)
                                                                    updateState('retention', { ...state.retention, percentage: isNaN(val) ? 0 : val })
                                                                }}
                                                                className="bg-transparent text-[#E8EDDF] text-base font-bold tracking-tight text-center w-full focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <span className="text-[#F5CB5C] text-xs font-bold mb-0.5 select-none">%</span>
                                                        </div>
                                                    </div>

                                                    {/* Button Plus */}
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => updateState('retention', { ...state.retention, percentage: Math.min(100, state.retention.percentage + 1) })}
                                                        className="h-full w-10 absolute right-0 top-0 z-20 hover:bg-[#F5CB5C]/10 hover:text-[#F5CB5C] text-[#CFDBD5]/30 rounded-none transition-colors text-xl font-light"
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            </motion.div>

                                            {/* Net Total Badge (Col 3-4) */}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.2, delay: 0.1 }}
                                                className="md:col-span-2 space-y-2"
                                            >
                                                <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider pl-1">NETO A COBRAR</Label>
                                                <div className={cn(
                                                    "bg-[#1a1a1a] border h-[50px] rounded-[1rem] px-6 flex items-center justify-between transition-all duration-500",
                                                    isNetTotalFlashing ? "border-[#F5CB5C] shadow-[0_0_20px_rgba(245,203,92,0.4)] scale-[1.02]" : "border-[#F5CB5C]/30 shadow-[0_0_15px_rgba(245,203,92,0.05)]"
                                                )}>
                                                    <span className="text-[#CFDBD5] text-sm uppercase tracking-widest font-bold">Total Neto</span>
                                                    <span className={cn("font-mono font-bold text-xl tracking-tight transition-colors duration-300", isNetTotalFlashing ? "text-[#F5CB5C]" : "text-[#F5CB5C]")}>
                                                        {formatMoney(netTotal)}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </SectionCard>
                </div>
            </div>

            {/* ================= RIGHT COLUMN: INDEPENDENT SCROLL SUMMARY ================= */}
            <div className="w-full lg:w-1/3 h-full overflow-y-auto scrollbar-custom bg-[#242423] border-l border-[#CFDBD5]/10 p-8 lg:p-10 space-y-10 relative">
                {/* Cost Summary */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[#F5CB5C] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <Calculator className="w-4 h-4" /> INVERSIÓN ESTIMADA
                            </h4>
                            <div className="w-[100px]">
                                <Select value={currency} onValueChange={(val) => setCurrency(val)}>
                                    <SelectTrigger className="h-7 text-[10px] font-bold bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] focus:border-[#F5CB5C] rounded-lg">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                        <SelectItem value="USD">USD - Dólar</SelectItem>
                                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                                        <SelectItem value="ARS">ARS - Peso Arg</SelectItem>
                                        <SelectItem value="MXN">MXN - Peso Mex</SelectItem>
                                        <SelectItem value="COP">COP - Peso Col</SelectItem>
                                        <SelectItem value="CLP">CLP - Peso Chi</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {/* Exchange Rate Verification Display */}
                        {currency !== 'USD' && (
                            <div className="text-[10px] text-[#CFDBD5]/50 flex justify-end mt-1 font-mono">
                                Tasa de cambio: 1 USD = {(exchangeRates[currency] || 0).toLocaleString('en-US')} {currency}
                            </div>
                        )}
                    </div>
                    <div className="text-3xl md:text-3xl lg:text-4xl font-mono font-bold tracking-tighter text-[#E8EDDF] drop-shadow-[0_0_15px_rgba(245,203,92,0.1)] truncate">
                        {formatMoney(finalTotalProjectCost)}
                    </div>
                    <p className="text-[#CFDBD5] mt-2 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#F5CB5C] animate-pulse" />
                        Total proyecto ({state.durationValue} {state.durationUnit === 'days' ? 'días' : state.durationUnit === 'weeks' ? 'semanas' : 'meses'})
                    </p>
                </div>

                <div className="bg-[#333533] rounded-[2rem] p-8 text-sm space-y-5 border border-[#4A4D4A] shadow-xl relative overflow-hidden">
                    <div className="flex justify-between items-center text-[#E8EDDF]">
                        <span className="text-[#CFDBD5]">Servicios (Infra/Data)</span>
                        <span className="font-mono text-xl">{formatMoney(servicesCost * durationInMonths)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#E8EDDF]">
                        <span className="text-[#CFDBD5]">Equipo (Roles)</span>
                        <span className="font-mono text-xl">{formatMoney(rolesCost * durationInMonths)}</span>
                    </div>
                    {l2SupportCost > 0 && (
                        <div className="flex justify-between items-center text-[#F5CB5C] bg-[#F5CB5C]/10 p-3 rounded-xl -mx-2 border border-[#F5CB5C]/20">
                            <span className="text-xs font-bold">SOPORTE L2 (10%)</span>
                            <span className="font-mono text-xl">+ {formatMoney(l2SupportCost * durationInMonths)}</span>
                        </div>
                    )}
                    {state.criticitness.enabled && (
                        <div className="flex justify-between items-center text-orange-400 bg-orange-900/10 p-3 rounded-xl -mx-2 border border-orange-500/20">
                            <span className="text-xs font-bold">RIESGO ({criticitnessLevel.label})</span>
                            <span className="font-mono text-xl">+ {formatMoney(riskCost * durationInMonths)}</span>
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

                    {state.commercialDiscount > 0 && (
                        <div className="flex justify-between items-center text-green-400">
                            <span>Ahorro Aplicado</span>
                            <span className="font-mono">- {formatMoney(discountAmount)}</span>
                        </div>
                    )}

                    {state.retention.enabled && (
                        <div className="flex justify-between items-center text-[#F5CB5C]/70 border-t border-[#4A4D4A]/50 pt-2">
                            <span>Retención ({state.retention.percentage}%)</span>
                            <span className="font-mono">- {formatMoney(finalTotal * (state.retention.percentage / 100))}</span>
                        </div>
                    )}

                    <Separator className="bg-[#4A4D4A]" />
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[#E8EDDF] font-medium text-lg">
                            <span>Bruto</span>
                            <span className="font-mono">{formatMoney(finalTotal)}</span>
                        </div>
                        {state.retention.enabled && (
                            <div className="flex justify-between items-center text-[#F5CB5C] font-black text-2xl">
                                <span>Neto a Cobrar</span>
                                <span>Neto a Cobrar</span>
                                <span>{formatMoney(netTotal)}</span>
                            </div>
                        )}
                        {!state.retention.enabled && (
                            <div className="flex justify-between items-center text-[#E8EDDF] font-black text-2xl">
                                <span>Total</span>
                                <span className="text-[#F5CB5C]">{formatMoney(finalTotal)}</span>
                            </div>
                        )}
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


                {/* Architecture Diagram */}
                {
                    (
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
                    )
                }

                {/* Tech Summary */}
                <div className="space-y-6 pt-10 border-t border-[#CFDBD5]/10">
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
                </div>

            </div>
        </motion.div>
    )
}




// --- HELPERS ---

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
// Force Git Update

// Force Git Update 2
// Force Git Update 3