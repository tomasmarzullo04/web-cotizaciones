'use client'

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar, DollarSign, FileText, User } from "lucide-react"

interface QuoteDetailsSheetProps {
    quote: {
        id: string
        clientName: string
        projectType: string
        estimatedCost: number
        createdAt: Date
        technicalParameters: string
    }
}

export function QuoteDetailsSheet({ quote }: QuoteDetailsSheetProps) {
    const params = JSON.parse(quote.technicalParameters) || {}

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button size="sm" className="bg-[#333533] text-[#E8EDDF] hover:bg-[#E8EDDF] hover:text-[#171717] rounded-lg h-10 px-4 font-bold transition-all cursor-pointer">
                    Ver Detalle <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </SheetTrigger>
            <SheetContent className="bg-[#171717] border-l-[#2D2D2D] w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-8">
                    <SheetTitle className="text-2xl font-black text-[#E8EDDF]">Detalle de Cotización</SheetTitle>
                    <SheetDescription className="text-[#CFDBD5] text-base">
                        Información completa del proyecto y parámetros.
                    </SheetDescription>
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
                                <p className="text-sm text-[#CFDBD5] mt-1 opacity-70 leading-relaxed">{params.description || "Sin descripción"}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-[#171717] rounded-xl border border-[#2D2D2D]">
                                <Calendar className="w-6 h-6 text-[#CFDBD5]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-[#CFDBD5] uppercase tracking-wider mb-1">Fecha Creación</h3>
                                <p className="text-lg font-medium text-[#E8EDDF]">{new Date(quote.createdAt).toLocaleDateString('es-ES', { dateStyle: 'long' })}</p>
                            </div>
                        </div>
                    </div>

                    {/* Cost */}
                    <div className="p-6 bg-gradient-to-br from-[#1F1F1F] to-[#242423] rounded-[1.5rem] border border-[#F5CB5C]/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <DollarSign className="w-32 h-32 text-[#F5CB5C]" />
                        </div>
                        <h3 className="text-sm font-bold text-[#F5CB5C] uppercase tracking-wider mb-2">Costo Estimado Mensual</h3>
                        <p className="text-4xl font-black text-[#E8EDDF] tracking-tight">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(quote.estimatedCost)}
                        </p>
                    </div>

                    {/* Technical Specs */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-[#E8EDDF] px-2 flex items-center gap-2">
                            Especificaciones Técnicas
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-[#1F1F1F] rounded-2xl border border-[#2D2D2D]">
                                <span className="text-xs text-[#CFDBD5]/60 uppercase font-bold block mb-1">Usuarios</span>
                                <span className="text-lg font-medium text-[#E8EDDF]">{params.usersCount || 0}</span>
                            </div>
                            <div className="p-4 bg-[#1F1F1F] rounded-2xl border border-[#2D2D2D]">
                                <span className="text-xs text-[#CFDBD5]/60 uppercase font-bold block mb-1">Volumen Datos</span>
                                <span className="text-lg font-medium text-[#E8EDDF]">{params.dataVolume || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-[#1F1F1F] rounded-2xl border border-[#2D2D2D]">
                                <span className="text-xs text-[#CFDBD5]/60 uppercase font-bold block mb-1">Complejidad</span>
                                <span className="text-lg font-medium text-[#E8EDDF] capitalize">{params.reportComplexity || 'N/A'}</span>
                            </div>
                            <div className="p-4 bg-[#1F1F1F] rounded-2xl border border-[#2D2D2D]">
                                <span className="text-xs text-[#CFDBD5]/60 uppercase font-bold block mb-1">Frecuencia</span>
                                <span className="text-lg font-medium text-[#E8EDDF] capitalize">{params.updateFrequency || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </SheetContent>
        </Sheet>
    )
}
