'use client'

import { useState } from "react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, Calendar, DollarSign, FileText, User, Edit, Save, X, Loader2, Network, Download, Sparkles, Briefcase, Rocket, Settings, ChevronDown } from "lucide-react"
import { MermaidDiagram } from "./mermaid-diagram"
import { updateQuoteDiagram, updateQuoteStatus } from "@/lib/actions"
import { generateMermaidUpdate } from "@/lib/ai"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface QuoteDetailsSheetProps {
    quote: {
        id: string
        quoteNumber?: number
        clientName: string
        projectType: string
        estimatedCost: number
        createdAt: Date | string
        technicalParameters: string
        diagramDefinition?: string
        status?: string
        serviceType?: string
    }
    onQuoteUpdated?: (updatedQuote: any) => void
}

export function QuoteDetailsSheet({ quote, onQuoteUpdated }: QuoteDetailsSheetProps) {
    const router = useRouter()
    let params: any = {}
    if (quote?.technicalParameters) {
        try {
            params = JSON.parse(quote.technicalParameters)
        } catch (e) {
            console.error("Error parsing quote params", e)
        }
    }
    const dateObj = new Date(quote.createdAt)

    const [isEditingDiagram, setIsEditingDiagram] = useState(false)
    const [editedDiagramCode, setEditedDiagramCode] = useState(quote.diagramDefinition || '')
    const [isSavingDiagram, setIsSavingDiagram] = useState(false)
    const [status, setStatus] = useState(quote.status || 'NUEVA')
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

    // AI Assistant State
    const [aiPrompt, setAiPrompt] = useState('')
    const [isGeneratingAI, setIsGeneratingAI] = useState(false)

    const handleAIGenerate = async () => {
        setIsGeneratingAI(true)
        try {
            const currentCode = editedDiagramCode || quote.diagramDefinition || ''
            const newCode = await generateMermaidUpdate(currentCode, aiPrompt)
            setEditedDiagramCode(newCode)
            setIsEditingDiagram(true) // Switch to edit mode to show result
            setAiPrompt('')
        } catch (e) {
            console.error("AI Generation failed", e)
            alert("Error generando diagrama")
        } finally {
            setIsGeneratingAI(false)
        }
    }

    const handleStatusChange = async (val: string) => {
        setIsUpdatingStatus(true)
        // Optimistic update
        setStatus(val)
        // Callback to parent immediately for UI sync
        if (onQuoteUpdated) {
            onQuoteUpdated({ ...quote, status: val })
        }

        try {
            await updateQuoteStatus(quote.id, val)
            router.refresh()
        } catch (e) {
            console.error(e)
            // Revert on error
            setStatus(quote.status || 'NUEVA')
            alert("Error al actualizar estado")
            // Revert parent too
            if (onQuoteUpdated) {
                onQuoteUpdated({ ...quote, status: quote.status || 'NUEVA' })
            }
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    const initialDiagram = quote.diagramDefinition || 'graph TD\n  A[Inicio] --> B[Fin]'

    const handleSaveDiagram = async () => {
        setIsSavingDiagram(true)
        try {
            const res = await updateQuoteDiagram(quote.id, editedDiagramCode)
            if (res.success) {
                setIsEditingDiagram(false)
                router.refresh()
            } else {
                alert("Error al guardar el diagrama")
            }
        } catch (e) {
            console.error(e)
            alert("Error de conexión")
        } finally {
            setIsSavingDiagram(false)
        }
    }

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button size="sm" className="bg-[#333533] text-[#E8EDDF] hover:bg-[#E8EDDF] hover:text-[#171717] rounded-lg h-10 px-4 font-bold transition-all cursor-pointer">
                    Ver Detalle <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </SheetTrigger>
            <SheetContent className="bg-[#171717] border-l-[#2D2D2D] w-[400px] sm:w-[600px] md:w-[800px] overflow-y-auto overflow-x-hidden [&>button]:!sticky [&>button]:!top-4 [&>button]:!right-4 [&>button]:ml-auto [&>button]:z-50 [&>button]:bg-black/20 [&>button]:backdrop-blur-sm [&>button]:rounded-full [&>button]:p-2 [&>button]:text-[#E8EDDF] [&>button]:hover:bg-black/40 [&>button]:transition-all">
                <SheetHeader className="mb-8 border-b border-[#2D2D2D] pb-6">
                    {/* Parent Container with pr-6 (24px) to force right spacing */}
                    {/* Parent Container - pl-5 (shift left) and pr-24 (large right gap) */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pl-5 pr-24">
                        {/* Title Container */}
                        <div className="space-y-3 pt-1 flex-1 flex flex-col justify-center">
                            <SheetTitle className="text-xl font-black text-[#E8EDDF] tracking-tight text-center md:text-left flex items-center gap-3">
                                <span className="text-[#F5CB5C] font-mono font-bold text-sm bg-[#F5CB5C]/10 px-2 py-0.5 rounded border border-[#F5CB5C]/20 shrink-0">
                                    #{quote.quoteNumber ? quote.quoteNumber.toString().padStart(6, '0') : '[NUEVA]'}
                                </span>
                                Detalle de Cotización
                            </SheetTitle>
                            {/* Description Box */}
                            <div className="max-w-[300px] mx-auto md:mx-0">
                                <SheetDescription className="text-[#CFDBD5]/80 text-sm leading-relaxed text-center md:text-left">
                                    Información completa del proyecto, parámetros técnicos y administrativos.
                                </SheetDescription>
                            </div>
                        </div>

                        {/* Selector Container - Fixed width 180px and forced right margin 30px */}
                        <div className="w-full md:w-[180px] bg-[#1F1F1F] p-1.5 rounded-xl border border-[#2D2D2D] self-start flex-shrink-0 !mr-[30px]">
                            <label className="text-[10px] text-[#CFDBD5]/60 font-bold uppercase tracking-widest px-3 py-1 block mb-1">
                                Cambio de Estado
                            </label>
                            <Select
                                value={status === 'NUEVA' ? 'BORRADOR' : status}
                                onValueChange={handleStatusChange}
                                disabled={isUpdatingStatus}
                            >
                                <SelectTrigger className="w-full bg-[#171717] border-[#2D2D2D] text-[#E8EDDF] font-bold h-10 shadow-sm focus:ring-[#F5CB5C]/20 focus:ring-1 flex items-center justify-between px-3">
                                    <SelectValue placeholder="Seleccionar Estado" />
                                </SelectTrigger>
                                <SelectContent
                                    className="bg-[#1F1F1F] border-[#2D2D2D] text-[#E8EDDF] max-h-[300px] overflow-visible"
                                    position="popper"
                                    sideOffset={5}
                                >
                                    <SelectItem value="BORRADOR" className="focus:bg-[#333533] focus:text-[#E8EDDF] cursor-pointer py-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]"></span>
                                            <span className="font-medium">BORRADOR</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="APROBADA" className="focus:bg-[#333533] focus:text-[#E8EDDF] cursor-pointer py-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                            <span className="font-medium">APROBADA</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="RECHAZADA" className="focus:bg-[#333533] focus:text-[#E8EDDF] cursor-pointer py-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                                            <span className="font-medium">RECHAZADA</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </SheetHeader>

                <div className="space-y-8">
                    {/* Main Info */}
                    <div className="p-6 bg-[#1F1F1F] rounded-[1.5rem] border border-[#2D2D2D] space-y-4">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-[#171717] rounded-xl border border-[#2D2D2D]">
                                    <User className="w-6 h-6 text-[#F5CB5C]" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xs font-bold text-[#CFDBD5] uppercase tracking-wider mb-2">Cliente</h3>
                                    <div className="flex items-center flex-wrap gap-3">
                                        <p className="text-xl font-bold text-[#E8EDDF]">{quote.clientName}</p>

                                        {/* Service Type Badge */}
                                        {(() => {
                                            const type = quote.serviceType || 'Proyecto'
                                            let badgeStyles = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                            let Icon = Rocket

                                            if (type === 'Staffing') {
                                                badgeStyles = "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                Icon = User
                                            } else if (type === 'Sustain') {
                                                badgeStyles = "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                                Icon = Settings
                                            }

                                            return (
                                                <Badge variant="outline" className={`${badgeStyles} flex items-center gap-1.5 px-3 py-1 text-xs font-bold border`}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {type}
                                                </Badge>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-[#171717] rounded-xl border border-[#2D2D2D]">
                                <FileText className="w-6 h-6 text-[#CFDBD5]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-[#CFDBD5] uppercase tracking-wider mb-1">Proyecto</h3>
                                <p className="text-lg font-medium text-[#E8EDDF]">{quote.projectType}</p>
                                <p className="text-sm text-[#CFDBD5] mt-1 opacity-70 leading-relaxed">{params?.description || "Sin descripción"}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-[#171717] rounded-xl border border-[#2D2D2D]">
                                <Calendar className="w-6 h-6 text-[#CFDBD5]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-[#CFDBD5] uppercase tracking-wider mb-1">Fecha Creación</h3>
                                <p className="text-lg font-medium text-[#E8EDDF]">{dateObj.toLocaleDateString('es-ES', { dateStyle: 'long' })}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sustain Layout */}
                    {quote.serviceType === 'Sustain' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-[#1F1F1F] rounded-[1.5rem] border border-[#2D2D2D]">
                                <h3 className="text-sm font-bold text-[#CFDBD5] uppercase tracking-wider mb-4">Detalle del Servicio</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-[#2D2D2D] pb-2">
                                        <span className="text-[#E8EDDF] font-bold capitalize">{params.sustainDetails?.operationHours || params.supportHours || 'Business'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-[#2D2D2D] pb-2">
                                        <span className="text-[#CFDBD5]">Nivel de Criticidad</span>
                                        <span className="text-[#E8EDDF] font-bold capitalize">{params.criticitness?.level || 'Standard'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Staffing Layout */}
                    {quote.serviceType === 'Staffing' && params.staffingDetails?.profiles?.length > 0 && (
                        <div className="p-6 bg-[#1F1F1F] rounded-[1.5rem] border border-[#2D2D2D]">
                            <h3 className="text-sm font-bold text-[#CFDBD5] uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-[#F5CB5C]" /> Perfiles Solicitados
                            </h3>
                            <div className="space-y-4">
                                {params.staffingDetails.profiles.map((p: any, idx: number) => (
                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#171717] rounded-xl border border-[#2D2D2D]">
                                        <div>
                                            <p className="font-bold text-[#E8EDDF] text-lg">{p.count}x {p.role} ({p.seniority})</p>
                                            <p className="text-xs text-[#CFDBD5] opacity-70 mt-1">{p.skills}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Architecture Diagram Editor */}
                    {(!quote.serviceType || quote.serviceType !== 'Staffing') && (
                        <div className="p-6 bg-[#1F1F1F] rounded-[1.5rem] border border-[#2D2D2D] flex flex-col gap-6 group relative">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <h3 className="text-lg font-bold text-[#E8EDDF] flex items-center gap-2">
                                    <Network className="w-5 h-5 text-[#F5CB5C]" />
                                    Arquitectura Propuesta
                                </h3>
                                {/* Header Actions - Save/Cancel Only (Visible during Edit) */}
                                {quote.diagramDefinition && isEditingDiagram && (
                                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsEditingDiagram(false)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 flex-1 sm:flex-none"
                                            disabled={isSavingDiagram}
                                        >
                                            <X className="w-4 h-4 mr-1" /> Cancelar
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSaveDiagram}
                                            className="bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C] font-bold flex-1 sm:flex-none min-w-[100px]"
                                            disabled={isSavingDiagram}
                                        >
                                            {isSavingDiagram ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                            Guardar
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* AI Assistant Input */}
                            {quote.diagramDefinition || isEditingDiagram ? (
                                isEditingDiagram ? (
                                    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
                                        {/* AI Assistant - Visible ONLY in Edit Mode */}
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                <Sparkles className="h-4 w-4 text-[#F5CB5C]" />
                                            </div>
                                            <Input
                                                placeholder="IA: Describe un cambio (ej: 'Agrega un nodo de Power BI conectado al Lake')"
                                                className="pl-10 pr-12 bg-[#171717] border-[#2D2D2D] text-[#E8EDDF] placeholder:text-[#CFDBD5]/30 focus-visible:ring-[#F5CB5C] h-10 transition-all hover:border-[#F5CB5C]/50"
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && aiPrompt && !isGeneratingAI) {
                                                        handleAIGenerate()
                                                    }
                                                }}
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="absolute right-1 top-1 h-8 w-8 text-[#F5CB5C] hover:text-[#E8EDDF] hover:bg-[#F5CB5C]/20"
                                                onClick={handleAIGenerate}
                                                disabled={!aiPrompt || isGeneratingAI}
                                            >
                                                {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                                            </Button>
                                        </div>

                                        {/* Code Editor - Full Width */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-[#CFDBD5] uppercase">Código Mermaid</label>
                                            <Textarea
                                                value={editedDiagramCode}
                                                onChange={(e) => setEditedDiagramCode(e.target.value)}
                                                className="font-mono text-xs bg-[#171717] border-[#2D2D2D] text-[#E8EDDF] resize-none h-[200px] focus-visible:ring-[#F5CB5C]"
                                            />
                                            <p className="text-[10px] text-[#CFDBD5]/50">
                                                Edita los nodos y conexiones para actualizar el diagrama en tiempo real.
                                            </p>
                                        </div>

                                        {/* Preview - Full Width */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-[#CFDBD5] uppercase">Vista Previa</label>
                                            <div className="bg-white rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center border border-[#2D2D2D]">
                                                <div className="scale-90 origin-center w-full">
                                                    <MermaidDiagram chart={editedDiagramCode} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        <div id="diagram-container" className="bg-white rounded-xl p-4 overflow-hidden min-h-[200px] border border-[#2D2D2D] shadow-inner flex items-center justify-center">
                                            <MermaidDiagram chart={quote.diagramDefinition || ''} />
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            {/* Edit Button - Replaces Header Action */}
                                            <Button
                                                onClick={() => {
                                                    setEditedDiagramCode(quote.diagramDefinition || '')
                                                    setIsEditingDiagram(true)
                                                }}
                                                className="w-full bg-[#F5CB5C]/10 text-[#F5CB5C] border border-[#F5CB5C]/30 hover:bg-[#F5CB5C] hover:text-[#242423] font-bold transition-all"
                                            >
                                                <Edit className="w-4 h-4 mr-2" /> Editar Diagrama
                                            </Button>

                                            {/* Download Button */}
                                            <Button
                                                variant="outline"
                                                onClick={async () => {
                                                    const element = document.getElementById('diagram-container');
                                                    if (element) {
                                                        try {
                                                            const html2canvas = (await import('html2canvas')).default
                                                            const canvas = await html2canvas(element, {
                                                                backgroundColor: "#ffffff",
                                                                scale: 2 // High Resolution
                                                            })
                                                            const a = document.createElement("a")
                                                            a.download = `arquitectura_${quote.clientName.replace(/\s+/g, '_')}.png`
                                                            a.href = canvas.toDataURL("image/png")
                                                            a.click()
                                                        } catch (err) {
                                                            console.error("Export failed", err)
                                                            alert("No se pudo descargar el diagrama.")
                                                        }
                                                    }
                                                }}
                                                className="w-full border-dashed border-[#CFDBD5]/30 text-[#CFDBD5] hover:text-[#E8EDDF] hover:bg-[#2D2D2D] hover:border-[#F5CB5C] transition-all"
                                            >
                                                <Download className="w-4 h-4 mr-2" /> Descargar Diagrama PNG
                                            </Button>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[200px] bg-[#171717] border border-dashed border-[#2D2D2D] rounded-xl text-center">
                                    <Network className="w-10 h-10 text-[#2D2D2D] mb-3" />
                                    <p className="text-[#CFDBD5] font-bold">Diagrama no disponible</p>
                                    <p className="text-xs text-[#CFDBD5]/50 mt-1 max-w-[250px]">
                                        Esta cotización no tiene una arquitectura generada.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cost */}
                    <div className="p-6 bg-gradient-to-br from-[#1F1F1F] to-[#242423] rounded-[1.5rem] border border-[#F5CB5C]/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <DollarSign className="w-32 h-32 text-[#F5CB5C]" />
                        </div>
                        <h3 className="text-sm font-bold text-[#F5CB5C] uppercase tracking-wider mb-2">Costo Estimado Mensual</h3>
                        <p className="text-4xl font-black text-[#E8EDDF] tracking-tight">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(quote.estimatedCost) || 0)}
                        </p>
                        {params.commercialDiscount > 0 && (
                            <div className="absolute bottom-4 right-4 bg-[#F5CB5C]/20 text-[#F5CB5C] px-3 py-1 rounded-full text-xs font-bold border border-[#F5CB5C]/30 flex items-center gap-2">
                                <Sparkles className="w-3 h-3" />
                                {params.commercialDiscount}% OFF
                            </div>
                        )}
                    </div>

                    {/* Technical Specs */}
                    <div className="space-y-4 pb-8">
                        <h3 className="text-lg font-bold text-[#E8EDDF] px-2 flex items-center gap-2">
                            Especificaciones Técnicas
                        </h3>
                        {/* Expanded Grid - Fixed 2 columns (4 rows) */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Row 1: Users & Data */}
                            <div className="p-4 bg-[#1F1F1F] rounded-2xl border border-[#2D2D2D] hover:border-[#F5CB5C]/30 transition-colors">
                                <span className="text-[10px] text-[#CFDBD5]/60 uppercase font-black block mb-2 tracking-widest">Usuarios</span>
                                <span className="text-xl font-bold text-[#E8EDDF]">{params.usersCount || 0}</span>
                            </div>
                            <div className="p-4 bg-[#1F1F1F] rounded-2xl border border-[#2D2D2D] hover:border-[#F5CB5C]/30 transition-colors">
                                <span className="text-[10px] text-[#CFDBD5]/60 uppercase font-black block mb-2 tracking-widest">Volumen</span>
                                <span className="text-xl font-bold text-[#E8EDDF]">{params.dataVolume || 'N/A'}</span>
                            </div>

                            {/* Row 2: Complexity & Frequency */}
                            <div className="p-4 bg-[#1F1F1F] rounded-2xl border border-[#2D2D2D] hover:border-[#F5CB5C]/30 transition-colors">
                                <span className="text-[10px] text-[#CFDBD5]/60 uppercase font-black block mb-2 tracking-widest">Complejidad</span>
                                <span className="text-lg font-medium text-[#F5CB5C] capitalize truncate" title={params.complexity || params.reportComplexity}>
                                    {params.complexity || params.reportComplexity || 'N/A'}
                                </span>
                            </div>
                            <div className="p-4 bg-[#1F1F1F] rounded-2xl border border-[#2D2D2D] hover:border-[#F5CB5C]/30 transition-colors">
                                <span className="text-[10px] text-[#CFDBD5]/60 uppercase font-black block mb-2 tracking-widest">Frecuencia</span>
                                <span className="text-lg font-medium text-[#F5CB5C] capitalize truncate" title={params.updateFrequency}>
                                    {params.updateFrequency || 'N/A'}
                                </span>
                            </div>

                            {/* Row 3: Pipelines & Notebooks */}
                            <div className="p-4 bg-[#1F1F1F] rounded-2xl border border-[#2D2D2D] hover:border-[#F5CB5C]/30 transition-colors">
                                <span className="text-[10px] text-[#CFDBD5]/60 uppercase font-black block mb-2 tracking-widest">Pipelines</span>
                                <span className="text-xl font-bold text-[#E8EDDF]">{params.pipelinesCount || 0}</span>
                            </div>
                            <div className="p-4 bg-[#1F1F1F] rounded-2xl border border-[#2D2D2D] hover:border-[#F5CB5C]/30 transition-colors">
                                <span className="text-[10px] text-[#CFDBD5]/60 uppercase font-black block mb-2 tracking-widest">Notebooks</span>
                                <span className="text-xl font-bold text-[#E8EDDF]">{params.notebooksCount || 0}</span>
                            </div>

                            {/* Row 4: Reports & Automations (if exist) */}
                            <div className="p-4 bg-[#1F1F1F] rounded-2xl border border-[#2D2D2D] hover:border-[#F5CB5C]/30 transition-colors">
                                <span className="text-[10px] text-[#CFDBD5]/60 uppercase font-black block mb-2 tracking-widest">Reportes</span>
                                <span className="text-xl font-bold text-[#E8EDDF]">{params.reportsCount || 0}</span>
                            </div>
                            <div className="p-4 bg-[#1F1F1F] rounded-2xl border border-[#2D2D2D] hover:border-[#F5CB5C]/30 transition-colors">
                                <span className="text-[10px] text-[#CFDBD5]/60 uppercase font-black block mb-2 tracking-widest">Automations</span>
                                <span className="text-xl font-bold text-[#E8EDDF]">{params.automationsCount || 0}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </SheetContent>
        </Sheet>
    )
}
