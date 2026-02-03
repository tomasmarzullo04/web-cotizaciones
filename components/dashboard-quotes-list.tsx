'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from "@/components/ui/card"
import { QuoteDetailsSheet } from '@/components/quote-details-sheet'
import { DeleteQuoteButton } from '@/components/delete-quote-button'
import { FileText, Layers, Briefcase, Activity, DollarSign, LayoutGrid, Pencil } from "lucide-react"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const getStatusStyles = (status: string) => {
    switch ((status || '').toUpperCase()) {
        case 'ENVIADA': return "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
        case 'APROBADA': return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
        case 'RECHAZADA': return "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
        default: return "bg-slate-500/10 text-slate-400 border-slate-500/30 hover:bg-slate-500/20" // BORRADOR
    }
}

const getStatusTooltip = (status: string) => {
    switch ((status || '').toUpperCase()) {
        case 'ENVIADA': return "Enviada al cliente, esperando respuesta."
        case 'APROBADA': return "Cliente aceptó la propuesta. ¡Éxito!"
        case 'RECHAZADA': return "Esta cotización no fue aceptada por el cliente."
        default: return "Cotización en progreso, no visible para el cliente." // BORRADOR
    }
}

const getTypeBadgeStyles = (type: string) => {
    switch ((type || 'Proyecto')) {
        case 'Staffing': return "bg-blue-500/10 text-blue-400 border-blue-500/30"
        case 'Sustain': return "bg-orange-500/10 text-orange-400 border-orange-500/30"
        default: return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" // Proyecto
    }
}

export function DashboardQuotesList({ serverQuotes = [] }: { serverQuotes?: any[] }) {
    const [mergedQuotes, setMergedQuotes] = useState<any[]>(serverQuotes || [])
    const [isClient, setIsClient] = useState(false)
    const [activeTab, setActiveTab] = useState('All')

    // Realtime Subscription
    useEffect(() => {
        setIsClient(true)
        const validQuotes = Array.isArray(serverQuotes) ? serverQuotes : []
        validQuotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setMergedQuotes(validQuotes)

        // Init Supabase only if env vars exist
        // Import dynamically to avoid build errors if package missing (though we installed it)
        const initRealtime = async () => {
            try {
                const { createClient } = await import('@supabase/supabase-js')
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
                const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

                if (supabaseUrl && supabaseKey) {
                    console.log("Initializing Supabase Realtime...")
                    const supabase = createClient(supabaseUrl, supabaseKey)

                    const channel = supabase
                        .channel('dashboard-quotes')
                        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Quote' }, (payload) => {
                            console.log("Realtime Update Received:", payload)
                            // Update local state
                            setMergedQuotes(prev => prev.map(q =>
                                q.id === payload.new.id ? { ...q, ...payload.new } : q
                            ))
                        })
                        .subscribe()

                    return () => {
                        supabase.removeChannel(channel)
                    }
                }
            } catch (e) {
                console.warn("Supabase Realtime logic skipped:", e)
            }
        }

        initRealtime()

    }, [serverQuotes])

    const handleDelete = (id: string) => {
        const updated = mergedQuotes.filter(q => q.id !== id)
        setMergedQuotes(updated)
    }

    // Filter Logic
    const filteredQuotes = useMemo(() => {
        if (activeTab === 'All') return mergedQuotes
        return mergedQuotes.filter(q => (q.serviceType || 'Proyecto') === activeTab)
    }, [mergedQuotes, activeTab])

    // Metrics Logic
    const metrics = useMemo(() => {
        const total = filteredQuotes.reduce((acc, q) => acc + (Number(q.estimatedCost) || 0), 0)
        const count = filteredQuotes.length
        return { total, count }
    }, [filteredQuotes])

    if (!isClient) {
        return <div className="p-16 text-center text-[#CFDBD5] animate-pulse">Cargando cotizaciones...</div>
    }

    if (mergedQuotes.length === 0) {
        return (
            <Card className="bg-[#1F1F1F] border-[#2D2D2D] rounded-[2rem] p-16 text-center space-y-6">
                <div className="w-20 h-20 bg-[#2D2D2D] rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-10 h-10 text-[#CFDBD5]/50" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-[#E8EDDF] mb-2">Aún no has generado presupuestos</h3>
                    <p className="text-[#CFDBD5]">Comienza un nuevo proyecto para ver el historial aquí.</p>
                </div>
                <Link href="/quote/new">
                    <Button variant="outline" className="border-[#F5CB5C] text-[#F5CB5C] hover:bg-[#F5CB5C] hover:text-[#171717] rounded-xl h-12 px-8 font-bold mt-4">
                        Ir al Cotizador
                    </Button>
                </Link>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
            {/* Tabs & Metrics */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <Tabs defaultValue="All" className="w-full lg:w-auto" onValueChange={setActiveTab}>
                    <TabsList className="bg-[#1F1F1F] border border-[#2D2D2D] p-1 h-auto rounded-xl flex flex-wrap gap-1 md:gap-0">
                        <TabsTrigger value="All" className="data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#171717] rounded-lg px-4 md:px-6 py-2 flex-grow md:flex-grow-0">Todos</TabsTrigger>
                        <TabsTrigger value="Proyecto" className="data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#171717] rounded-lg px-4 md:px-6 py-2 flex-grow md:flex-grow-0">Proyectos</TabsTrigger>
                        <TabsTrigger value="Staffing" className="data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#171717] rounded-lg px-4 md:px-6 py-2 flex-grow md:flex-grow-0">Staffing</TabsTrigger>
                        <TabsTrigger value="Sustain" className="data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#171717] rounded-lg px-4 md:px-6 py-2 flex-grow md:flex-grow-0">Sustain</TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Summary Widget */}
                <Card className="bg-[#1F1F1F] border-[#2D2D2D] px-4 md:px-6 py-3 flex flex-col md:flex-row items-center gap-4 md:gap-6 rounded-2xl w-full lg:w-auto">
                    <div className="flex items-center gap-3 border-b md:border-b-0 md:border-r border-[#2D2D2D] pb-3 md:pb-0 pr-0 md:pr-6 w-full md:w-auto">
                        <div className="p-2 bg-[#2D2D2D] rounded-lg">
                            <LayoutGrid className="w-5 h-5 text-[#CFDBD5]" />
                        </div>
                        <div>
                            <p className="text-[10px] text-[#CFDBD5] uppercase font-bold tracking-widest">Cotizaciones</p>
                            <p className="text-xl font-bold text-[#E8EDDF]">{metrics.count}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="p-2 bg-[#F5CB5C]/10 rounded-lg">
                            <DollarSign className="w-5 h-5 text-[#F5CB5C]" />
                        </div>
                        <div>
                            <p className="text-[10px] text-[#CFDBD5] uppercase font-bold tracking-widest">Valor Estimado</p>
                            <p className="text-xl font-bold text-[#F5CB5C]">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(metrics.total)}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Dynamic Grid */}
            <div className="space-y-4">
                {/* Header - Hidden on Mobile */}
                <div className={`hidden md:grid gap-4 px-6 text-xs font-bold text-[#CFDBD5] uppercase tracking-widest opacity-60 mb-2 items-center ${activeTab === 'All' ? 'grid-cols-12' : 'grid-cols-12'}`}>
                    <div className="col-span-3">Cliente / Proyecto</div>
                    <div className="col-span-2">Tipo</div>
                    <div className="col-span-3">
                        {activeTab === 'Staffing' ? 'Perfiles' :
                            activeTab === 'Sustain' ? 'Nivel SLA' :
                                activeTab === 'Proyecto' ? 'Complejidad' : 'Detalle'}
                    </div>
                    <div className="col-span-2">Fecha</div>
                    <div className="col-span-2 text-right">Inversión Estimada</div>
                </div>

                {filteredQuotes.map((quote) => {
                    // Parse params safely
                    let params: any = {}
                    try { params = quote.technicalParameters ? JSON.parse(quote.technicalParameters) : (quote.params || {}) } catch { }

                    return (
                        <Card key={quote.id || Math.random()} className="bg-[#1F1F1F] border-[#2D2D2D] rounded-[1.5rem] p-4 hover:border-[#F5CB5C]/50 hover:shadow-[0_0_20px_rgba(245,203,92,0.1)] transition-all duration-300 group cursor-default">
                            {/* Mobile Layout (Flex Column) / Desktop Layout (Grid 12) */}
                            <div className="flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center">

                                {/* 1. Client & Name */}
                                <div className="w-full md:col-span-3 flex justify-between md:block items-start">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-[#E8EDDF] font-bold text-lg md:text-base truncate max-w-[200px] md:max-w-[180px]" title={quote.clientName}>{quote.clientName || 'Sin Nombre'}</h4>
                                        </div>
                                        <div className="text-[#CFDBD5] text-sm md:text-xs opacity-70 mt-1 truncate max-w-[200px] md:max-w-[180px]" title={quote.projectType}>
                                            {quote.projectType}
                                        </div>
                                    </div>
                                    {/* Mobile Only Status Badge (Top Right) */}
                                    <div className="md:hidden">
                                        <Badge variant="outline" className={`${getStatusStyles(quote.status)} text-[10px] px-2 h-5 flex items-center gap-1`}>
                                            {(quote.status || 'BORRADOR')}
                                            {quote.status === 'RECHAZADA' && quote.adminComment && (
                                                <div className="relative group p-0.5" onClick={(e) => {
                                                    // On mobile, maybe click to toggle? For now simple hover/active
                                                    e.stopPropagation()
                                                }}>
                                                    <Activity className="w-3 h-3 text-red-400" />
                                                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-[#242423] border border-[#2D2D2D] rounded-lg text-xs text-[#CFDBD5] hidden group-hover:block z-50 shadow-xl">
                                                        {quote.adminComment}
                                                    </div>
                                                </div>
                                            )}
                                        </Badge>
                                    </div>
                                </div>

                                {/* 2. Type & Status (Desktop) */}
                                <div className="w-full md:col-span-2 flex flex-row md:flex-col items-center md:items-start gap-2 justify-between md:justify-start">
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className={`${getTypeBadgeStyles(quote.serviceType)}`}>
                                            {quote.serviceType || 'Proyecto'}
                                        </Badge>
                                        {/* Status Badge (Desktop) */}
                                        <Badge variant="outline" className={`hidden md:inline-flex ${getStatusStyles(quote.status)} text-[10px] px-2 h-5 flex items-center gap-1`}>
                                            {(quote.status || 'BORRADOR')}
                                            {quote.status === 'RECHAZADA' && quote.adminComment && (
                                                <div className="relative group p-0.5">
                                                    <Activity className="w-3 h-3 text-red-400 cursor-help" />
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#242423] border border-[#2D2D2D] rounded-lg text-xs text-[#CFDBD5] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                                        {quote.adminComment}
                                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#242423] border-r border-b border-[#2D2D2D] rotate-45"></div>
                                                    </div>
                                                </div>
                                            )}
                                        </Badge>
                                    </div>
                                </div>

                                {/* 3. Dynamic Column */}
                                <div className="w-full md:col-span-3 text-[#CFDBD5] text-sm pl-1 md:pl-0 border-l-2 border-[#333533] md:border-l-0 md:border-none">
                                    {(() => {
                                        if (quote.serviceType === 'Staffing' || activeTab === 'Staffing') {
                                            const profiles = params.staffingDetails?.profiles || []
                                            if (profiles.length === 0) return <span className="opacity-50 text-xs">-</span>
                                            return <div className="pl-2 md:pl-0">{maxProfiles(profiles)}</div>
                                        }
                                        if (quote.serviceType === 'Sustain' || activeTab === 'Sustain') {
                                            return (
                                                <div className="flex flex-col pl-2 md:pl-0">
                                                    <span className="font-bold text-[#E8EDDF]">{params.criticitness?.level || 'Standard'}</span>
                                                    <span className="text-xs opacity-60">{params.sustainDetails?.operationHours || 'Business'}</span>
                                                </div>
                                            )
                                        }
                                        // Default / Project
                                        return (
                                            <div className="flex flex-col pl-2 md:pl-0">
                                                <span className="font-bold text-[#E8EDDF] capitalize">{params.complexity?.toLowerCase() || 'N/A'}</span>
                                                {params.techStack?.length > 0 && <span className="text-xs opacity-60">{params.techStack.length} Tecnologías</span>}
                                            </div>
                                        )
                                    })()}
                                </div>

                                {/* 4. Date */}
                                <div className="hidden md:block col-span-2 text-[#CFDBD5] text-sm font-mono">
                                    {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '-'}
                                </div>

                                {/* 5. Cost & Actions */}
                                <div className="w-full md:col-span-2 flex items-center justify-between md:justify-end gap-3 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-[#333533] md:border-t-0">
                                    <div className="md:hidden text-[#CFDBD5] text-xs font-mono">
                                        {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '-'}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <span className="text-[#F5CB5C] font-mono font-bold text-lg md:text-base">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(quote.estimatedCost) || 0)}
                                        </span>

                                        <div className="flex gap-3 items-center">
                                            {quote && (
                                                <QuoteDetailsSheet
                                                    quote={{
                                                        ...quote,
                                                        estimatedCost: Number(quote.estimatedCost) || 0,
                                                        status: quote.status || 'BORRADOR'
                                                    }}
                                                    onQuoteUpdated={(updated) => {
                                                        const newQuotes = mergedQuotes.map(q => q.id === updated.id ? { ...q, status: updated.status } : q)
                                                        setMergedQuotes(newQuotes)
                                                    }}
                                                />
                                            )}

                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Link href={`/quote/${quote.id}`}>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-[#CFDBD5] hover:text-[#F5CB5C] hover:bg-[#F5CB5C]/10 rounded-lg hover:scale-105 transition-all duration-200">
                                                            <Pencil className="h-4 w-4" />
                                                            <span className="sr-only">Editar Cotización</span>
                                                        </Button>
                                                    </Link>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-2 text-xs bg-[#1F1F1F] text-[#CFDBD5] border-[#2D2D2D]">
                                                    Editar Cotización
                                                </PopoverContent>
                                            </Popover>

                                            <DeleteQuoteButton
                                                quoteId={quote.id}
                                                quoteName={quote.clientName}
                                                onSuccess={() => handleDelete(quote.id)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}

function maxProfiles(profiles: any[]) {
    if (!profiles.length) return null
    const first = profiles[0]
    const more = profiles.length - 1
    return (
        <div className="flex items-center gap-2">
            <span className="font-medium text-[#E8EDDF]">{first.count}x {first.role}</span>
            {more > 0 && <Badge variant="secondary" className="bg-[#333533] text-[10px] h-5 px-1.5">+{more}</Badge>}
        </div>
    )
}
