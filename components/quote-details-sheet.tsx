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
import { ArrowRight, Calendar, DollarSign, FileText, User, Edit, Save, X, Loader2, Network, Download, Sparkles } from "lucide-react"
import { MermaidDiagram } from "./mermaid-diagram"
import { updateQuoteDiagram, updateQuoteStatus } from "@/lib/actions"
import { generateMermaidUpdate } from "@/lib/ai"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface QuoteDetailsSheetProps {
    quote: {
        id: string
        clientName: string
        projectType: string
        estimatedCost: number
        createdAt: Date | string
        technicalParameters: string
        diagramDefinition?: string
        status?: string
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
    const [status, setStatus] = useState(quote.status || 'BORRADOR')
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
            setStatus(quote.status || 'BORRADOR')
            alert("Error al actualizar estado")
            // Revert parent too
            if (onQuoteUpdated) {
                onQuoteUpdated({ ...quote, status: quote.status || 'BORRADOR' })
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
            <SheetContent className="bg-[#171717] border-l-[#2D2D2D] w-[400px] sm:w-[600px] md:w-[800px] overflow-y-auto">
                <SheetHeader className="mb-8 space-y-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <SheetTitle className="text-2xl font-black text-[#E8EDDF]">Detalle de Cotización</SheetTitle>
                            <SheetDescription className="text-[#CFDBD5] text-base">
                                Información completa del proyecto y parámetros.
                            </SheetDescription>
                        </div>
                        <div className="w-[180px]">
                            <Select value={status} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
                                <SelectTrigger className="bg-[#1F1F1F] border-[#2D2D2D] text-[#E8EDDF] font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1F1F1F] border-[#2D2D2D] text-[#E8EDDF]">
                                    <SelectItem value="BORRADOR">Borrador</SelectItem>
                                    <SelectItem value="ENVIADA">Enviada</SelectItem>
                                    <SelectItem value="APROBADA">Aprobada</SelectItem>
                                    <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </SheetHeader>

                <div className="space-y-8">
                    {/* Main Info */}
                    <div className="p-6 bg-[#1F1F1F] rounded-[1.5rem] border border-[#2D2D2D] space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-[#171717] rounded-xl border border-[#2D2D2D]">
                                <User className="w-6 h-6 text-[#F5CB5C]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-[#CFDBD5] uppercase tracking-wider mb-1">Cliente</h3>
                                <p className="text-xl font-bold text-[#E8EDDF]">{quote.clientName}</p>
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

                    {/* Architecture Diagram Editor */}
                    <div className="p-6 bg-[#1F1F1F] rounded-[1.5rem] border border-[#2D2D2D] flex flex-col gap-6 group relative">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-[#E8EDDF] flex items-center gap-2">
                                <Network className="w-5 h-5 text-[#F5CB5C]" />
                                Arquitectura Propuesta
                            </h3>
                            {/* Header Actions - Edit Only */}
                            {quote.diagramDefinition && (
                                !isEditingDiagram ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setEditedDiagramCode(quote.diagramDefinition || '')
                                            setIsEditingDiagram(true)
                                        }}
                                        className="text-[#F5CB5C] hover:text-[#E8EDDF] hover:bg-[#F5CB5C]/10"
                                    >
                                        <Edit className="w-4 h-4 mr-2" /> Editar
                                    </Button>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsEditingDiagram(false)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                            disabled={isSavingDiagram}
                                        >
                                            <X className="w-4 h-4 mr-2" /> Cancelar
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSaveDiagram}
                                            className="bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C] font-bold"
                                            disabled={isSavingDiagram}
                                        >
                                            {isSavingDiagram ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Guardar
                                        </Button>
                                    </div>
                                )
                            )}
                        </div>

                        {/* AI Assistant Input */}
                        {!isEditingDiagram && (
                            <div className="relative animate-in fade-in slide-in-from-top-2 duration-500">
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
                        )}

                        {quote.diagramDefinition || isEditingDiagram ? (
                            isEditingDiagram ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#CFDBD5] uppercase">Código Mermaid</label>
                                        <Textarea
                                            value={editedDiagramCode}
                                            onChange={(e) => setEditedDiagramCode(e.target.value)}
                                            className="font-mono text-xs bg-[#171717] border-[#2D2D2D] text-[#E8EDDF] resize-none h-[300px] focus-visible:ring-[#F5CB5C]"
                                        />
                                        <p className="text-[10px] text-[#CFDBD5]/50">
                                            Edita los nodos y conexiones para actualizar el diagrama en tiempo real.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-[#CFDBD5] uppercase">Vista Previa</label>
                                        <div className="bg-white rounded-xl overflow-hidden h-[300px] flex items-center justify-center border border-[#2D2D2D]">
                                            <div className="scale-75 origin-center w-full">
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

                                    {/* Download Button - Bottom Full Width */}
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

                    {/* Cost */}
                    <div className="p-6 bg-gradient-to-br from-[#1F1F1F] to-[#242423] rounded-[1.5rem] border border-[#F5CB5C]/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <DollarSign className="w-32 h-32 text-[#F5CB5C]" />
                        </div>
                        <h3 className="text-sm font-bold text-[#F5CB5C] uppercase tracking-wider mb-2">Costo Estimado Mensual</h3>
                        <p className="text-4xl font-black text-[#E8EDDF] tracking-tight">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(quote.estimatedCost) || 0)}
                        </p>
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
