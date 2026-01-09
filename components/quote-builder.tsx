'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { MermaidDiagram } from "@/components/mermaid-diagram"
import { Wand2, Download, FileText, Check, ShieldAlert, Network, Cpu, Calculator, Save, Loader2, ClipboardList, Database, Users, Briefcase, Layers, AlertTriangle, Activity, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveQuote } from "@/lib/actions"
import html2canvas from 'html2canvas'

// --- 1. TYPES & CONSTANTS ---

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

    // Duration & Support
    durationMonths: number
    supportHours: 'business' | '24/7'
}

const INITIAL_STATE: QuoteState = {
    clientName: '',
    description: '',
    complexity: 'medium',
    updateFrequency: 'daily',
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
    reportsCount: 0,
    reportUsers: 0,
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
    durationMonths: 6,
    supportHours: 'business'
}

const TECH_OPTIONS = [
    { id: 'azure', name: 'Azure Data Factory' },
    { id: 'databricks', name: 'Azure Databricks' },
    { id: 'synapse', name: 'Azure Synapse' },
    { id: 'snowflake', name: 'Snowflake' },
    { id: 'fabric', name: 'Microsoft Fabric' },
    { id: 'powerbi', name: 'Power BI' },
    { id: 'tableau', name: 'Tableau' },
    { id: 'python', name: 'Python/Airflow' },
]

// --- 2. COMPONENT ---

export default function QuoteBuilder({ dbRates }: { dbRates?: Record<string, number> }) {
    const [state, setState] = useState<QuoteState>(INITIAL_STATE)
    const [chartCode, setChartCode] = useState('')
    const [polishLoading, setPolishLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [exportType, setExportType] = useState<'pdf' | 'word' | null>(null)
    const router = useRouter()

    const handleExport = async (type: 'pdf' | 'word') => {
        setIsExporting(true)
        setExportType(type)
        try {
            // Give UI a moment to update
            await new Promise(r => setTimeout(r, 100))

            // Capture Diagram
            let diagramImage = null
            const element = document.getElementById('diagram-capture-target')
            if (element) {
                // Temporary style for valid capture (white background often helps readability in docs)
                const canvas = await html2canvas(element, {
                    backgroundColor: '#ffffff',
                    scale: 2 // Retain quality
                })
                diagramImage = canvas.toDataURL('image/png')
            }

            const exportData = {
                ...state,
                totalMonthlyCost,
                l2SupportCost,
                riskCost,
                totalWithRisk,
                criticitnessLevel,
                diagramImage
            }

            // Dynamic import
            const mod = await import("@/lib/export")
            if (type === 'pdf') {
                await mod.exportToPDF(exportData as any)
            } else {
                await mod.exportToWord(exportData as any)
            }

        } catch (error) {
            console.error("Export failed", error)
            alert("Error generando el documento")
        } finally {
            setIsExporting(false)
            setExportType(null)
        }
    }

    // Merge DB rates with fallback
    const currentRates = useMemo(() => {
        if (!dbRates) return FALLBACK_RATES
        return FALLBACK_RATES
    }, [dbRates])

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

    // --- Fetch Service Rates (Demo Mode) ---
    const [serviceRates, setServiceRates] = useState<any[]>([])

    useEffect(() => {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('admin_service_rates_v1') : null
        if (raw) {
            try {
                setServiceRates(JSON.parse(raw))
            } catch { }
        }
    }, [])

    const { totalMonthlyCost, l2SupportCost, riskCost, totalWithRisk, servicesCost, rolesCost } = useMemo(() => {
        // 1. Calculate Roles Cost
        let baseRoles = 0
        let analystCost = 0
        const getRate = (roleKey: RoleKey) => {
            // ... existing fallback logic for roles ...
            return FALLBACK_RATES[roleKey]
        }

        Object.entries(state.roles).forEach(([role, count]) => {
            const rate = getRate(role as RoleKey)
            const cost = count * rate
            baseRoles += cost
            if (role === 'data_analyst') analystCost = cost
        })

        // 2. Calculate Services Cost (Based on new Admin Table)
        let baseServices = 0

        // Helper to find best match
        const findRate = (serviceName: string) => {
            // Map State -> DB Strings
            const freqMap: any = { 'daily': 'Diaria', 'weekly': 'Semanal', 'monthly': 'Mensual', 'realtime': 'Bajo Demanda' }
            const compMap: any = { 'low': 'Baja', 'medium': 'Media', 'high': 'Alta' }

            const targetFreq = freqMap[state.updateFrequency] || 'Diaria'
            const targetComp = compMap[state.complexity] || 'Media'

            // Try Exact Match
            let match = serviceRates.find(r =>
                r.service.toLowerCase().includes(serviceName.toLowerCase()) &&
                r.frequency === targetFreq &&
                r.complexity === targetComp
            )

            // Fallback: Try matching service only (take first/avg?) -> actually let's try matching just complexity if freq varies
            if (!match) {
                match = serviceRates.find(r => r.service.toLowerCase().includes(serviceName.toLowerCase()) && r.complexity === targetComp)
            }
            if (!match) {
                match = serviceRates.find(r => r.service.toLowerCase().includes(serviceName.toLowerCase()))
            }

            if (match) return match.basePrice * match.multiplier
            return 0 // No rate found
        }

        if (state.pipelinesCount > 0) baseServices += state.pipelinesCount * findRate('Pipe')
        if (state.notebooksCount > 0) baseServices += state.notebooksCount * findRate('Dataset') // Assuming Notebooks ~ Datasets
        if (state.dashboardsCount > 0) baseServices += state.dashboardsCount * findRate('Dashboard')
        if (state.dsModelsCount > 0) baseServices += state.dsModelsCount * findRate('Algoritmo')

        // 3. Totals
        const l2SupportCost = (baseRoles + baseServices) * 0.10 // Support covers everything?
        const total = baseRoles + baseServices + l2SupportCost
        const riskCost = state.criticitness.enabled ? total * criticitnessLevel.margin : 0
        const totalWithRisk = total + riskCost

        return { totalMonthlyCost: total, l2SupportCost, riskCost, totalWithRisk, servicesCost: baseServices, rolesCost: baseRoles }
    }, [state, criticitnessLevel, serviceRates])

    const totalProjectCost = totalWithRisk * state.durationMonths

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

            const savedQuote = await saveQuote({
                clientName: state.clientName,
                projectType: state.complexity,
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

            // Client-Side Persistence for Vercel Demo (Phantom Mode)
            try {
                // Ensure unique ID for client-side storage to avoid "mock-id" collisions
                const uniqueId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

                // Add specific fields required for display
                const quoteForStorage = {
                    ...(savedQuote as any),
                    // Ensure estimatedCost is captured even if server returned a mock without it
                    estimatedCost: (savedQuote as any).estimatedCost || (savedQuote as any).breakdown?.totalMonthlyCost || 0,
                    id: uniqueId, // Override mock ID with unique client ID
                    userId: 'demo-user', // Ensure visible
                    createdAt: new Date().toISOString() // Ensure date is string for JSON
                }

                const storageKey = 'quotes_v1_prod'
                const rawValue = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
                let currentLocal: any[] = []

                if (rawValue && rawValue !== "undefined" && rawValue !== "null") {
                    try {
                        const parsed = JSON.parse(rawValue)
                        if (Array.isArray(parsed)) currentLocal = parsed
                    } catch (e) { }
                }

                localStorage.setItem(storageKey, JSON.stringify([quoteForStorage, ...currentLocal]))
            } catch (e) {
                console.error("Local Persist Failed", e)
            }

            alert("Cotización guardada exitosamente.")
            router.push('/dashboard')
        } catch (e) {
            console.error(e)
            alert("Error al guardar cotización.")
        } finally {
            setIsSaving(false)
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
        if (techStack.length > 0) {
            const techNames = techStack.map(t => TECH_OPTIONS.find(o => o.id === t)?.name).join('\\n')
            nodes += `\n    Tech[Stack: ${techNames}]`
            flow += `\n    Tech -.- Store`
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
        setChartCode(chart)
    }, [state])

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-[#333533] font-sans pt-32">

            {/* ================= LEFT COLUMN: FORM SCROLL ================= */}
            <div className="w-full lg:w-2/3 h-full overflow-y-auto scrollbar-custom p-6 md:p-8 lg:p-12">
                <div className="space-y-12 max-w-4xl mx-auto pb-32">

                    {/* Header */}
                    <div>
                        <h1 className="text-5xl font-black text-[#E8EDDF] tracking-tighter mb-3">
                            Cotizador <span className="text-[#F5CB5C]">Técnico</span>
                        </h1>
                        <p className="text-[#CFDBD5] text-lg">
                            Configure la arquitectura y equipo para estimar costos en tiempo real.
                        </p>
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
                                <Label className="text-[#CFDBD5] text-sm font-bold uppercase tracking-wider mb-2 block">Contexto del Proyecto</Label>
                                <Textarea
                                    placeholder="Detalle los objetivos de negocio, dolores actuales y requerimientos técnicos..."
                                    value={state.description}
                                    onChange={e => updateState('description', e.target.value)}
                                    className="min-h-[180px] resize-none text-base leading-relaxed bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        </div>
                    </SectionCard>

                    {/* 2. VOLUMETRY */}
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

                    {/* 4. TEAM */}
                    <SectionCard number="04" title="Equipo Requerido" icon={Briefcase}>
                        <div className="grid grid-cols-1 gap-6">
                            {Object.entries(state.roles).map(([key, count]) => {
                                const rate = dbRates ? dbRates[key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())] || FALLBACK_RATES[key as RoleKey] : FALLBACK_RATES[key as RoleKey]

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
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalProjectCost)}
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
                        <div className="flex justify-between items-center text-[#E8EDDF] font-black text-2xl">
                            <span>Mensual</span>
                            <span className="text-[#F5CB5C]">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalWithRisk)}</span>
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
                < div className="space-y-6 pt-10 border-t border-[#CFDBD5]/10" >
                    <h4 className="text-[#CFDBD5] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Network className="w-4 h-4 text-[#F5CB5C]" /> Arquitectura Dinámica
                    </h4>
                    <div id="diagram-capture-target" className="rounded-[2rem] border border-[#CFDBD5]/20 bg-[#333533] p-4 min-h-[250px] flex items-center justify-center relative overflow-hidden bg-white">
                        <MermaidDiagram chart={chartCode} />
                    </div>
                </div >

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
        </div >
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
