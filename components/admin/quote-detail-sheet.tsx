"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Calendar, Building2, Briefcase, Loader2, AlertTriangle, User, Network, Activity, DollarSign, Tag, Wallet } from "lucide-react"
import { MermaidDiagram } from "@/components/mermaid-diagram"
import { getQuoteById } from "@/lib/actions"
import { toast } from "sonner"

interface QuoteDetailSheetProps {
    quoteId: string | null
    isOpen: boolean
    onClose: (open: boolean) => void
}

export function QuoteDetailSheet({ quoteId, isOpen, onClose }: QuoteDetailSheetProps) {
    const [quote, setQuote] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && quoteId) {
            setLoading(true)
            getQuoteById(quoteId)
                .then(data => {
                    setQuote(data)
                })
                .catch(err => {
                    console.error(err)
                    toast.error("Error al cargar detalles")
                })
                .finally(() => setLoading(false))
        } else {
            // Reset on close?
            if (!isOpen) setQuote(null)
        }
    }, [isOpen, quoteId])

    if (!isOpen) return null

    // Helper functions for content
    const parseDetails = (q: any) => {
        let det: any = {}
        try {
            det = JSON.parse(q.technicalParameters || '{}')
            if (q.staffingRequirements) {
                const extra = JSON.parse(q.staffingRequirements)
                // Handle both new array format and old object format
                if (Array.isArray(extra)) {
                    det.profiles = extra
                } else if (extra.profiles) {
                    det.profiles = extra.profiles
                }
            }
        } catch (e) {
            console.error(e)
        }
        return det
    }

    const details = quote ? parseDetails(quote) : {}
    const profiles = details.profiles || []

    // Totals logic
    const totals = {
        gross: details.grossTotal || 0,
        retention: details.retentionAmount || 0,
        net: details.finalTotal || quote?.estimatedCost || 0,
        discount: details.discountAmount || 0
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-[700px] lg:max-w-4xl overflow-y-auto bg-[#1a1a1a] text-[#E8EDDF] border-l border-[#333533] p-0">

                {loading || !quote ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-[#F5CB5C] animate-spin" />
                    </div>
                ) : (
                    <div className="flex flex-col min-h-full">
                        {/* Header Image/Gradient */}
                        <div className="relative h-32 bg-gradient-to-r from-[#242423] to-[#1D1D1C] flex items-center px-8 border-b border-[#333533]">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5CB5C]/5 blur-[60px] rounded-full pointer-events-none" />
                            <div className="relative z-10 w-full flex justify-between items-center mt-4">
                                <div>
                                    <Badge variant="outline" className="mb-2 bg-[#F5CB5C]/10 text-[#F5CB5C] border-[#F5CB5C]/20 uppercase tracking-widest text-[10px]">
                                        Vista Ejecutiva
                                    </Badge>
                                    <h2 className="text-xl font-bold text-white tracking-tight">{quote.projectType || 'Sin Título'}</h2>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-[#CFDBD5] opacity-50 font-mono mb-1">REF: {quote.id.substring(0, 8)}</div>
                                    <Badge
                                        className={`px-3 py-0.5 text-xs font-bold border rounded-full capitalize ${quote.status === 'APROBADA' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                            quote.status === 'RECHAZADA' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                                quote.status === 'ENVIADA' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                    'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                                            }`}
                                    >
                                        {quote.status.toLowerCase()}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 space-y-8 flex-1">
                            {/* Meta Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-[#CFDBD5] p-4 bg-[#242423]/50 rounded-xl border border-[#333533]">
                                <div className="flex items-center gap-3">
                                    <Building2 className="w-4 h-4 text-[#F5CB5C]" />
                                    <div>
                                        <div className="text-[10px] opacity-50 uppercase">Cliente</div>
                                        <div className="font-medium">{quote.clientName || 'Cliente Confidencial'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 text-[#F5CB5C]" />
                                    <div>
                                        <div className="text-[10px] opacity-50 uppercase">Consultor</div>
                                        <div className="font-medium">{quote.user?.name || 'Sistema'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-[#F5CB5C]" />
                                    <div>
                                        <div className="text-[10px] opacity-50 uppercase">Fecha</div>
                                        <div>{format(new Date(quote.createdAt), "d MMM, yyyy", { locale: es })}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Activity className="w-4 h-4 text-[#F5CB5C]" />
                                    <div>
                                        <div className="text-[10px] opacity-50 uppercase">Duración</div>
                                        <div>{details.durationValue} {details.durationUnit === 'months' ? 'Meses' : details.durationUnit === 'weeks' ? 'Semanas' : 'Días'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* SUSTAIN ARCHITECTURE (If Applicable) */}
                            {quote.serviceType === 'Sustain' && (quote.diagramDefinition || details.diagramDefinition) && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-[#F5CB5C] uppercase tracking-widest flex items-center gap-2 border-b border-[#333533] pb-2">
                                        <Network className="w-4 h-4" /> Arquitectura & Stack
                                    </h3>
                                    <Card className="bg-[#242423] border-[#333533] overflow-hidden p-4">
                                        <div className="bg-white/5 rounded-lg p-2 mb-4">
                                            <MermaidDiagram chart={quote.diagramDefinition || details.diagramDefinition} />
                                        </div>

                                        {/* Tech Stack List */}
                                        {details.sustainDetails?.techStack && details.sustainDetails.techStack.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {details.sustainDetails.techStack.map((tech: string) => (
                                                    <Badge key={tech} variant="secondary" className="bg-[#333533] text-[#CFDBD5] border border-[#4A4D4A] capitalize">
                                                        {tech.replace('_', ' ')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                </div>
                            )}

                            {/* TEAM BREAKDOWN */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-[#F5CB5C] uppercase tracking-widest flex items-center gap-2 border-b border-[#333533] pb-2">
                                    <span className="w-1 h-4 bg-[#F5CB5C] rounded-full" /> Desglose de Equipo
                                </h3>
                                <Card className="bg-[#242423] border-[#333533] overflow-hidden">
                                    <div className="grid grid-cols-12 gap-2 p-3 bg-[#333533]/50 text-[10px] font-bold text-[#CFDBD5] uppercase tracking-wider border-b border-[#333533]">
                                        <div className="col-span-4 pl-2">Perfil</div>
                                        <div className="col-span-2 text-center">Lvl</div>
                                        <div className="col-span-1 text-center">Cant</div>
                                        <div className="col-span-2 text-right">Tarifa</div>
                                        <div className="col-span-3 text-right pr-2">Total</div>
                                    </div>
                                    <div className="divide-y divide-[#333533]">
                                        {profiles.filter((p: any) => (p.count || 0) > 0).length > 0 ? (
                                            profiles.filter((p: any) => (p.count || 0) > 0).map((p: any, idx: number) => {
                                                const cost = p.price || p.cost || 0
                                                const total = cost * (p.count || 1)
                                                return (
                                                    <div key={idx} className="grid grid-cols-12 gap-2 p-3 text-sm hover:bg-[#333533]/30 transition-colors items-center">
                                                        <div className="col-span-4 font-medium text-white pl-2">
                                                            {p.role}
                                                            {p.skills && <div className="text-[10px] text-[#CFDBD5] mt-0.5 truncate max-w-[150px] opacity-70">{p.skills}</div>}
                                                        </div>
                                                        <div className="col-span-2 flex justify-center">
                                                            <Badge variant="outline" className={`border-0 font-mono text-[10px] px-1.5 py-0 ${p.seniority === 'Expert' ? 'bg-amber-500/10 text-amber-500' :
                                                                p.seniority === 'Sr' ? 'bg-purple-500/10 text-purple-500' :
                                                                    p.seniority === 'Med' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                                                                }`}>
                                                                {p.seniority || 'N/A'}
                                                            </Badge>
                                                        </div>
                                                        <div className="col-span-1 text-center text-[#CFDBD5] font-mono">{p.count}</div>
                                                        <div className="col-span-2 text-right font-mono text-[#CFDBD5] opacity-70">
                                                            ${cost.toLocaleString('en-US')}
                                                        </div>
                                                        <div className="col-span-3 text-right pr-2 font-mono text-[#F5CB5C]">
                                                            ${total.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div className="p-6 text-center text-[#CFDBD5] opacity-50 text-xs italic">
                                                Sin detalles de perfiles activos
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            {/* FINANCIAL SUMMARY */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 rounded-xl bg-[#242423]/50 border border-[#333533]">
                                    <div className="flex items-center gap-2 mb-3 text-[#CFDBD5]">
                                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                        <span className="text-xs font-bold uppercase">Notas</span>
                                    </div>
                                    <p className="text-xs text-[#CFDBD5]/60 leading-relaxed">
                                        Valores calculados según snapshot al momento de creación. Incluye impuestos si aplica.
                                    </p>
                                </div>

                                <Card className="bg-[#1D1D1C] border-[#333533] shadow-lg">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-center text-xs text-[#CFDBD5]">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="w-3 h-3 opacity-50" />
                                                <span>Subtotal</span>
                                            </div>
                                            <span className="font-mono">{details.currency || 'USD'} ${totals.gross.toLocaleString('en-US')}</span>
                                        </div>
                                        {totals.discount > 0 && (
                                            <div className="flex justify-between items-center text-xs text-green-400">
                                                <div className="flex items-center gap-2">
                                                    <Tag className="w-3 h-3 opacity-50" />
                                                    <span>Descuento</span>
                                                </div>
                                                <span className="font-mono">-{details.currency || 'USD'} ${totals.discount.toLocaleString('en-US')}</span>
                                            </div>
                                        )}
                                        <Separator className="bg-[#333533] my-2" />
                                        <div className="flex justify-between items-end">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-[#F5CB5C]">
                                                    <Wallet className="w-3 h-3" />
                                                    <span className="font-bold text-[10px] uppercase">Inversión Final</span>
                                                </div>
                                                <span className="text-[10px] text-[#CFDBD5]/50">Total Mensual Neto</span>
                                            </div>
                                            <span className="text-xl font-bold text-[#F5CB5C] font-mono">
                                                {details.currency || 'USD'} ${totals.net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
