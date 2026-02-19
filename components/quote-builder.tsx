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
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Separator } from "@/components/ui/separator"
import { ServiceRate } from "@prisma/client"
import { MermaidDiagram } from "@/components/mermaid-diagram"
import { Wand2, Download, FileText, Check, ShieldAlert, Network, Cpu, Calculator, Save, Loader2, ClipboardList, Database, Users, Briefcase, Layers, AlertTriangle, Activity, Zap, Edit, X, RefreshCw, ImageDown, Sparkles, Undo2, ArrowRight, Plus, Minus, Trash2 } from "lucide-react"
import { SenioritySelector } from "@/components/seniority-selector"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { saveQuote } from "@/lib/actions"
import { generateMermaidUpdate } from "@/lib/ai"
import { exportToPDF, exportToWord, generatePDFBlob } from "@/lib/export"
import html2canvas from 'html2canvas'
import { motion, AnimatePresence } from "framer-motion"
import { sendQuoteToN8N, updateQuote } from "@/lib/actions"
import { ClientSelector, ClientData } from "@/components/client-selector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

// Hardcoded fallback rates in case DB fails or during transition
// Updated Q3 Rates based on User Request
// Updated Q3 Rates based on User Request (Excel)
const ROLE_CONFIG = {
    bi_visualization_developer: { label: "BI Visualization Developer", defaultPrice: 4128.70 },
    azure_developer: { label: "Azure Developer", defaultPrice: 4128.70 },
    solution_architect: { label: "Solution Architect", defaultPrice: 5308.33 },
    bi_data_architect: { label: "BI Data Architect", defaultPrice: 5308.33 },
    data_engineer: { label: "Data Engineer", defaultPrice: 4954.44 },
    data_scientist: { label: "Data Scientist", defaultPrice: 5190.37 },
    data_operations_analyst: { label: "Data / Operations Analyst", defaultPrice: 3538.89 },
    project_product_manager: { label: "Project / Product Manager", defaultPrice: 5308.33 },
    business_analyst: { label: "Business Analyst", defaultPrice: 4128.70 },
    low_code_developer: { label: "Low Code Developer", defaultPrice: 3538.00 },
    power_app_streamlit_developer: { label: "Power App / Streamlit Developer", defaultPrice: 3538.00 }
}

const MANAGEMENT_ROLES: RoleKey[] = ['solution_architect', 'bi_data_architect', 'project_product_manager', 'business_analyst']
const DATA_ROLES: RoleKey[] = ['data_engineer', 'data_scientist', 'data_operations_analyst', 'azure_developer']
const GOVERNANCE_ROLES: RoleKey[] = ['bi_data_architect', 'data_operations_analyst']
const PRODUCT_ROLES: RoleKey[] = ['bi_visualization_developer', 'low_code_developer', 'power_app_streamlit_developer']

const SENIORITY_MODIFIERS = {
    'Jr': 0.7,
    'Med': 1.0,
    'Sr': 1.3,
    'Expert': 1.5
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

type RoleKey = keyof typeof ROLE_CONFIG;

interface QuoteState {
    // 1. General
    clientName: string
    clientId?: string // NEW: Linked Client ID
    contactId?: string // NEW: Linked Contact ID
    quoteNumber?: number // NEW: Incremental ID from DB
    isNewClient?: boolean // NEW: Flag
    newClientData?: ClientData // NEW: For Context
    description: string
    complexity: 'low' | 'medium' | 'high'
    updateFrequency: 'daily' | 'weekly' | 'monthly' | 'realtime'
    clientLogoUrl?: string | null

    // 2. Team
    roles: Record<RoleKey, number>

    // 3. Volumetry
    dataSourcesCount: number // Added for compatibility
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

    // 7. Criticitness REMOVED

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
            price?: number // Added for snapshot pricing
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
            dashboardsCount: number
            dsModelsCount: number
            dataSourcesCount: number
            automationLevel: number
            manualProcess: boolean
            systemDependencies: string
            updateFrequency: string
        }

        // Section 2: Operational Definition
        businessOwner: string
        devHours: number
        incidentRate: number
        supportWindow: string
        criticalHours: string
        criticalDays: string
        // New Operational Fields
        updateDuration: string
        weekendUsage: boolean
        weekendDays: string[] // NEW: ['Saturday', 'Sunday']
        weekendSupportHours: string
        updateSchedule: string
        secondaryUpdateSchedule?: string // NEW: Optional second slot
        hypercarePeriod: string

        // Section 3: Criticality Matrix (Values 1, 3, 5)
        criticalityMatrix: {
            impactOperative: number
            impactFinancial: number
            userCoverage: number
            countryCoverage: number
            technicalMaturity: number
            dependencies: number
            // New Fields
            frequencyOfUse: string
            hasCriticalDates: boolean
            criticalDatesDescription: string
            marketsImpacted: number
            usersImpacted: number
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
    clientLogoUrl: null,
    serviceType: 'Proyecto',
    roles: {
        bi_visualization_developer: 0,
        azure_developer: 0,
        solution_architect: 0,
        bi_data_architect: 0,
        data_engineer: 0,
        data_scientist: 0,
        data_operations_analyst: 0,
        project_product_manager: 0,
        business_analyst: 0,
        low_code_developer: 0,
        power_app_streamlit_developer: 0
    },
    dataSourcesCount: 0,
    pipelinesCount: 0,
    notebooksCount: 0,
    manualProcessPct: 20,
    automationsCount: 0,
    pipelineExecutions: 0,
    usersCount: 0,
    isFinancialOrSales: false,
    reportsCount: 0,
    reportUsers: 0,
    contactId: undefined, // NEW

    techStack: [],

    dsModelsCount: 0,
    dashboardsCount: 0,
    // criticitness REMOVED
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
            dashboardsCount: 0,
            dsModelsCount: 0,
            dataSourcesCount: 0,
            automationLevel: 0,
            manualProcess: false,
            systemDependencies: '',
            updateFrequency: 'daily'
        },
        businessOwner: '',
        devHours: 0,
        incidentRate: 0,
        supportWindow: '9x5',
        criticalHours: '',

        criticalDays: '',
        updateDuration: '',
        updateSchedule: '',
        secondaryUpdateSchedule: '',
        weekendUsage: false,
        weekendDays: [],
        weekendSupportHours: '',
        hypercarePeriod: '30_days',
        criticalityMatrix: {
            impactOperative: 1,
            impactFinancial: 1,
            userCoverage: 1,
            countryCoverage: 1,
            technicalMaturity: 1,
            dependencies: 1,
            frequencyOfUse: 'daily',
            hasCriticalDates: false,
            criticalDatesDescription: '',
            marketsImpacted: 1,
            usersImpacted: 1
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

const RECOMMENDATIONS: Record<string, { role: RoleKey, seniority: string, reason: string }> = {
    azure: { role: 'data_engineer', seniority: 'Med', reason: 'Para orquestación en Data Factory' },
    databricks: { role: 'data_engineer', seniority: 'Sr', reason: 'Para ingeniería de datos avanzada' },
    powerbi: { role: 'bi_visualization_developer', seniority: 'Med', reason: 'Para modelado y visualización' },
    snowflake: { role: 'data_engineer', seniority: 'Sr', reason: 'Para optimización de Warehouse' },
    python: { role: 'data_engineer', seniority: 'Sr', reason: 'Para custom scripting y pipelines' },
    datascience: { role: 'data_scientist', seniority: 'Sr', reason: 'Para análisis avanzado y ML' },
    synapse: { role: 'bi_data_architect', seniority: 'Sr', reason: 'Para diseño de arquitectura unificada' },
    sqlserver: { role: 'data_operations_analyst', seniority: 'Med', reason: 'Para administración y soporte T-SQL' }
}

// --- 2. COMPONENT ---



const DEFAULT_DIAGRAM = `graph TD
    %% Graphite Theme
    classDef default fill:#242423,stroke:#CFDBD5,stroke-width:2px,color:#E8EDDF;
    classDef highlight fill:#242423,stroke:#F5CB5C,stroke-width:2px,color:#F5CB5C;
    linkStyle default stroke:#CFDBD5,stroke-width:2px;
    
    Source[Fuentes]
    Pipe[Ingesta]
    Store[Lakehouse]
    Vis[Power BI]
    User((Usuario))
    
    Source --> Pipe
    Pipe --> Store
    Store --> Vis
    Vis --> User
    
    class Source,User default
    class Pipe,Store,Vis highlight
`
const RECOMENDACIONES_MAPPING: Record<string, Array<{ role: RoleKey, seniority: string, rationale: string }>> = {
    // Project Techs
    'azure': [{ role: 'data_engineer', seniority: 'Sr', rationale: 'Implementación de pipelines de datos y orquestación.' }],
    'databricks': [{ role: 'data_engineer', seniority: 'Sr', rationale: 'Procesamiento Spark y optimización de Lakehouse.' }],
    'synapse': [{ role: 'data_engineer', seniority: 'Sr', rationale: 'Modelado de datos y Analytics Pools.' }],
    'snowflake': [{ role: 'data_engineer', seniority: 'Sr', rationale: 'Gestión de almacén de datos nube.' }],
    'powerbi': [{ role: 'bi_visualization_developer', seniority: 'Med', rationale: 'Modelado de métricas DAX y visualización de tableros.' }],
    'sqlserver': [{ role: 'data_engineer', seniority: 'Med', rationale: 'Optimización de consultas y gestión de DB relacionales.' }],
    'logicapps': [{ role: 'azure_developer', seniority: 'Med', rationale: 'Integraciones serverless y flujos de eventos.' }],
    'tableau': [{ role: 'bi_visualization_developer', seniority: 'Med', rationale: 'Desarrollo de historias visuales y dashboards complejos.' }],
    'python': [{ role: 'data_scientist', seniority: 'Sr', rationale: 'Scripts de automatización y modelos analíticos.' }],
    'n8n': [{ role: 'azure_developer', seniority: 'Med', rationale: 'Automatización de flujos con herramientas Low-Code.' }],
    'antigravity': [{ role: 'data_scientist', seniority: 'Expert', rationale: 'Implementación de Agentes IA y RAG.' }],
    'lovable': [{ role: 'low_code_developer', seniority: 'Med', rationale: 'Desarrollo de interfaces aceleradas con No-Code.' }],
    'powerapps': [{ role: 'power_app_streamlit_developer', seniority: 'Med', rationale: 'Aplicaciones de negocio y personalización corporativa.' }],

    // Sustain Techs
    'azure_df': [{ role: 'data_engineer', seniority: 'Sr', rationale: 'Soporte y mantenimiento de pipelines ADF.' }],
    'sql': [{ role: 'data_operations_analyst', seniority: 'Med', rationale: 'Mantenimiento de bases de datos y consultas SQL.' }],
    'dotnet': [{ role: 'azure_developer', seniority: 'Med', rationale: 'Mantenimiento de aplicaciones backend .NET.' }],
    'react': [{ role: 'azure_developer', seniority: 'Med', rationale: 'Mantenimiento de frontend React.' }], // Mapped to Generic Dev
    'streamlit': [{ role: 'power_app_streamlit_developer', seniority: 'Med', rationale: 'Soporte a aplicaciones de datos Streamlit.' }],
    'datascience': [{ role: 'data_scientist', seniority: 'Sr', rationale: 'Mantenimiento de modelos ML productivos.' }],
    'other': []
}

export default function QuoteBuilder({ dbRates = [], initialData, readOnly = false }: { dbRates?: ServiceRate[], initialData?: any, readOnly?: boolean }) {
    const [state, setState] = useState<QuoteState>(JSON.parse(JSON.stringify(INITIAL_STATE)))
    const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly')
    const [isSuggestionLoading, setIsSuggestionLoading] = useState(false)

    const handleAddProfile = (roleKey: RoleKey, seniority: string = 'Sr', price?: number) => {
        const role = ROLE_CONFIG[roleKey]
        if (!role) return

        const finalPrice = price !== undefined ? price : (role.defaultPrice * (SENIORITY_MODIFIERS[seniority as keyof typeof SENIORITY_MODIFIERS] || 1.0))

        const newProfile = {
            id: crypto.randomUUID(),
            role: role.label,
            seniority: seniority,
            count: 1,
            price: finalPrice,
            skills: '',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString()
        }

        setState(prev => ({
            ...prev,
            roles: { ...prev.roles, [roleKey]: (prev.roles[roleKey] || 0) + 1 },
            staffingDetails: {
                ...prev.staffingDetails,
                profiles: [...prev.staffingDetails.profiles, newProfile]
            }
        }))
        toast.success(`${role.label} (${seniority}) agregado`)
    }

    const handleUpdateProfileCount = (index: number, newCount: number) => {
        // Allow decimals, prevent negative
        if (newCount < 0) return

        setState(prev => {
            const profile = prev.staffingDetails.profiles[index]
            const roleKey = Object.keys(ROLE_CONFIG).find(key => ROLE_CONFIG[key as RoleKey].label === profile.role) as RoleKey

            // Calculate delta for roles summary
            const currentCount = profile.count || 0
            const delta = newCount - currentCount

            const newRoles = {
                ...prev.roles,
                [roleKey]: Math.max(0, (prev.roles[roleKey] || 0) + delta)
            }

            const newProfiles = [...prev.staffingDetails.profiles]
            newProfiles[index] = { ...newProfiles[index], count: newCount }

            return {
                ...prev,
                roles: newRoles,
                staffingDetails: {
                    ...prev.staffingDetails,
                    profiles: newProfiles
                }
            }
        })
    }

    // ... (rest of state) ... 

    // --- Dynamic Step Numbering ---
    const getSectionNumber = useCallback((sectionId: string) => {
        const sequence: string[] = []
        sequence.push('general')
        if (state.serviceType === 'Proyecto') {
            sequence.push('volumetry')
            sequence.push('business')
        }
        if (state.serviceType !== 'Sustain') {
            sequence.push('tech')
        }
        sequence.push('staffing')
        sequence.push('commercial')

        const index = sequence.indexOf(sectionId)
        if (index === -1) return "00"
        return (index + 1).toString().padStart(2, '0')
    }, [state.serviceType])

    // FROZEN RATES LOGIC (Data Freezing)
    // We extract the unit costs from the saved snapshot to prevent recalculation with new DB rates.
    const frozenRates = useMemo(() => {
        if (!initialData || !readOnly) return null

        const ratesMap = new Map<string, number>()

        try {
            // 1. Staffing Frozen Rates
            if (initialData.staffingRequirements) {
                const staffing = typeof initialData.staffingRequirements === 'string'
                    ? JSON.parse(initialData.staffingRequirements)
                    : initialData.staffingRequirements

                if (Array.isArray(staffing)) {
                    staffing.forEach((roleItem: any) => {
                        // Snapshot 'cost' is usually Total Monthly Cost for that line
                        // We need Unit Rate = Cost / (Count * Allocation)
                        const count = Number(roleItem.count) || 1
                        const allocation = (Number(roleItem.allocationPercentage) || 100) / 100
                        const totalLineCost = Number(roleItem.cost) || 0

                        if (count > 0 && totalLineCost > 0) {
                            const unitRate = totalLineCost / (count * allocation)
                            // Key: Role + Seniority (e.g. "Data Engineer_Sr")
                            // Note: 'roleItem' might lack seniority explicit field if not saved properly?
                            // staffingDetails.profiles saves it.
                            // Let's rely on the construction of the key.
                            const key = `${roleItem.role}_${roleItem.seniority || 'Ssr'}`
                            ratesMap.set(key, unitRate)
                        }
                    })
                }
            }
        } catch (e) {
            console.error("Failed to parse frozen rates", e)
        }

        return ratesMap
    }, [initialData, readOnly])

    // ... existing state ... : 
    const [chartCode, setChartCode] = useState(DEFAULT_DIAGRAM)
    const [manualDiagramCode, setManualDiagramCode] = useState<string | null>(null)
    const [isEditingDiagram, setIsEditingDiagram] = useState(false)

    // Suggestion Modal State
    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false)
    const [pendingRecs, setPendingRecs] = useState<any[]>([])
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
        // If initialData is present, priority goes to that
        if (initialData) {
            console.log("Preloading Quote Data for Edit:", initialData)
            let params: any = {}
            try {
                params = typeof initialData.technicalParameters === 'string'
                    ? JSON.parse(initialData.technicalParameters)
                    : initialData.technicalParameters || {}
            } catch (e) { console.error(e) }

            // Merge Initial Data
            setState(prev => ({
                ...prev,
                clientName: initialData.clientName || '',
                serviceType: initialData.serviceType || 'Proyecto',
                clientId: initialData.linkedClientId || undefined,
                quoteNumber: initialData.quoteNumber, // Load Global ID

                // Spread params (description, counts, costs, etc)
                ...params,

                // Ensure Arrays / Objects are safe
                techStack: Array.isArray(params?.techStack) ? params.techStack : [],
                roles: { ...prev.roles, ...(params?.roles || {}) },
                staffingDetails: params?.staffingDetails || prev.staffingDetails,
                // Ensure Explicit Profile Array from snapshot if needed? 
                // Using params.staffingDetails should be enough as it comes from JSON.
                sustainDetails: params?.sustainDetails || prev.sustainDetails,
                clientContact: params?.clientContact || prev.clientContact,
            }))

            // Set Wizard Step based on type
            if (initialData.serviceType === 'Sustain') setWizardStep(1)
            else if (initialData.serviceType === 'Staffing') setWizardStep(1)
            else setWizardStep(1) // Project forms usually step 1

            // Attempt to restore diagram code if saved
            const savedDiagram = initialData.diagramDefinition || params?.diagramCode
            if (savedDiagram) {
                setChartCode(savedDiagram)
            } else {
                setChartCode(DEFAULT_DIAGRAM)
            }

        } else {
            setState(JSON.parse(JSON.stringify(INITIAL_STATE)))
            setChartCode(DEFAULT_DIAGRAM)
            setWizardStep(0)
        }
    }, [initialData])

    const handleStepSelection = (type: 'Proyecto' | 'Staffing' | 'Sustain') => {
        updateState('serviceType', type)
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
        if (readOnly) return // BLOCK EDITING
        setState(prev => ({ ...prev, [key]: val }))
    }

    const updateRole = (role: RoleKey, delta: number) => {
        if (readOnly) return // BLOCK EDITING
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

    // updateCriticitness REMOVED

    const toggleTech = (id: string) => {
        if (readOnly) return // BLOCK EDITING
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
    // criticitnessScore and criticitnessLevel REMOVED

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

    const handleApplyRecommendations = () => {
        pendingRecs.forEach(r => {
            const roleKey = r.role as RoleKey
            const roleName = ROLE_CONFIG[roleKey]?.label || roleKey
            const level = r.seniority
            // Get price from dbRates or fallback
            // Use service name for lookup (fix from previous step)
            const rateObj = dbRates.find(rate => rate.service.toLowerCase() === roleName.toLowerCase() && rate.complexity === level)
            const price = rateObj ? rateObj.basePrice : 4000

            setState(prev => {
                const existing = prev.staffingDetails.profiles.find(p => p.role === roleName && p.seniority === level)
                if (existing) {
                    const newProfiles = prev.staffingDetails.profiles.map(p =>
                        (p.role === roleName && p.seniority === level) ? { ...p, count: p.count + 1 } : p
                    )
                    return {
                        ...prev,
                        roles: { ...prev.roles, [roleKey]: (prev.roles[roleKey] || 0) + 1 },
                        staffingDetails: { ...prev.staffingDetails, profiles: newProfiles }
                    }
                } else {
                    const newProfile = {
                        id: crypto.randomUUID(),
                        role: roleName,
                        seniority: level,
                        count: 1,
                        price: price,
                        skills: r.rationale,
                        startDate: new Date().toISOString(),
                        endDate: new Date().toISOString()
                    }
                    return {
                        ...prev,
                        roles: { ...prev.roles, [roleKey]: (prev.roles[roleKey] || 0) + 1 },
                        staffingDetails: { ...prev.staffingDetails, profiles: [...prev.staffingDetails.profiles, newProfile] }
                    }
                }
            })
        })
        toast.success("Sugerencias aplicadas al equipo.")
        setIsSuggestionModalOpen(false)
        setPendingRecs([])
    }

    const handleAiPolish = async () => {
        if (!state.description || readOnly) return
        setPolishLoading(true)
        // Simulate AI delay
        await new Promise(r => setTimeout(r, 1500))
        updateState('description',
            `PROYECTO: ${state.clientName || 'Empresa'}\n\nOBJETIVO ESTRATÉGICO:\n${state.description}\n\nARQUITECTURA PROPUESTA:\nImplementaciÃ³n de un ecosistema de datos moderno basado en ${state.techStack.join(', ') || 'Azure/AWS'}. Se diseñarán ${state.pipelinesCount} pipelines de ingesta resilientes y se desplegarán ${state.dashboardsCount + state.reportsCount} activos de visualización para soportar la toma de decisiones.\n\nALCANCE:\n- Ingesta: ${state.updateFrequency} (${state.manualProcessPct}% manual actual)\n- Consumo: ${state.reportUsers} usuarios finales`)
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


    const { totalMonthlyCost, l2SupportCost, riskCost, totalWithRisk, servicesCost, rolesCost, discountAmount, grossTotal, retentionAmount, finalTotal } = useMemo(() => {
        // --- 1. Calculate Roles Cost ---
        let baseRoles = 0

        // Helper: Get best available rate
        const getRate = (role: string, level: string = 'Ssr') => {
            // FROZEN CHECK
            if (readOnly && frozenRates) {
                const key = `${role}_${level}`
                if (frozenRates.has(key)) return frozenRates.get(key)!
            }

            // Mapping internal keys to DB Service Names
            const roleMap: Record<string, string> = {
                'data_engineer': 'Data Engineer',
                'data_analyst': 'Data Analyst',
                'data_science': 'Data Science',
                'bi_developer': 'BI Developer',
                'project_manager': 'Project Manager & Product MGR',
                'qa_automation': 'QA Automation',
                'arquitecto': 'Data Architect',
                'power_apps': 'Power Apps / Power Automate',
                'react_dev': 'React Dev',
                'power_automate': 'Power Apps / Power Automate',
                'bi_visualization': 'BI Visualization Developer',
                'azure_developer': 'Azure Developer',
                'data_architect': 'Data Architect',
                'bi_data_scientist': 'BI Data Scientist',
                'operations_analyst': 'Operations Analyst',
                'bi_visualization_developer': 'BI Visualization Developer'
            }

            const dbRoleName = roleMap[role.toLowerCase()] || role

            // 1. Try Dynamic
            const dyn = findDynamicRate(dbRoleName, level)
            if (dyn !== null) return dyn

            // 2. Try Fallback Hardcoded (Using ROLE_CONFIG)
            const configEntry = Object.values(ROLE_CONFIG).find(c => role.toLowerCase().includes(c.label.toLowerCase()))
            const base = configEntry ? configEntry.defaultPrice : 4000

            // Apply Manual Logic Multipliers if using Fallback
            let mod = 1.0
            if (level === 'Jr') mod = 0.7
            if (level === 'Sr') mod = 1.3
            if (level === 'Expert' || level === 'Lead') mod = 1.5

            return base * mod
        }

        // Calculation: Prioritize Explicit Profiles (New Dynamic Logic)
        if (state.staffingDetails.profiles && state.staffingDetails.profiles.length > 0) {
            state.staffingDetails.profiles.forEach(p => {
                // Use stored snapshot price if available (Exact Price), else calculate
                const cost = p.price !== undefined ? p.price : getRate(p.role, p.seniority)
                const allocation = (p.allocationPercentage ?? 100) / 100
                baseRoles += cost * (p.count || 1) * allocation
            })
        } else {
            // Fallback: Legacy Counters (e.g. old quotes or if empty)
            Object.entries(state.roles).forEach(([roleKey, count]) => {
                if (count > 0) {
                    // Assume Ssr for bulk counters
                    const cost = getRate(roleKey, 'Ssr')
                    baseRoles += cost * count
                }
            })

            // Apply Global Complexity Mod only for Legacy Counters (Project Type)
            // (If using profiles, complexity is inherent in Seniority selection)
            if (state.serviceType === 'Proyecto') {
                const complexityMod = COMPLEXITY_MODIFIERS[state.complexity] || 1.0
                baseRoles *= complexityMod
            }
        }

        // Apply Sustain Modifiers (Support Window coverage applies to total team cost)
        if (state.serviceType === 'Sustain') {
            const hoursMod = HOURS_MODIFIERS[state.sustainDetails.supportWindow as keyof typeof HOURS_MODIFIERS] || 1.0
            baseRoles *= hoursMod
        }


        // --- 2. Calculate Services Cost ---
        let baseServices = 0
        if (state.serviceType !== 'Staffing') {
            // Use findDynamicRate for these abstract units too
            const pipeRate = findDynamicRate('Pipe') || findDynamicRate('Ingesta') || 2500
            const nbRate = findDynamicRate('Dataset') || findDynamicRate('Notebook') || 2000
            const dbRate = findDynamicRate('Dashboard') || 5000
            const dsRate = findDynamicRate('Algoritmo') || findDynamicRate('DS') || 8000

            // Determine source of metrics
            let pCount = state.pipelinesCount
            let nCount = state.notebooksCount
            let dCount = state.dashboardsCount // Currently mapped to dashboardsCount in state
            let dsCount = state.dsModelsCount
            let reportCount = state.reportsCount // Additional metric often used

            if (state.serviceType === 'Sustain') {
                // Map Sustain Specific Inputs
                pCount = state.sustainDetails.metrics.pipelinesCount || 0
                nCount = state.sustainDetails.metrics.notebooksCount || 0
                reportCount = state.sustainDetails.metrics.reportsCount || 0
                dsCount = state.sustainDetails.metrics.dsModelsCount || 0
                // Note: Sustain metrics doesn't explicitly have 'dashboardsCount', it uses 'reportsCount' usually
                dCount = reportCount
            }

            if (pCount > 0) baseServices += pCount * pipeRate
            if (nCount > 0) baseServices += nCount * nbRate
            if (dCount > 0) baseServices += dCount * dbRate
            if (dsCount > 0) baseServices += dsCount * dsRate
        }

        // --- 3. Totals & Overhead ---
        const l2SupportCost = state.serviceType === 'Staffing' ? 0 : (baseRoles + baseServices) * 0.10
        const subTotal = baseRoles + baseServices + l2SupportCost

        // Risk (Criticality) - Sustain Only
        let riskMargin = 0
        if (state.serviceType === 'Sustain') {
            if (sustainLevel.label === 'ALTA') riskMargin = 0.20
            else if (sustainLevel.label === 'MEDIA') riskMargin = 0.10
        }

        const riskVal = subTotal * riskMargin
        const preDiscountTotal = subTotal + riskVal

        // --- 4. Commercial Discount (on Subtotal + Risk) ---
        const discountVal = preDiscountTotal * (state.commercialDiscount / 100)
        const grossTotal = preDiscountTotal - discountVal // "Total Bruto"

        // --- 5. Retention (deducted from Gross Total) ---
        const retentionVal = state.retention.enabled ? grossTotal * (state.retention.percentage / 100) : 0
        const netTotal = grossTotal - retentionVal // "Inversión Neta Final"

        return {
            rolesCost: baseRoles,
            servicesCost: baseServices,
            l2SupportCost,
            riskCost: riskVal,
            totalWithRisk: preDiscountTotal,
            discountAmount: discountVal,
            grossTotal,
            retentionAmount: retentionVal,
            finalTotal: netTotal, // Renaming used variable to match semantic "Final to Pay"
            totalMonthlyCost: netTotal
        }
    }, [state, dbRates, findDynamicRate, sustainLevel, readOnly, frozenRates])

    const durationInMonths = getDurationInMonths()
    const totalProjectCost = finalTotal * durationInMonths

    // Flash effect when Net Total changes
    useEffect(() => {
        if (state.retention.enabled) {
            setIsNetTotalFlashing(true)
            const t = setTimeout(() => setIsNetTotalFlashing(false), 500)
            return () => clearTimeout(t)
        }
    }, [finalTotal, state.retention.enabled])




    // --- Save Quote ---
    // Refactored to support Partial Saves (Dependencies)


    const handleSaveQuote = (redirect: boolean = true) => {
        return performSave({ redirect, validate: true })
    }

    const performSave = async ({ redirect = true, validate = true }: { redirect?: boolean, validate?: boolean }) => {
        if (validate && !state.clientName) {
            alert("Por favor ingrese un nombre de cliente.")
            return
        }
        setIsSaving(true)
        let diagramDataUrl: string | undefined = undefined

        try {
            // 1. Capture Diagram (Mandatory Goal: All service types)
            try {
                const element = document.getElementById('diagram-capture-target')
                if (element) {
                    // Wait for Mermaid to render nodes fully
                    await new Promise(resolve => setTimeout(resolve, 1200))

                    const canvas = await html2canvas(element, {
                        backgroundColor: '#ffffff',
                        scale: 3,
                        useCORS: true,
                        logging: false,
                        onclone: (clonedDoc) => {
                            const clonedEl = clonedDoc.getElementById('diagram-capture-target')
                            if (clonedEl) {
                                // Force Hex to avoid Tailwind 4 'lab' color crash
                                clonedEl.style.backgroundColor = '#ffffff'
                                clonedEl.style.borderColor = '#CFDBD5'
                            }
                        }
                    })
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

            // 2. Prepare PDF Data (Deferred Generation strategy for New Quotes)
            const exchangeRate = exchangeRates[currency] || 1.0

            // Helper to generate PDF Base64
            const generateSnapshot = async (idOverride?: number) => {
                const logoB64 = state.clientLogoUrl ? await imageUrlToBase64(state.clientLogoUrl) : undefined
                const pdfBlob = await generatePDFBlob({
                    ...state,
                    totalMonthlyCost: totalMonthlyCostVal,
                    l2SupportCost: l2SupportCostVal,
                    riskCost: riskCostVal,
                    totalWithRisk: totalWithRiskVal,
                    criticitnessLevel: { label: state.serviceType === 'Sustain' ? sustainLevel.label : 'N/A', margin: 0 },
                    diagramImage: diagramDataUrl,
                    serviceType: state.serviceType,
                    commercialDiscount: state.commercialDiscount,
                    discountAmount: discountAmountVal,
                    finalTotal: finalTotalUSD,
                    currency: currency,
                    exchangeRate: exchangeRate,
                    durationMonths: getDurationInMonths(),
                    clientLogoBase64: logoB64,
                    quoteNumber: idOverride || state.quoteNumber || initialData?.quoteNumber // Use Global ID
                })

                return new Promise<string>((resolve) => {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                        const res = (reader.result as string || "")
                        const clean = res.includes(',') ? res.split(',')[1] : res
                        resolve(clean)
                    }
                    reader.readAsDataURL(pdfBlob)
                })
            }

            // If we have an ID (Update), generate snapshot immediately
            let pdfBase64 = ""
            if (state.quoteNumber || initialData?.quoteNumber) {
                try {
                    pdfBase64 = await generateSnapshot()
                } catch (e) {
                    console.error("PDF Snapshot generation failed:", e)
                }
            }

            // 3. Save to DB (Create or Update)
            let result;
            const payload = {
                clientName: state.clientName || (validate ? '' : 'Borrador (Sin Cliente)'), // FALLBACK FOR PARTIAL SAVE
                projectType: state.complexity,
                serviceType: state.serviceType,
                status: 'BORRADOR', // FORCE STATUS TO BORRADOR ON SAVE (Actions will use this for Create)
                params: {
                    projectDescription: state.description,
                    updateFrequency: state.updateFrequency === 'realtime' ? 'realtime' : 'daily',
                    usersCount: state.usersCount,
                    pipelinesCount: state.pipelinesCount,
                    databricksUsage: state.techStack.includes('databricks') ? 'high' : 'none',
                    criticality: 'low',
                    dataVolume: 'GB',
                    sourceSystemsCount: 1,
                    securityCompliance: 'standard',
                    reportComplexity: 'medium',
                    aiFeatures: state.dsModelsCount > 0,
                } as any,
                breakdown: {
                    roles: (state.serviceType === 'Staffing'
                        ? state.staffingDetails.profiles.map(p => ({ role: p.role, count: p.count, cost: p.price || 0, seniority: p.seniority, skills: p.skills, hours: 0 }))
                        : Object.entries(state.roles).map(([r, c]) => ({ role: r, count: c, cost: 0, hours: 0 }))) as any[],
                    totalMonthlyCost: totalMonthlyCostVal,
                    diagramCode: chartCode,
                    grossTotal: totalMonthlyCostVal,
                    discountAmount: discountAmountVal,
                    finalTotal: finalTotalUSD
                },
                estimatedCost: convert(finalTotalUSD),
                technicalParameters: JSON.stringify({
                    ...state,
                    grossTotal: totalMonthlyCostVal,
                    discountAmount: discountAmountVal,
                    finalTotal: finalTotalUSD,
                    currency: currency,
                    exchangeRate: exchangeRate,
                    originalUSDAmount: finalTotalUSD,
                    quoteNumber: state.quoteNumber || initialData?.quoteNumber // Persist standard
                }),
                clientId: state.clientId,
                isNewClient: state.isNewClient,
                clientData: state.newClientData ? {
                    name: state.newClientData.companyName,
                    contact: state.newClientData.contactName || '',
                    email: state.newClientData.email || ''
                } : undefined,
                pdfBase64: pdfBase64 || undefined // PASSING THE SNAPSHOT
            }

            if (initialData && initialData.id) {
                // UPDATE
                result = await updateQuote(initialData.id, payload)
                if (validate) toast.success("Cotización actualizada correctamente")
            } else {
                // CREATE
                result = await saveQuote(payload)
            }

            // 4. Post-Save Logic (For New Quotes: Generate PDF with new ID)
            if (result.success && result.quote && !pdfBase64) {
                try {
                    const newId = result.quote.quoteNumber
                    // Generate PDF with the assigned ID
                    pdfBase64 = await generateSnapshot(newId)

                    // Update the DB record with this snapshot
                    // We reuse the payload but update pdfBase64
                    await updateQuote(result.quote.id, { ...payload, pdfBase64: pdfBase64 })

                } catch (e) {
                    console.error("Post-save PDF generation failed:", e)
                }
            }

            if (!result.success || !result.quote) throw new Error(result.error || "Error desconocido al guardar")

            // 4. Webhook Handling (Use existing PDF)
            if (pdfBase64) {
                const filename = `cotizacion_${(state.clientName || 'draft').replace(/\s+/g, '_')}.pdf`
                try {
                    await sendQuoteToN8N(
                        result.quote,
                        pdfBase64,
                        filename,
                        result.userEmail,
                        result.userName,
                        currency,
                        exchangeRate,
                        finalTotalUSD
                    );
                } catch (whErr) {
                    console.error("Webhook fail", whErr)
                }
            }

            // Update local state to show the new ID immediately
            if (result.quote && result.quote.quoteNumber) {
                updateState('quoteNumber', result.quote.quoteNumber)
            }

            // Only show main toast if validating (Full Save)
            if (validate) toast.success(redirect ? "Cotización guardada exitosamente." : "Cambios guardados correctamente.")

            // Only redirect if requested (Full Save typically)
            if (redirect) {
                // Redirect to Dashboard (Mis Cotizaciones) after 1s delay
                setTimeout(() => {
                    router.push('/dashboard')
                }, 1000)
            }

        } catch (e: any) {
            console.error("Failed to save quote (DB Error):", e)
            toast.error(`Error al guardar: ${e.message}`)
            throw e // Re-throw for caller handling
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
            roles: Object.keys(ROLE_CONFIG).reduce((acc, key) => ({ ...acc, [key]: 0 }), {} as Record<RoleKey, number>),
            dataSourcesCount: 0,
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
            // criticitness REMOVED
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
                    dashboardsCount: 0,
                    dsModelsCount: 0,
                    dataSourcesCount: 0,
                    automationLevel: 0,
                    manualProcess: false,
                    systemDependencies: '',
                    updateFrequency: 'daily'
                },
                businessOwner: '',
                devHours: 0,
                incidentRate: 0,
                supportWindow: '9x5',
                criticalHours: '',
                criticalDays: '',
                updateDuration: '',
                updateSchedule: '',
                secondaryUpdateSchedule: '',
                weekendUsage: false,
                weekendDays: [],
                weekendSupportHours: '',
                hypercarePeriod: '30_days',
                criticalityMatrix: {
                    impactOperative: 1,
                    impactFinancial: 1,
                    userCoverage: 1,
                    countryCoverage: 1,
                    technicalMaturity: 1,
                    dependencies: 1,
                    frequencyOfUse: 'daily',
                    hasCriticalDates: false,
                    criticalDatesDescription: '',
                    marketsImpacted: 1,
                    usersImpacted: 1
                }
            },
            commercialDiscount: 0,
            retention: { enabled: false, percentage: 0 },
            clientContact: { name: '', role: '', email: '', areaLeader: '' }
        })
        setChartCode('graph LR\n  Start --> End') // Reset Diagram
    }

    const imageUrlToBase64 = async (url: string): Promise<string> => {
        try {
            const response = await fetch(url)
            const blob = await response.blob()
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
            })
        } catch (e) {
            console.error("Error converting image to base64:", e)
            return ""
        }
    }

    const handleExport = async (type: 'pdf' | 'word') => {
        setIsExporting(true)
        setExportType(type)
        try {
            let diagramDataUrl = undefined
            // Capture diagram (Mandatory: All services)
            const element = document.getElementById('diagram-capture-target')
            if (element) {
                // Critical Wait for Mermaid Render (Ensuring all nodes are present)
                await new Promise(resolve => setTimeout(resolve, 1500))

                try {
                    const canvas = await html2canvas(element, {
                        backgroundColor: '#ffffff',
                        scale: 3,
                        useCORS: true,
                        logging: false,
                        onclone: (clonedDoc) => {
                            const clonedEl = clonedDoc.getElementById('diagram-capture-target')
                            if (clonedEl) {
                                // Force Hex to avoid Tailwind 4 'lab' color crash
                                clonedEl.style.backgroundColor = '#ffffff'
                                clonedEl.style.borderColor = '#CFDBD5'
                            }
                        }
                    })
                    diagramDataUrl = canvas.toDataURL('image/png')
                } catch (err) {
                    console.warn("Diagram capture failed (likely CSS lab() mismatch), proceeding without image.", err);
                }
            }

            // Capture Client Logo to Base64 (CORS Handling)
            let clientLogoBase64 = undefined
            if (state.clientLogoUrl) {
                clientLogoBase64 = await imageUrlToBase64(state.clientLogoUrl)
            }

            if (type === 'pdf') {
                await exportToPDF({
                    ...state,
                    totalMonthlyCost,
                    l2SupportCost,
                    riskCost,
                    totalWithRisk,
                    criticitnessLevel: { label: state.serviceType === 'Sustain' ? sustainLevel.label : 'N/A', margin: 0 },
                    diagramImage: diagramDataUrl,
                    serviceType: state.serviceType,
                    commercialDiscount: state.commercialDiscount,
                    discountAmount,
                    grossTotal,
                    retentionAmount,
                    finalTotal,
                    durationMonths: getDurationInMonths(),
                    clientLogoBase64,
                    viewMode,
                    currency, // Passed correctly
                    exchangeRate: exchangeRates[currency] || 1.0
                })
            } else {
                await exportToWord({
                    ...state,
                    totalMonthlyCost,
                    l2SupportCost,
                    riskCost,
                    totalWithRisk,
                    criticitnessLevel: { label: state.serviceType === 'Sustain' ? sustainLevel.label : 'N/A', margin: 0 },
                    diagramImage: diagramDataUrl,
                    serviceType: state.serviceType,
                    commercialDiscount: state.commercialDiscount,
                    discountAmount,
                    grossTotal,
                    retentionAmount,
                    finalTotal,
                    durationMonths: getDurationInMonths(),
                    clientLogoBase64: clientLogoBase64,
                    viewMode,
                    currency,
                    exchangeRate: exchangeRates[currency] || 1.0
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
        // Unified Diagram Logic - Runs on any state change to ensure immediate feedback
        if (manualDiagramCode !== null) return

        // 1. SUSTAIN LOGIC
        if (state.serviceType === 'Sustain') {
            const stack = state.sustainDetails?.techStack || []
            const code = generateSustainDiagram(Array.isArray(stack) ? stack : [])
            setChartCode(code)
            return
        }

        // 2. PROJECT / STAFFING LOGIC (Generic)
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

    // --- Manual Process & Dependencies Logic ---
    const [isDependencySaving, setIsDependencySaving] = useState(false)
    const [dependencyInput, setDependencyInput] = useState("") // New local state for tag input

    // Helper to persist dependencies (tags)
    const persistDependencies = async (newDependencies: string) => {
        setIsDependencySaving(true)
        updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, systemDependencies: newDependencies } })

        // Save to DB immediately (Partial Save)
        try {
            await performSave({
                redirect: false,
                validate: false // Bypass validation
            })
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar dependencias")
        } finally {
            setIsDependencySaving(false)
        }
    }

    const handleAddDependency = async () => {
        if (!dependencyInput.trim()) return

        const currentDeps = state.sustainDetails.metrics.systemDependencies ? state.sustainDetails.metrics.systemDependencies.split(',').map(d => d.trim()).filter(Boolean) : []
        const newDeps = [...currentDeps, dependencyInput.trim()]
        const newDepsString = newDeps.join(',')

        setDependencyInput("") // Clear input
        await persistDependencies(newDepsString)
        toast.success("Dependencia añadida")
    }

    const handleRemoveDependency = async (indexToRemove: number) => {
        const currentDeps = state.sustainDetails.metrics.systemDependencies ? state.sustainDetails.metrics.systemDependencies.split(',').map(d => d.trim()).filter(Boolean) : []
        const newDeps = currentDeps.filter((_, idx) => idx !== indexToRemove)
        const newDepsString = newDeps.join(',')

        await persistDependencies(newDepsString)
        toast.success("Dependencia eliminada")
    }

    // Intelligent Logic for Sustain (Auto-Staffing)
    useEffect(() => {
        if (state.serviceType === 'Sustain') {
            const { pipelinesCount, notebooksCount, dsModelsCount } = state.sustainDetails.metrics

            // Heuristic: If complex (>10 pipelines or >10 notebooks or >5 models), suggest Data Engineer
            if (pipelinesCount > 10 || notebooksCount > 10 || dsModelsCount > 5) {
                const hasDataEngineer = state.staffingDetails.profiles.some(p => p.role === 'Data Engineer')

                if (!hasDataEngineer) {
                    // Find Data Engineer config
                    const deConfigEntry = Object.entries(ROLE_CONFIG).find(([k, v]) => v.label === 'Data Engineer')
                    if (deConfigEntry) {
                        const [roleKey, config] = deConfigEntry
                        const basePrice = config.defaultPrice

                        const newProfile = {
                            id: crypto.randomUUID(),
                            role: 'Data Engineer',
                            seniority: 'SSR',
                            qty: 1,
                            count: 1,
                            hours: 160,
                            price: basePrice,
                            skills: 'Python, SQL, Spark',
                            startDate: new Date().toISOString().split('T')[0],
                            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
                            allocationPercentage: 100
                        }

                        // Use functional update to avoid dependency loops, but be careful with 'state' dependency
                        // actually we can't easily use functional update if we need 'state' props inside.
                        // But since we are inside useEffect depending on metrics, we should be fine calling setState.
                        setState(prev => ({
                            ...prev,
                            staffingDetails: {
                                ...prev.staffingDetails,
                                profiles: [...prev.staffingDetails.profiles, newProfile]
                            }
                        }))

                        toast.success("Sugerencia: Se agregó un Data Engineer por volumen de datos.")
                    }
                }
            }

            // Heuristic: Dev Hours Suggestion
            const suggestedHours = (pipelinesCount * 2) + (notebooksCount * 1) + (dsModelsCount * 4)
            if (suggestedHours > 0 && suggestedHours > state.sustainDetails.devHours) {
                setState(prev => ({
                    ...prev,
                    sustainDetails: {
                        ...prev.sustainDetails,
                        devHours: suggestedHours
                    }
                }))
                // Debounce toast or just show it (might be too spammy if typing numbers, but OK for now)
                // toast.info(`Se an actualiza las horas de desarrollo sugeridas a ${suggestedHours}hs basedo en volumetría.`) 
            }
        }
    }, [state.serviceType, state.sustainDetails.metrics.pipelinesCount, state.sustainDetails.metrics.notebooksCount, state.sustainDetails.metrics.dsModelsCount])

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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl w-full">
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
            className="flex flex-col lg:flex-row h-screen overflow-hidden bg-[#333533] font-sans pt-28 lg:pt-36 relative"
        >
            {/* ADMIN READ-ONLY BANNER */}
            {readOnly && (
                <div className="absolute top-0 left-0 w-full bg-amber-500/20 border-b border-amber-500/50 p-2 text-amber-400 text-center font-bold text-xs uppercase tracking-widest z-50 backdrop-blur-md flex items-center justify-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    VISTA DE ADMINISTRADOR (SOLO LECTURA) - PRECIOS CONGELADOS
                </div>
            )}

            {/* ================= LEFT COLUMN: FORM SCROLL ================= */}
            <div className="w-full lg:w-2/3 h-full overflow-y-auto scrollbar-custom px-4 sm:px-6 lg:px-16 py-8">
                <div className="space-y-12 max-w-4xl mx-auto pb-32">

                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" className="text-[#CFDBD5] hover:text-[#E8EDDF]" onClick={() => setWizardStep(0)}>
                            <ArrowRight className="w-6 h-6 rotate-180" />
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-2xl md:text-3xl lg:text-5xl font-black text-[#E8EDDF] tracking-tighter mb-1">
                                {state.serviceType === 'Staffing' ? 'Levantamiento de Perfiles' :
                                    state.serviceType === 'Sustain' ? 'Levantamiento de Servicio' :
                                        'Arquitectura de Proyecto'}
                            </h1>
                            <p className="text-[#F5CB5C] font-bold text-lg uppercase tracking-widest">{state.serviceType}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-[#CFDBD5] uppercase tracking-wider mb-1">ID Cotización</div>
                            <div className="text-3xl font-bold text-[#F5CB5C] font-mono tracking-widest">
                                {state.quoteNumber ? state.quoteNumber.toString().padStart(6, '0') : '[PENDIENTE]'}
                            </div>
                        </div>
                    </div>

                    {/* 1. GENERAL */}
                    <SectionCard number={getSectionNumber('general')} title="Información General" icon={ClipboardList}>
                        <div className="space-y-8">
                            <div>
                                <Label className="text-[#CFDBD5] text-sm font-bold uppercase tracking-wider mb-2 block">Cliente / Prospecto</Label>
                                <ClientSelector
                                    value={state.clientId}
                                    contactValue={state.contactId}
                                    clientName={state.clientName}
                                    onClientSelect={(client, contactId) => {
                                        // Find Contact Data if selected
                                        const selectedContact = contactId && client.contacts
                                            ? client.contacts.find(c => c.id === contactId)
                                            : null

                                        // Update basics
                                        let newState = {
                                            clientName: client.companyName,
                                            clientId: client.id,
                                            contactId: contactId,
                                            newClientData: client,
                                            clientLogoUrl: client.clientLogoUrl,
                                            isNewClient: false
                                        } as any

                                        // Update contact details if a contact is selected
                                        if (selectedContact) {
                                            newState.clientContact = {
                                                ...state.clientContact,
                                                name: selectedContact.name,
                                                email: selectedContact.email || state.clientContact.email,
                                                role: selectedContact.role || state.clientContact.role
                                            }
                                        } else if (client.contacts && client.contacts.length > 0) {
                                            // Auto-select first contact if none selected but contacts exist
                                            const first = client.contacts[0]
                                            newState.contactId = first.id
                                            newState.clientContact = {
                                                ...state.clientContact,
                                                name: first.name,
                                                email: first.email || '',
                                                role: first.role || ''
                                            }
                                        }

                                        setState(prev => ({
                                            ...prev,
                                            ...newState
                                        }))
                                    }}
                                />

                                {/* Contact Selector - Shows only if client has contacts */}
                                {state.newClientData?.contacts && state.newClientData.contacts.length > 0 && (
                                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider mb-2 block">Contacto Seleccionado</Label>
                                        <Select
                                            value={state.contactId || undefined}
                                            onValueChange={(val) => {
                                                const contact = state.newClientData?.contacts?.find((c: any) => c.id === val)
                                                if (contact) {
                                                    setState(prev => ({
                                                        ...prev,
                                                        contactId: val,
                                                        clientContact: {
                                                            ...prev.clientContact,
                                                            name: contact.name,
                                                            email: contact.email || '',
                                                            role: contact.role || ''
                                                        }
                                                    }))
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="w-full bg-[#1E1E1E] border-[#333533] text-[#E8EDDF] h-12 rounded-xl focus:ring-[#F5CB5C]">
                                                <SelectValue placeholder="Seleccionar contacto..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#242423] border-[#333533] text-[#E8EDDF]">
                                                {state.newClientData.contacts.map((contact: any) => (
                                                    <SelectItem key={contact.id} value={contact.id} className="focus:bg-[#333533] focus:text-[#F5CB5C] py-3">
                                                        <div className="flex flex-col text-left">
                                                            <span className="font-bold text-sm">{contact.name}</span>
                                                            {contact.role && <span className="text-xs text-[#CFDBD5]/60">{contact.role}</span>}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label className="text-[#CFDBD5] text-sm font-bold uppercase tracking-wider mb-2 block">Duración del Proyecto</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={state.durationValue}
                                            onChange={(e) => updateState('durationValue', parseFloat(e.target.value) || 0)}
                                            className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] text-center font-bold"
                                        />
                                        <Select
                                            value={state.durationUnit}
                                            onValueChange={(val: any) => updateState('durationUnit', val)}
                                        >
                                            <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] w-[140px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                <SelectItem value="days">Días</SelectItem>
                                                <SelectItem value="weeks">Semanas</SelectItem>
                                                <SelectItem value="months">Meses</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-[#CFDBD5] text-sm font-bold uppercase tracking-wider mb-2 block">Complejidad Estimada</Label>
                                    <ToggleGroup
                                        type="single"
                                        value={state.complexity}
                                        onValueChange={(val: any) => val && updateState('complexity', val)}
                                        className="justify-start bg-[#242423] p-1 rounded-xl border border-[#4A4D4A]"
                                    >
                                        <ToggleGroupItem value="low" className="flex-1 data-[state=on]:bg-[#F5CB5C] data-[state=on]:text-[#242423] text-[#CFDBD5] text-xs font-bold transition-all rounded-lg">BAJA</ToggleGroupItem>
                                        <ToggleGroupItem value="medium" className="flex-1 data-[state=on]:bg-[#F5CB5C] data-[state=on]:text-[#242423] text-[#CFDBD5] text-xs font-bold transition-all rounded-lg">MEDIA</ToggleGroupItem>
                                        <ToggleGroupItem value="high" className="flex-1 data-[state=on]:bg-[#F5CB5C] data-[state=on]:text-[#242423] text-[#CFDBD5] text-xs font-bold transition-all rounded-lg">ALTA</ToggleGroupItem>
                                    </ToggleGroup>
                                </div>
                            </div>

                            <div>
                                <Label className="text-[#CFDBD5] text-sm font-bold uppercase tracking-wider mb-2 block">
                                    {state.serviceType === 'Staffing' ? 'Contexto de la Búsqueda' : 'Descripción y Objetivo'}
                                </Label>
                                <div className="relative group/textarea">
                                    <Textarea
                                        value={state.description}
                                        onChange={(e) => updateState('description', e.target.value)}
                                        placeholder={state.serviceType === 'Staffing' ? "Descripción del equipo actual, cultura, y por qué se necesitan estos perfiles..." : "Describe el desafío de negocio..."}
                                        className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] min-h-[160px] focus-visible:ring-[#F5CB5C] rounded-2xl p-4 leading-relaxed pb-12 resize-none"
                                    />
                                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                        <Button
                                            onClick={handleAiPolish}
                                            disabled={polishLoading || !state.description || readOnly}
                                            size="sm"
                                            className="h-8 bg-[#171717] hover:bg-[#242423] text-[#F5CB5C] border border-[#F5CB5C]/30 rounded-lg font-bold transition-all px-3"
                                        >
                                            {polishLoading ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                                            ) : (
                                                <Sparkles className="w-3.5 h-3.5 mr-2" />
                                            )}
                                            {polishLoading ? 'Puliendo...' : 'Pulir texto de descripción de proyecto con IA'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* 2. TECH (Reordered to Step 02 for Staffing) */}
                    {state.serviceType !== 'Sustain' && (
                        <SectionCard number={getSectionNumber('tech')} title="Stack Tecnológico" icon={Layers}>
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

                    {/* SUSTAIN SCORECARD */}
                    {state.serviceType === 'Sustain' && (
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
                                            <div className="mb-12">
                                                <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Nombre Solución / Producto</Label>
                                                <Input
                                                    value={state.sustainDetails.solutionName}
                                                    onChange={e => updateState('sustainDetails', { ...state.sustainDetails, solutionName: e.target.value })}
                                                    className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"
                                                    placeholder="Ej. Data Lake Comercial"
                                                />
                                            </div>
                                            <div className="mb-12">
                                                <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Descripción Funcional</Label>
                                                <Textarea
                                                    value={state.sustainDetails.technicalDescription}
                                                    onChange={e => updateState('sustainDetails', { ...state.sustainDetails, technicalDescription: e.target.value })}
                                                    className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] min-h-[100px] w-full"
                                                    placeholder="Describe qué hace la solución, usuarios clave y flujo de datos..."
                                                />
                                            </div>

                                            {/* Tech Stack Multi-Select */}
                                            <div className="mb-12">
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

                                            {/* Metrics Grid - FIXED VOLUMETRICS */}
                                            <div>
                                                <Label className="text-[#CFDBD5] mb-3 block text-xs uppercase font-bold">Métricas Volumetría (Mensual)</Label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-8 items-start">
                                                    <div className="space-y-0 text-left">
                                                        <Label className="text-[#7C7F7C] text-[10px] uppercase block mb-2">Nº Pipelines</Label>
                                                        <Input type="number" className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-10 w-full"
                                                            value={state.sustainDetails.metrics.pipelinesCount} onChange={e => updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, pipelinesCount: parseInt(e.target.value) || 0 } })} />
                                                    </div>
                                                    <div className="space-y-0 text-left">
                                                        <Label className="text-[#7C7F7C] text-[10px] uppercase block mb-2">Nº Fuentes Datos</Label>
                                                        <Input type="number" className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-10 w-full"
                                                            value={state.sustainDetails.metrics.dataSourcesCount} onChange={e => updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, dataSourcesCount: parseInt(e.target.value) || 0 } })} />
                                                    </div>
                                                    <div className="space-y-0 text-left">
                                                        <Label className="text-[#7C7F7C] text-[10px] uppercase block mb-2">Nº Notebooks</Label>
                                                        <Input type="number" className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-10 w-full"
                                                            value={state.sustainDetails.metrics.notebooksCount} onChange={e => updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, notebooksCount: parseInt(e.target.value) || 0 } })} />
                                                    </div>
                                                    <div className="space-y-0 text-left">
                                                        <Label className="text-[#7C7F7C] text-[10px] uppercase block mb-2">Nº Dashboards</Label>
                                                        <Input type="number" className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-10 w-full"
                                                            value={state.sustainDetails.metrics.dashboardsCount} onChange={e => updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, dashboardsCount: parseInt(e.target.value) || 0 } })} />
                                                    </div>
                                                    <div className="space-y-0 text-left">
                                                        <Label className="text-[#7C7F7C] text-[10px] uppercase block mb-2">Nº Modelos DS</Label>
                                                        <Input type="number" className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-10 w-full"
                                                            value={state.sustainDetails.metrics.dsModelsCount} onChange={e => updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, dsModelsCount: parseInt(e.target.value) || 0 } })} />
                                                    </div>
                                                    <div className="space-y-0 text-left">
                                                        <Label className="text-[#7C7F7C] text-[10px] uppercase block mb-2">¿Procesos Manuales?</Label>
                                                        <ToggleGroup
                                                            type="single"
                                                            value={state.sustainDetails.metrics.manualProcess ? 'yes' : 'no'}
                                                            onValueChange={(val) => {
                                                                if (val) updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, manualProcess: val === 'yes' } })
                                                            }}
                                                            className="justify-start gap-0 h-10"
                                                        >
                                                            <ToggleGroupItem
                                                                value="yes"
                                                                className="w-20 rounded-l-lg rounded-r-none border border-r-0 border-[#4A4D4A] data-[state=on]:bg-yellow-500 data-[state=on]:text-black data-[state=off]:bg-transparent data-[state=off]:text-[#CFDBD5] data-[state=off]:hover:bg-[#333533] h-10 transition-all font-bold text-xs"
                                                            >
                                                                SÍ
                                                            </ToggleGroupItem>
                                                            <ToggleGroupItem
                                                                value="no"
                                                                className="w-20 rounded-r-lg rounded-l-none border border-l-0 border-[#4A4D4A] data-[state=on]:bg-yellow-500 data-[state=on]:text-black data-[state=off]:bg-transparent data-[state=off]:text-[#CFDBD5] data-[state=off]:hover:bg-[#333533] h-10 transition-all font-bold text-xs"
                                                            >
                                                                NO
                                                            </ToggleGroupItem>
                                                        </ToggleGroup>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 relative space-y-0 text-left mt-8">
                                                    <Label className="text-[#7C7F7C] text-[10px] uppercase flex justify-between items-center mb-2">
                                                        Dependencias Externas
                                                    </Label>

                                                    <div className="flex gap-4 items-start">
                                                        {/* Left: Input + Add Button */}
                                                        <div className="w-1/2 flex gap-2">
                                                            <Input
                                                                className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] h-10 flex-1 focus:border-[#F5CB5C] transition-colors"
                                                                placeholder="Ej. API Salesforce"
                                                                value={dependencyInput}
                                                                onChange={(e) => setDependencyInput(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault()
                                                                        handleAddDependency()
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                size="sm"
                                                                onClick={handleAddDependency}
                                                                className="bg-[#F5CB5C] text-[#242423] hover:bg-[#F5CB5C]/90 text-xs h-10 px-3 font-bold uppercase tracking-wider rounded-lg"
                                                                disabled={isDependencySaving}
                                                            >
                                                                {isDependencySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Añadir"}
                                                            </Button>
                                                        </div>

                                                        {/* Right: Tags Display */}
                                                        <div className="w-1/2 flex flex-wrap gap-2 content-start min-h-[40px]">
                                                            {state.sustainDetails.metrics.systemDependencies && state.sustainDetails.metrics.systemDependencies.split(',').filter(d => d.trim()).map((dep, idx) => (
                                                                <div key={idx} className="bg-zinc-800 border border-zinc-700 text-yellow-500 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                                                                    <span>{dep.trim()}</span>
                                                                    <button
                                                                        onClick={() => handleRemoveDependency(idx)}
                                                                        className="hover:text-red-400 transition-colors focus:outline-none"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {(!state.sustainDetails.metrics.systemDependencies || !state.sustainDetails.metrics.systemDependencies.trim()) && (
                                                                <span className="text-zinc-600 text-xs italic py-2">Sin dependencias registradas</span>
                                                            )}
                                                        </div>
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
                                                    className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF] focus:border-[#F5CB5C]"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Duración Proceso</Label>
                                                <div className="relative">
                                                    <Input
                                                        value={state.sustainDetails.updateDuration}
                                                        onChange={e => updateState('sustainDetails', { ...state.sustainDetails, updateDuration: e.target.value })}
                                                        placeholder="Ej. 2 horas"
                                                        className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF] pr-12 focus:border-[#F5CB5C]"
                                                    />
                                                    <span className="absolute right-3 top-2.5 text-[#7C7F7C] text-xs">min/hs</span>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Frecuencia Actualización Datos</Label>
                                                <Select value={state.sustainDetails.metrics.updateFrequency} onValueChange={v => updateState('sustainDetails', { ...state.sustainDetails, metrics: { ...state.sustainDetails.metrics, updateFrequency: v } })}>
                                                    <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                        <SelectItem value="realtime">Real-time / Streaming</SelectItem>
                                                        <SelectItem value="daily">Diaria</SelectItem>
                                                        <SelectItem value="weekly">Semanal</SelectItem>
                                                        <SelectItem value="monthly">Mensual</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {/* Schedule Inputs - Side by Side */}
                                            <div className="md:col-span-2 flex flex-wrap gap-6 items-end mt-2">
                                                <div className="space-y-2">
                                                    <Label className="text-[#CFDBD5] text-xs uppercase font-bold block">Horario 1</Label>
                                                    <Input
                                                        type="time"
                                                        value={state.sustainDetails.updateSchedule}
                                                        onChange={e => updateState('sustainDetails', { ...state.sustainDetails, updateSchedule: e.target.value })}
                                                        className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF] focus:border-[#F5CB5C] w-[150px] [color-scheme:dark]"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[#CFDBD5] text-xs uppercase font-bold block text-opacity-70">Horario 2</Label>
                                                    <Input
                                                        type="time"
                                                        value={state.sustainDetails.secondaryUpdateSchedule}
                                                        onChange={e => updateState('sustainDetails', { ...state.sustainDetails, secondaryUpdateSchedule: e.target.value })}
                                                        className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF] focus:border-[#F5CB5C] border-dashed w-[150px] [color-scheme:dark]"
                                                    />
                                                </div>
                                            </div>

                                            <div className="col-span-1 md:col-span-2 border-t border-[#4A4D4A] my-2 pt-4">
                                                <Label className="text-[#F5CB5C] mb-4 block text-xs uppercase font-bold tracking-wider">Soporte y Tiempos</Label>
                                            </div>

                                            <div className="flex flex-col gap-3 bg-[#333533] p-4 rounded-xl border border-[#4A4D4A]">
                                                <div className="flex items-center justify-between">
                                                    <Label className={cn(
                                                        "text-xs font-bold transition-colors",
                                                        (state.sustainDetails.weekendDays && state.sustainDetails.weekendDays.length > 0) ? "text-[#F5CB5C]" : "text-[#E8EDDF]"
                                                    )}>
                                                        ¿Uso Fines de Semana?
                                                    </Label>
                                                    {(state.sustainDetails.weekendDays && state.sustainDetails.weekendDays.length > 0) && (
                                                        <span className="text-[10px] font-bold text-[#F5CB5C] uppercase animate-in fade-in zoom-in">
                                                            {state.sustainDetails.weekendDays.join(' & ')}
                                                        </span>
                                                    )}
                                                </div>

                                                <ToggleGroup
                                                    type="multiple"
                                                    value={state.sustainDetails.weekendDays || []}
                                                    onValueChange={(val) => updateState('sustainDetails', {
                                                        ...state.sustainDetails,
                                                        weekendDays: val,
                                                        weekendUsage: val.length > 0
                                                    })}
                                                    className="justify-start gap-2"
                                                >
                                                    <ToggleGroupItem value="Sábado" className="data-[state=on]:bg-[#F5CB5C] data-[state=on]:text-[#242423] border border-[#4A4D4A] text-xs h-8 px-3 rounded-lg hover:bg-[#F5CB5C]/20 transition-all flex-1">
                                                        Sábado
                                                    </ToggleGroupItem>
                                                    <ToggleGroupItem value="Domingo" className="data-[state=on]:bg-[#F5CB5C] data-[state=on]:text-[#242423] border border-[#4A4D4A] text-xs h-8 px-3 rounded-lg hover:bg-[#F5CB5C]/20 transition-all flex-1">
                                                        Domingo
                                                    </ToggleGroupItem>
                                                </ToggleGroup>

                                                {(state.sustainDetails.weekendDays && state.sustainDetails.weekendDays.length > 0) && (
                                                    <div className="animate-in fade-in slide-in-from-top-2 pt-2 border-t border-[#4A4D4A]/50 mt-1">
                                                        <Label className="text-[#F5CB5C] mb-2 block text-[10px] uppercase font-bold">Horario Específico Fin de Semana</Label>
                                                        <Input
                                                            value={state.sustainDetails.weekendSupportHours}
                                                            onChange={e => updateState('sustainDetails', { ...state.sustainDetails, weekendSupportHours: e.target.value })}
                                                            placeholder="Ej. 9:00 - 13:00 hs"
                                                            className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF] focus:border-[#F5CB5C] h-8 text-xs"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Incidentabilidad Esperada</Label>
                                                <Input type="number"
                                                    value={state.sustainDetails.incidentRate}
                                                    onChange={e => updateState('sustainDetails', { ...state.sustainDetails, incidentRate: parseInt(e.target.value) || 0 })}
                                                    className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF] focus:border-[#F5CB5C]"
                                                    placeholder="Tickets/mes"
                                                />
                                            </div>

                                            <div>
                                                <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Periodo Hypercare</Label>
                                                <Select value={state.sustainDetails.hypercarePeriod} onValueChange={v => updateState('sustainDetails', { ...state.sustainDetails, hypercarePeriod: v })}>
                                                    <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                        <SelectItem value="15_days">15 Días</SelectItem>
                                                        <SelectItem value="30_days">30 Días</SelectItem>
                                                        <SelectItem value="60_days">60 Días</SelectItem>
                                                        <SelectItem value="none">No aplica</SelectItem>
                                                    </SelectContent>
                                                </Select>
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

                                        {/* FINANCIAL CRITICALITY TOGGLE */}
                                        <div className="bg-[#333533] p-4 rounded-xl border border-[#4A4D4A] mb-6 flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-[#E8EDDF] text-sm">¿Crítico para Cierre Financiero / Ventas?</h4>
                                                <p className="text-xs text-[#CFDBD5]">Impacto directo en facturación o reportes legales.</p>
                                            </div>
                                            <Switch
                                                checked={state.isFinancialOrSales}
                                                onCheckedChange={v => updateState('isFinancialOrSales', v)}
                                                className="data-[state=checked]:bg-[#F5CB5C]"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                                            {/* NEW FIELD: Frequency of Use */}
                                            {/* NEW FIELD: Frequency of Use */}
                                            <div className="bg-[#333533]/50 border border-[#4A4D4A] p-4 rounded-xl space-y-2">
                                                <Label className="text-[#CFDBD5] text-xs uppercase font-bold">Frecuencia de Uso</Label>
                                                <Select
                                                    value={state.sustainDetails.criticalityMatrix.frequencyOfUse}
                                                    onValueChange={(v) => updateState('sustainDetails', {
                                                        ...state.sustainDetails,
                                                        criticalityMatrix: { ...state.sustainDetails.criticalityMatrix, frequencyOfUse: v }
                                                    })}
                                                >
                                                    <SelectTrigger className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF] focus:border-[#F5CB5C]"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                                        <SelectItem value="daily">Diario</SelectItem>
                                                        <SelectItem value="weekly">Semanal</SelectItem>
                                                        <SelectItem value="monthly">Mensual</SelectItem>
                                                        <SelectItem value="monthend">Cierre de Mes</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* NEW FIELD: Critical Dates */}
                                            <div className="bg-[#333533]/50 border border-[#4A4D4A] p-4 rounded-xl space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[#CFDBD5] text-xs uppercase font-bold">¿Fechas Críticas?</Label>
                                                    <ToggleGroup
                                                        type="single"
                                                        value={state.sustainDetails.criticalityMatrix.hasCriticalDates ? 'yes' : 'no'}
                                                        onValueChange={(val) => {
                                                            if (val) updateState('sustainDetails', {
                                                                ...state.sustainDetails,
                                                                criticalityMatrix: { ...state.sustainDetails.criticalityMatrix, hasCriticalDates: val === 'yes' }
                                                            })
                                                        }}
                                                        className="justify-start gap-0 h-10"
                                                    >
                                                        <ToggleGroupItem
                                                            value="yes"
                                                            className="w-16 rounded-l-lg rounded-r-none border border-r-0 border-[#4A4D4A] data-[state=on]:bg-yellow-500 data-[state=on]:text-black data-[state=off]:bg-transparent data-[state=off]:text-[#CFDBD5] data-[state=off]:hover:bg-[#333533] h-10 transition-all font-bold text-xs"
                                                        >
                                                            SÍ
                                                        </ToggleGroupItem>
                                                        <ToggleGroupItem
                                                            value="no"
                                                            className="w-16 rounded-r-lg rounded-l-none border border-l-0 border-[#4A4D4A] data-[state=on]:bg-yellow-500 data-[state=on]:text-black data-[state=off]:bg-transparent data-[state=off]:text-[#CFDBD5] data-[state=off]:hover:bg-[#333533] h-10 transition-all font-bold text-xs"
                                                        >
                                                            NO
                                                        </ToggleGroupItem>
                                                    </ToggleGroup>
                                                </div>

                                                <AnimatePresence>
                                                    {state.sustainDetails.criticalityMatrix.hasCriticalDates && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="pt-2">
                                                                <Input
                                                                    placeholder="Describir fechas (ej. día 5, 20...)"
                                                                    value={state.sustainDetails.criticalityMatrix.criticalDatesDescription}
                                                                    onChange={(e) => updateState('sustainDetails', {
                                                                        ...state.sustainDetails,
                                                                        criticalityMatrix: { ...state.sustainDetails.criticalityMatrix, criticalDatesDescription: e.target.value }
                                                                    })}
                                                                    className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF] focus:border-[#F5CB5C] w-full"
                                                                />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* NEW FIELD: Scope (Markets & Users) */}
                                            {/* NEW FIELD: Scope (Markets & Users) */}
                                            <div className="bg-[#333533]/50 border border-[#4A4D4A] p-4 rounded-xl space-y-3 col-span-1 md:col-span-2">
                                                <Label className="text-[#CFDBD5] text-xs uppercase font-bold">Alcance (Mercados / Usuarios)</Label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            placeholder="Mercados"
                                                            value={state.sustainDetails.criticalityMatrix.marketsImpacted}
                                                            onChange={(e) => updateState('sustainDetails', {
                                                                ...state.sustainDetails,
                                                                criticalityMatrix: { ...state.sustainDetails.criticalityMatrix, marketsImpacted: parseInt(e.target.value) || 0 }
                                                            })}
                                                            className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF] pr-24 focus:border-[#F5CB5C]"
                                                        />
                                                        <span className="absolute right-14 top-2.5 text-[#F5CB5C] text-[10px] font-bold">MKTS</span>
                                                    </div>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            placeholder="Usuarios"
                                                            value={state.sustainDetails.criticalityMatrix.usersImpacted}
                                                            onChange={(e) => updateState('sustainDetails', {
                                                                ...state.sustainDetails,
                                                                criticalityMatrix: { ...state.sustainDetails.criticalityMatrix, usersImpacted: parseInt(e.target.value) || 0 }
                                                            })}
                                                            className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF] pr-24 focus:border-[#F5CB5C]"
                                                        />
                                                        <span className="absolute right-14 top-2.5 text-[#F5CB5C] text-[10px] font-bold">USRS</span>
                                                    </div>
                                                </div>
                                            </div>

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
                    )}

                    {/* 3. VOLUMETRY (Project Only) */}
                    {state.serviceType === 'Proyecto' && (
                        <SectionCard number={getSectionNumber('volumetry')} title="Volumetría de Datos" icon={Database}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Fuentes de Datos</Label>
                                    <Input type="number" value={state.dataSourcesCount} onChange={e => updateState('dataSourcesCount', parseInt(e.target.value) || 0)} className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF]" />
                                </div>
                                <div>
                                    <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Entidades de Negocio</Label>
                                    <Input type="number" value={state.pipelinesCount} onChange={e => updateState('pipelinesCount', parseInt(e.target.value) || 0)} className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF]" />
                                </div>
                                <div>
                                    <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Dashboards</Label>
                                    <Input type="number" value={state.dashboardsCount} onChange={e => updateState('dashboardsCount', parseInt(e.target.value) || 0)} className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF]" />
                                </div>
                                <div>
                                    <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Modelos ML/AI</Label>
                                    <Input type="number" value={state.reportsCount} onChange={e => updateState('reportsCount', parseInt(e.target.value) || 0)} className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF]" />
                                </div>
                            </div>
                        </SectionCard>
                    )}

                    {/* 4. BUSINESS / CONSUMPTION (Project Only) */}
                    {state.serviceType === 'Proyecto' && (
                        <SectionCard number={getSectionNumber('business')} title="Consumo y Negocio" icon={Users}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Usuarios Finales</Label>
                                    <Input type="number" value={state.reportUsers} onChange={e => updateState('reportUsers', parseInt(e.target.value) || 0)} className="bg-[#242423] border-[#4A4D4A] rounded-xl text-[#E8EDDF]" />
                                </div>
                                <div>
                                    <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">Frecuencia Actualización</Label>
                                    <Select value={state.updateFrequency} onValueChange={v => updateState('updateFrequency', v as any)}>
                                        <SelectTrigger className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                            <SelectItem value="Real-time">Real-time / Streaming</SelectItem>
                                            <SelectItem value="Diaria">Diaria</SelectItem>
                                            <SelectItem value="Semanal">Semanal</SelectItem>
                                            <SelectItem value="Mensual">Mensual</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-[#CFDBD5] mb-2 block text-xs uppercase font-bold">% Proceso Manual Actual</Label>
                                    <div className="flex items-center gap-4">
                                        <Slider value={[state.manualProcessPct]} min={0} max={100} step={5} onValueChange={([v]) => updateState('manualProcessPct', v)} className="flex-1" />
                                        <span className="text-[#F5CB5C] font-bold w-12 text-right">{state.manualProcessPct}%</span>
                                    </div>
                                </div>
                            </div>
                        </SectionCard>
                    )}

                    {/* 5. TEAM SELECTION */}
                    <SectionCard number={getSectionNumber('team')} title="Selección de Perfiles" icon={Users}>



                        {/* =====================================================================================
                            NEW LOGIC: GENERATE SUGGESTIONS (PROJECT & SUSTAIN)
                           ===================================================================================== */}
                        {(() => {
                            const handleGenerateSuggestions = () => {
                                setIsSuggestionLoading(true)
                                setTimeout(() => {
                                    // 1. Detect Stack source based on Service Type
                                    let activeStack: string[] = []
                                    if (state.serviceType === 'Sustain') {
                                        activeStack = state.sustainDetails.techStack || []
                                    } else {
                                        activeStack = state.techStack || []
                                    }

                                    if (activeStack.length === 0) {
                                        toast.error("Selecciona al menos una tecnología primero")
                                        setIsSuggestionLoading(false)
                                        return
                                    }

                                    // 2. Generate Recommendations
                                    const recommendations: any[] = []
                                    const processedRoles = new Set<string>()

                                    activeStack.forEach(techId => {
                                        const suggestions = RECOMENDACIONES_MAPPING[techId]
                                        if (suggestions) {
                                            suggestions.forEach(sug => {
                                                // Unique key to prevent duplicates
                                                const key = `${sug.role}-${sug.seniority}`
                                                if (!processedRoles.has(key)) {
                                                    const roleConfig = ROLE_CONFIG[sug.role]
                                                    if (roleConfig) {
                                                        recommendations.push({
                                                            role: roleConfig.label,
                                                            seniority: sug.seniority,
                                                            count: 1,
                                                            rationale: sug.rationale,
                                                            roleKey: sug.role
                                                        })
                                                        processedRoles.add(key)
                                                    }
                                                }
                                            })
                                        }
                                    })

                                    if (recommendations.length > 0) {
                                        setPendingRecs(recommendations)
                                        setIsSuggestionModalOpen(true)
                                        toast.success(`${recommendations.length} perfiles sugeridos`)
                                    } else {
                                        toast.info("No se encontraron sugerencias específicas para este stack")
                                    }
                                    setIsSuggestionLoading(false)
                                }, 800)
                            }

                            return (
                                <div className="mb-6 bg-gradient-to-r from-yellow-500/10 to-transparent p-4 rounded-xl border border-yellow-500/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                                            <Sparkles className="w-5 h-5 text-yellow-500" />
                                        </div>
                                        <div>
                                            <h4 className="text-[#E8EDDF] font-bold text-sm">Sugerencia Automática de Equipo</h4>
                                            <p className="text-[#CFDBD5] text-xs opacity-70">Basado en la volumetría y stack definidos</p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleGenerateSuggestions}
                                        disabled={isSuggestionLoading}
                                        className="bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C] font-bold text-xs"
                                    >
                                        {isSuggestionLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Wand2 className="w-3 h-3 mr-2" />}
                                        {isSuggestionLoading ? 'Analizando...' : 'Generar Sugerencia'}
                                    </Button>
                                </div>
                            )
                        })()}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* LEFT: Available Roles */}
                            <div className="space-y-6">
                                {/* LISTA GRID DE PERFILES (RESPONSIVE) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-custom content-start">
                                    {Object.keys(ROLE_CONFIG).map((key) => {
                                        const roleKey = key as RoleKey
                                        const role = ROLE_CONFIG[roleKey]
                                        const currentCount = state.roles[roleKey] || 0
                                        const isLimitReached = currentCount >= 5

                                        return (
                                            <div key={roleKey} className="group flex items-center justify-between p-3 rounded-xl bg-[#242423] border border-[#333533] hover:border-[#F5CB5C]/50 transition-all shadow-sm hover:shadow-md h-[72px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-[#1E1E1E] flex items-center justify-center border border-[#333533] group-hover:border-[#F5CB5C] transition-colors shadow-inner shrink-0">
                                                        <span className="text-[10px] font-bold text-[#CFDBD5] group-hover:text-[#F5CB5C]">SR</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-[#E8EDDF] font-bold text-xs leading-tight truncate pr-1">{role.label}</div>
                                                        <div className="text-[#CFDBD5] text-[9px] opacity-60 font-mono mt-0.5 truncate">
                                                            USD {(viewMode === 'annual' ? role.defaultPrice * 12 : role.defaultPrice).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <SenioritySelector
                                                    roleName={role.label}
                                                    roleKey={roleKey}
                                                    capabilities={['Jr', 'Med', 'Sr']}
                                                    serviceRates={dbRates}
                                                    onSelect={(level, price) => handleAddProfile(roleKey, level, price)}
                                                    defaultPrice={role.defaultPrice}
                                                    multipliers={SENIORITY_MODIFIERS}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* RIGHT: Selected Team Snapshot */}
                            <div className="bg-[#1E1E1E] p-6 rounded-[1.5rem] border border-[#333533] shadow-inner h-fit">
                                <h4 className="text-[#F5CB5C] text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Equipo Seleccionado (Snapshot Precios)
                                </h4>

                                <div className="space-y-4">
                                    {state.staffingDetails.profiles.length === 0 ? (
                                        <div className="text-center py-10 border-2 border-dashed border-[#333533] rounded-xl">
                                            <p className="text-[#CFDBD5]/50 text-sm italic">No se han seleccionado perfiles aún.</p>
                                        </div>
                                    ) : (
                                        state.staffingDetails.profiles.map((profile, idx) => {
                                            const displayPrice = (profile.price || 0) * (profile.count || 1)
                                            // Handle Monthly/Annual Toggle
                                            const finalPrice = viewMode === 'annual' ? displayPrice * 12 : displayPrice
                                            const periodLabel = viewMode === 'annual' ? 'ANUAL' : 'MENSUAL'

                                            // Determine Badge Color based on Seniority
                                            const badgeColor = profile.seniority === 'Expert' ? 'border-purple-500/50 text-purple-400' :
                                                profile.seniority === 'Sr' ? 'border-blue-500/50 text-blue-400' :
                                                    profile.seniority === 'Med' ? 'border-emerald-500/50 text-emerald-400' :
                                                        'border-zinc-500/50 text-zinc-400'

                                            return (
                                                <div key={idx} className="group relative flex items-center justify-between p-3 bg-[#242423] rounded-lg border border-[#333533] hover:border-[#F5CB5C]/30 transition-all animate-in fade-in slide-in-from-right-2">

                                                    {/* LEFT: Role & Seniority */}
                                                    <div className="flex items-center gap-3 overflow-hidden mr-2">
                                                        <div className={cn("w-6 h-6 rounded flex items-center justify-center text-[9px] font-black border shrink-0", badgeColor)}>
                                                            {profile.seniority?.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0 flex flex-col justify-center">
                                                            <div className="text-[#E8EDDF] font-bold text-xs truncate leading-none">
                                                                {profile.role}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* RIGHT: Specs */}
                                                    <div className="flex items-center gap-3 shrink-0">

                                                        {/* Quantity */}
                                                        <div className="bg-[#1E1E1E] px-2 py-1 rounded text-[10px] font-mono text-[#CFDBD5] border border-[#333533]">
                                                            CANT: <span className="text-[#E8EDDF] font-bold">{profile.count}</span>
                                                        </div>

                                                        {/* Price */}
                                                        <div className="text-right">
                                                            <div className="text-[#F5CB5C] font-mono font-bold text-xs leading-none tabular-nums">
                                                                ${finalPrice.toLocaleString('en-US', { useGrouping: false }).split('.')[0]}
                                                            </div>
                                                        </div>

                                                        {/* Trash Match Height */}
                                                        <button
                                                            className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                const newProfiles = state.staffingDetails.profiles.filter((_, i) => i !== idx)
                                                                const roleKey = Object.keys(ROLE_CONFIG).find(key => ROLE_CONFIG[key as RoleKey].label === profile.role) as RoleKey

                                                                setState(prev => ({
                                                                    ...prev,
                                                                    roles: {
                                                                        ...prev.roles,
                                                                        [roleKey]: Math.max(0, (prev.roles[roleKey] || 0) - profile.count)
                                                                    },
                                                                    staffingDetails: { ...prev.staffingDetails, profiles: newProfiles }
                                                                }))
                                                                toast.success("Perfil eliminado")
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4 opacity-70 hover:opacity-100" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                {/* TOTALS FOOTER */}
                                {state.staffingDetails.profiles.length > 0 && (
                                    <div className="mt-6 pt-6 border-t border-[#333533] flex items-center justify-between">
                                        <span className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider">Total Estimado</span>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-[#F5CB5C] tracking-tight">
                                                USD {state.staffingDetails.profiles.reduce((acc, p) => acc + ((p.price || 0) * p.count), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div className="text-[10px] text-[#CFDBD5]/50 font-medium">+ IVA si corresponde</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Dialog open={isSuggestionModalOpen} onOpenChange={setIsSuggestionModalOpen}>
                            <DialogContent className="bg-[#1E1E1E] border border-[#333533] text-[#E8EDDF] sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-[#F5CB5C] flex items-center gap-2">
                                        <Sparkles className="w-5 h-5" /> Sugerencias de Equipo
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="space-y-3 py-4">
                                    {pendingRecs.length > 0 ? pendingRecs.map((rec, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#242423] border border-[#333533]">
                                            <div>
                                                <div className="text-[#E8EDDF] font-bold text-sm">{rec.role}</div>
                                                <div className="text-[10px] text-[#CFDBD5] opacity-70">{rec.seniority} • {rec.rationale}</div>
                                            </div>
                                            <div className="bg-[#333533] px-2 py-1 rounded text-[#F5CB5C] font-bold text-xs">
                                                x{rec.count}
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-[#CFDBD5] text-sm text-center py-4">No hay recomendaciones adicionales.</p>
                                    )}
                                </div>

                                <DialogFooter className="gap-4 sm:gap-4 mt-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setIsSuggestionModalOpen(false)
                                            setPendingRecs([])
                                        }}
                                        className="text-[#CFDBD5] hover:text-[#E8EDDF] hover:bg-[#333533]"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleApplyRecommendations}
                                        className="bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C] font-bold px-6"
                                    >
                                        Aceptar y Agregar
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </SectionCard>
                    {/* 7. COMMERCIAL DATA & RETENTION */}
                    <SectionCard number={getSectionNumber('commercial')} title="Datos Comercial & Retenciones" icon={Users}>
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
                                                        {formatMoney(finalTotal)}
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
            </div >

            {/* ================= RIGHT COLUMN: INDEPENDENT SCROLL SUMMARY ================= */}
            < div className="w-full lg:w-1/3 h-full overflow-y-auto scrollbar-custom bg-[#242423] border-l border-[#CFDBD5]/10 p-8 lg:p-10 space-y-10 relative order-last lg:order-none" >
                {/* Cost Summary */}
                < div className="space-y-6" >
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
                        {formatMoney(totalProjectCost)}
                    </div>
                    <p className="text-[#CFDBD5] mt-2 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#F5CB5C] animate-pulse" />
                        Total proyecto ({state.durationValue} {state.durationUnit === 'days' ? 'días' : state.durationUnit === 'weeks' ? 'semanas' : 'meses'})
                    </p>
                </div >

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
                    {/* RIESGO (REMOVED) */}
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

                    <div className="flex items-center justify-between border-t border-[#4A4D4A]/50 pt-4 mt-2">
                        <Label className="text-[#CFDBD5] text-xs font-bold uppercase tracking-wider">Vista Precios</Label>
                        <div className="flex items-center gap-2 bg-[#242423] p-1 rounded-lg border border-[#4A4D4A]">
                            <button
                                onClick={() => setViewMode('monthly')}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                                    viewMode === 'monthly' ? "bg-[#F5CB5C] text-[#242423]" : "text-[#CFDBD5] hover:text-[#E8EDDF]"
                                )}
                            >
                                Mensual
                            </button>
                            <button
                                onClick={() => setViewMode('annual')}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                                    viewMode === 'annual' ? "bg-[#F5CB5C] text-[#242423]" : "text-[#CFDBD5] hover:text-[#E8EDDF]"
                                )}
                            >
                                Anual
                            </button>
                        </div>
                    </div>

                    {state.commercialDiscount > 0 && (
                        <div className="flex justify-between items-center text-green-400">
                            <span>Ahorro Aplicado {viewMode === 'annual' ? 'Anual' : 'Mensual'}</span>
                            <span className="font-mono">- {formatMoney(viewMode === 'annual' ? discountAmount * 12 : discountAmount)}</span>
                        </div>
                    )}

                    {/* RETENCION REMOVED IF EMPTY */}

                    <Separator className="bg-[#4A4D4A]" />
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[#E8EDDF] font-medium text-lg">
                            <span>Subtotal {viewMode === 'annual' ? 'Anualizado' : ''}</span>
                            <span className="font-mono">{formatMoney(viewMode === 'annual' ? grossTotal * 12 : grossTotal)}</span>
                        </div>
                        {state.retention.enabled && (
                            <div className="flex justify-between items-center text-[#E8EDDF]/70 text-base border-t border-[#4A4D4A]/50 pt-1 mt-1">
                                <span>Retención (-{state.retention.percentage}%) {viewMode === 'annual' ? 'Anual' : ''}</span>
                                <span className="font-mono text-red-400">- {formatMoney(viewMode === 'annual' ? retentionAmount * 12 : retentionAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-[#F5CB5C] font-black text-2xl pt-2 mt-2 border-t border-[#4A4D4A]">
                            <div className="flex flex-col">
                                <span>Inversión Neta Final</span>
                                <span className="text-[10px] text-[#F5CB5C]/50 uppercase tracking-tighter leading-none mt-1">
                                    {viewMode === 'annual' ? 'PROYECTADA ANUAL' : 'COSTO MENSUAL ESTIMADO'}
                                </span>
                            </div>
                            <span>{formatMoney(viewMode === 'annual' ? finalTotal * 12 : finalTotal)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <Button
                        onClick={() => handleSaveQuote(true)}
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
                                    <MermaidDiagram
                                        chart={chartCode || DEFAULT_DIAGRAM}
                                        key={`${state.serviceType}-${chartCode?.length || 0}`}
                                    />
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

                {/* Suggestion Modal */}
                <Dialog open={isSuggestionModalOpen} onOpenChange={setIsSuggestionModalOpen}>
                    <DialogContent className="bg-[#1E1E1E] border border-[#333533] text-[#E8EDDF] sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-[#F5CB5C] flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                Sugerencia de Perfiles
                            </DialogTitle>
                            <DialogDescription className="text-[#CFDBD5]">
                                Basado en tu stack tecnológico, recomendamos agregar los siguientes perfiles a tu equipo:
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 my-4">
                            {pendingRecs.map((rec, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-[#242423] rounded-lg border border-[#333533]">
                                    <div className="p-2 bg-[#F5CB5C]/10 rounded-lg shrink-0">
                                        <Users className="w-4 h-4 text-[#F5CB5C]" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-[#E8EDDF]">
                                            {ROLE_CONFIG[rec.role as keyof typeof ROLE_CONFIG]?.label || rec.role}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-[#333533] px-1.5 py-0.5 rounded text-[#CFDBD5] font-bold uppercase">
                                                {rec.seniority}
                                            </span>
                                            <span className="text-[10px] text-[#CFDBD5]/60 italic">
                                                {rec.rationale}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setIsSuggestionModalOpen(false)
                                    setPendingRecs([])
                                }}
                                className="text-[#CFDBD5] hover:text-[#E8EDDF] hover:bg-[#333533]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleApplyRecommendations}
                                className="bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C] font-bold"
                            >
                                Aceptar y Agregar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div >
        </motion.div >
    )
}




// --- HELPERS ---

function generateSustainDiagram(stack: string[]): string {
    let code = `graph TD
    %% Graphite Theme
    classDef default fill:#242423,stroke:#CFDBD5,stroke-width:2px,color:#E8EDDF;
    classDef highlight fill:#242423,stroke:#F5CB5C,stroke-width:2px,color:#F5CB5C;
    linkStyle default stroke:#CFDBD5,stroke-width:2px;
    
    Source[Fuentes]
    Pipe[Ingesta]
    Store[Lakehouse]
    Vis[Power BI]
    User((Usuario))
    
    Source --> Pipe
    Pipe --> Store
    Store --> Vis
    Vis --> User
`

    // Tech Stack Overlay
    if (stack.length > 0) {
        code += `\n    subgraph TechStack [Stack Tecnológico]`
        code += `\n    direction TB`

        const chunkSize = 4
        for (let i = 0; i < stack.length; i += chunkSize) {
            const chunk = stack.slice(i, i + chunkSize)
            const rowId = `Row${i}`
            code += `\n    subgraph ${rowId} [ ]` // invisible
            code += `\n    direction LR`

            chunk.forEach(t => {
                // Try to resolve name from options if available
                const option = (typeof SUSTAIN_TECH_OPTIONS !== 'undefined' ? SUSTAIN_TECH_OPTIONS : []).find((o: any) => o.id === t)
                const name = option ? option.name : t
                const cleanId = `Tech${t.replace(/[^a-zA-Z0-9]/g, '')}`
                code += `\n        ${cleanId}[${name}]`
                code += `\n        style ${cleanId} stroke-dasharray: 5 5`
            })
            code += `\n    end`
            code += `\n    style ${rowId} fill:none,stroke:none`
        }
        code += `\n    end`

        // Link Stack to Lakehouse (Store)
        code += `\n    TechStack -.- Store`
    }

    // Apply Classes
    code += `\n    class Source,User default`
    code += `\n    class Pipe,Store,Vis highlight`

    return code
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
// Force Git Update

// Force Git Update 2
// Force Git Update 3
