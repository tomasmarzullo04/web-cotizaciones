'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, FileSpreadsheet, LayoutGrid, DollarSign, Search, FilterX, Activity } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminReviewModal } from "@/components/admin-review-modal"

type Quote = {
    id: string
    clientName: string
    projectType: string
    estimatedCost: number
    createdAt: Date
    technicalParameters: string
    status?: string
    serviceType?: string
    user?: {
        name: string | null
        email: string | null
    } | null
}

interface AdminHistoryProps {
    quotes: Quote[]
    consultants?: { name: string | null, email: string | null }[]
}

const getStatusStyles = (status: string) => {
    switch ((status || '').toUpperCase()) {
        case 'ENVIADA': return "bg-blue-500/10 text-blue-400 border-blue-500/30"
        case 'APROBADA': return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
        case 'RECHAZADA': return "bg-red-500/10 text-red-400 border-red-500/30"
        default: return "bg-slate-500/10 text-slate-400 border-slate-500/30"
    }
}

const getTypeBadgeStyles = (type: string) => {
    switch ((type || 'Proyecto')) {
        case 'Staffing': return "bg-blue-500/10 text-blue-400 border-blue-500/30"
        case 'Sustain': return "bg-orange-500/10 text-orange-400 border-orange-500/30"
        default: return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    }
}

export function AdminHistory({ quotes: serverQuotes, consultants: serverConsultants = [] }: AdminHistoryProps) {
    const [mergedQuotes, setMergedQuotes] = useState<any[]>(serverQuotes || [])
    const [isClient, setIsClient] = useState(false)
    const [activeTab, setActiveTab] = useState('All')

    // Filters Input State
    const [consultantFilter, setConsultantFilter] = useState("ALL")
    const [clientQuery, setClientQuery] = useState("")
    const [minAmount, setMinAmount] = useState("")
    const [maxAmount, setMaxAmount] = useState("")

    // Applied Filters (Actual Filter State)
    const [appliedFilters, setAppliedFilters] = useState({
        consultant: "ALL",
        client: "",
        min: "",
        max: ""
    })
    const [isFiltering, setIsFiltering] = useState(false)

    // Modal State
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)

    const handleApplyFilters = () => {
        setIsFiltering(true)
        // Simulate a small delay for better UX interactions
        setTimeout(() => {
            setAppliedFilters({
                consultant: consultantFilter,
                client: clientQuery,
                min: minAmount,
                max: maxAmount
            })
            setIsFiltering(false)
        }, 600)
    }

    useEffect(() => {
        setIsClient(true)
        const validQuotes = Array.isArray(serverQuotes) ? serverQuotes : []
        validQuotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setMergedQuotes(validQuotes)
    }, [serverQuotes])

    // Derive Unique Consultants (Backend + Existing in Quotes)
    const uniqueConsultants = useMemo(() => {
        const unique = new Set<string>()

        // 1. From Backend List
        serverConsultants.forEach(c => {
            if (c.name) unique.add(c.name)
            else if (c.email) unique.add(c.email)
        })

        // 2. From Current Quotes (in case of deleted users or history)
        mergedQuotes.forEach(q => {
            const name = q.user?.name || q.user?.email
            if (name) unique.add(name)
        })

        return Array.from(unique).sort()
    }, [mergedQuotes, serverConsultants])

    // Filter Logic
    const filteredQuotes = useMemo(() => {
        return mergedQuotes.filter(q => {
            // 1. Service Type (Tab)
            if (activeTab !== 'All' && (q.serviceType || 'Proyecto') !== activeTab) return false

            // 2. Consultant
            const cName = q.user?.name || q.user?.email || "Sistema"
            if (appliedFilters.consultant !== "ALL" && cName !== appliedFilters.consultant) return false

            // 3. Client Name
            if (appliedFilters.client && !q.clientName?.toLowerCase().includes(appliedFilters.client.toLowerCase())) return false

            // 4. Amount Range
            const cost = Number(q.estimatedCost) || 0
            if (appliedFilters.min && cost < Number(appliedFilters.min)) return false
            if (appliedFilters.max && cost > Number(appliedFilters.max)) return false

            return true
        })
    }, [mergedQuotes, activeTab, appliedFilters])

    // Metrics Logic
    const metrics = useMemo(() => {
        const total = filteredQuotes.reduce((acc, q) => acc + (Number(q.estimatedCost) || 0), 0)
        const count = filteredQuotes.length
        return { total, count }
    }, [filteredQuotes])

    const handleExportExcel = () => {
        const dataToExport = filteredQuotes.map(q => {
            let params: any = {}
            try {
                params = JSON.parse(q.technicalParameters)
            } catch {
                params = q.params || {}
            }

            return {
                ID: q.id,
                Cliente: q.clientName,
                Tipo: q.serviceType || 'Proyecto',
                Estado: q.status || 'BORRADOR',
                Proyecto: q.projectType,
                Fecha: q.createdAt ? format(new Date(q.createdAt), 'dd/MM/yyyy HH:mm') : '-',
                Costo_Estimado: q.estimatedCost,
                Consultor: q.user?.name || q.user?.email || (q.userId === 'demo-user' ? 'Consultor Demo' : 'Sistema'),
                Criticidad: params?.criticitness?.enabled ? 'ALTA' : 'NORMAL',
                Complejidad: params?.complexity || 'N/A'
            }
        })

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(dataToExport)
        XLSX.utils.book_append_sheet(wb, ws, "Historial Cotizaciones")
        XLSX.writeFile(wb, `Cotizaciones_Admin_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    }

    if (!isClient) return null

    return (
        <Card className="rounded-[2rem] border border-[#2D2D2D] bg-[#171717] shadow-xl overflow-hidden mt-8">
            <CardHeader className="p-8 border-b border-[#2D2D2D] bg-[#171717] space-y-8">
                {/* Header & Metrics */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#171717] rounded-xl border border-[#2D2D2D]">
                            <FileSpreadsheet className="w-6 h-6 text-[#F5CB5C]" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold text-[#E8EDDF]">Trazabilidad Total</CardTitle>
                            <CardDescription className="text-[#CFDBD5]">
                                Gestión y auditoría de todas las cotizaciones del sistema.
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Summary Widget */}
                        <div className="hidden md:flex items-center gap-6 bg-[#242423] px-6 py-2 rounded-2xl border border-[#2D2D2D]">
                            <div className="flex items-center gap-3 border-r border-[#CFDBD5]/10 pr-6">
                                <LayoutGrid className="w-4 h-4 text-[#CFDBD5]" />
                                <div>
                                    <p className="text-[10px] text-[#CFDBD5] uppercase font-bold">Volumen</p>
                                    <p className="text-lg font-bold text-[#E8EDDF] leading-none">{metrics.count}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <DollarSign className="w-4 h-4 text-[#F5CB5C]" />
                                <div>
                                    <p className="text-[10px] text-[#CFDBD5] uppercase font-bold">Valor Total</p>
                                    <p className="text-lg font-bold text-[#F5CB5C] leading-none">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(metrics.total)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleExportExcel}
                            className="bg-[#171717] hover:bg-[#F5CB5C] hover:text-[#171717] text-[#E8EDDF] border border-[#F5CB5C]/30 hover:border-[#F5CB5C] rounded-xl h-12 px-6 font-bold transition-all shadow-[0_0_15px_rgba(51,53,51,0.5)] hover:shadow-[0_0_20px_rgba(245,203,92,0.3)]"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Exportar
                        </Button>
                    </div>
                </div>

                {/* FILTERS BAR */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#242423]/50 rounded-2xl border border-[#2D2D2D]">
                    {/* Consultant Filter */}
                    <div>
                        <Select value={consultantFilter} onValueChange={setConsultantFilter}>
                            <SelectTrigger className="bg-[#171717] border-[#4A4D4A] text-[#E8EDDF] h-10 rounded-xl focus:border-[#F5CB5C]">
                                <SelectValue placeholder="Filtrar por Consultor" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                <SelectItem value="ALL">Todos los Consultores</SelectItem>
                                {uniqueConsultants.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Client Search */}
                    <div className="relative">
                        <Input
                            placeholder="Buscar por empresa..."
                            value={clientQuery}
                            onChange={(e) => setClientQuery(e.target.value)}
                            className="bg-[#171717] border-[#4A4D4A] text-[#E8EDDF] h-10 rounded-xl pr-10 focus:border-[#F5CB5C] placeholder:text-[#CFDBD5]/50"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CFDBD5] pointer-events-none">
                            <Search className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Amount Range */}
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Min $"
                            type="number"
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            className="bg-[#171717] border-[#4A4D4A] text-[#E8EDDF] h-10 rounded-xl focus:border-[#F5CB5C] placeholder:text-[#CFDBD5]/50"
                        />
                        <span className="text-[#CFDBD5]">-</span>
                        <Input
                            placeholder="Max $"
                            type="number"
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value)}
                            className="bg-[#171717] border-[#4A4D4A] text-[#E8EDDF] h-10 rounded-xl focus:border-[#F5CB5C] placeholder:text-[#CFDBD5]/50"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleApplyFilters}
                            disabled={isFiltering}
                            className="bg-[#F5CB5C] text-[#171717] hover:bg-[#F5CB5C]/90 font-bold h-10 px-6 rounded-xl flex-1 transition-all"
                        >
                            {isFiltering ? (
                                <Activity className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Search className="w-4 h-4 mr-2" />
                            )}
                            {isFiltering ? "..." : "Aplicar"}
                        </Button>

                        <Button
                            variant="ghost"
                            onClick={() => {
                                setConsultantFilter("ALL")
                                setClientQuery("")
                                setMinAmount("")
                                setMaxAmount("")
                                setActiveTab("All")
                                setAppliedFilters({
                                    consultant: "ALL",
                                    client: "",
                                    min: "",
                                    max: ""
                                })
                            }}
                            className="text-[#CFDBD5] hover:text-[#F5CB5C] hover:bg-[#F5CB5C]/10 h-10 w-10 p-0 rounded-xl border border-transparent hover:border-[#F5CB5C]/30"
                            title="Limpiar Filtros"
                        >
                            <FilterX className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="w-full">
                    <Tabs defaultValue="All" className="w-full" onValueChange={setActiveTab}>
                        <TabsList className="bg-[#242423] border border-[#2D2D2D] p-1 h-auto rounded-xl inline-flex">
                            <TabsTrigger value="All" className="data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#171717] rounded-lg px-4 py-2 text-xs">Todos</TabsTrigger>
                            <TabsTrigger value="Proyecto" className="data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#171717] rounded-lg px-4 py-2 text-xs">Proyectos</TabsTrigger>
                            <TabsTrigger value="Staffing" className="data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#171717] rounded-lg px-4 py-2 text-xs">Staffing</TabsTrigger>
                            <TabsTrigger value="Sustain" className="data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#171717] rounded-lg px-4 py-2 text-xs">Sustain</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-[#1F1F1F]">
                            <TableRow className="border-[#2D2D2D] hover:bg-transparent">
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider pl-8 h-12 w-[250px]">Cliente</TableHead>
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12">Tipo</TableHead>
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12">
                                    {activeTab === 'Staffing' ? 'Perfiles' :
                                        activeTab === 'Sustain' ? 'Nivel SLA' :
                                            activeTab === 'Proyecto' ? 'Complejidad' : 'Detalle'}
                                </TableHead>
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12">Consultor</TableHead>
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12">Estado</TableHead>
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12 text-right pr-8">Valor Estimado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredQuotes.map((quote) => {
                                let params: any = {}
                                try { params = quote.technicalParameters ? JSON.parse(quote.technicalParameters) : (quote.params || {}) } catch { }

                                return (
                                    <TableRow
                                        key={quote.id || Math.random()}
                                        className="border-[#2D2D2D] hover:bg-[#2D2D2D]/30 transition-colors group cursor-pointer"
                                        onClick={() => {
                                            setSelectedQuote(quote)
                                            setIsReviewModalOpen(true)
                                        }}
                                    >
                                        {/* Client */}
                                        <TableCell className="font-bold text-[#E8EDDF] pl-8 py-5">
                                            {quote.clientName || 'Sin Nombre'}
                                            <span className="block text-xs text-[#CFDBD5] font-normal mt-1 truncate max-w-[200px]">{quote.projectType}</span>
                                        </TableCell>

                                        {/* Type */}
                                        <TableCell className="text-[#CFDBD5] py-5">
                                            <Badge variant="outline" className={`${getTypeBadgeStyles(quote.serviceType)} text-[10px] px-2`}>
                                                {quote.serviceType || 'Proyecto'}
                                            </Badge>
                                        </TableCell>

                                        {/* Dynamic Column */}
                                        <TableCell className="text-[#CFDBD5] py-5 text-sm">
                                            {(() => {
                                                if (quote.serviceType === 'Staffing' || activeTab === 'Staffing') {
                                                    const profiles = params.staffingDetails?.profiles || []
                                                    if (profiles.length === 0) return <span className="opacity-50">-</span>
                                                    return (
                                                        <span className="text-[#E8EDDF]">{profiles[0]?.count}x {profiles[0]?.role} {profiles.length > 1 && `+${profiles.length - 1}`}</span>
                                                    )
                                                }
                                                if (quote.serviceType === 'Sustain' || activeTab === 'Sustain') {
                                                    return (
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-[#E8EDDF]">{params.criticitness?.level || 'Standard'}</span>
                                                            <span className="text-xs opacity-60">{params.sustainDetails?.operationHours || 'Business'}</span>
                                                        </div>
                                                    )
                                                }
                                                // Default / Project
                                                return (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-[#E8EDDF] capitalize">{params.complexity?.toLowerCase() || 'N/A'}</span>
                                                        {params.techStack?.length > 0 && <span className="text-xs opacity-60">{params.techStack.length} Tecnologías</span>}
                                                    </div>
                                                )
                                            })()}
                                        </TableCell>

                                        {/* Consultant */}
                                        <TableCell className="text-[#CFDBD5] py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[#E8EDDF] text-sm">
                                                    {quote.user?.name || (quote.user?.email ? quote.user.email.split('@')[0] : 'Sistema')}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="text-[#CFDBD5] py-5">
                                            <Badge variant="outline" className={`${getStatusStyles(quote.status)} text-[10px] px-2 h-5`}>
                                                {(quote.status || 'BORRADOR').toUpperCase()}
                                            </Badge>
                                        </TableCell>

                                        {/* Value */}
                                        <TableCell className="text-right pr-8 py-5">
                                            <span className="font-mono font-bold text-[#E8EDDF] text-base group-hover:text-[#F5CB5C] transition-colors">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(quote.estimatedCost) || 0)}
                                            </span>
                                            <span className="block text-xs text-[#CFDBD5] mt-1">
                                                {quote.createdAt ? format(new Date(quote.createdAt), "d MMM", { locale: es }) : '-'}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {mergedQuotes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-[#CFDBD5]">
                                        No hay cotizaciones registradas aún.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <AdminReviewModal
                quote={selectedQuote}
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onStatusChange={() => {
                    // Optional: refresh data or just let revalidatePath handle it via nextjs
                    // But for immediate feedback we might want to update local state too
                    if (selectedQuote) {
                        // Optimistic update or just rely on revalidate
                    }
                }}
            />
        </Card>
    )
}
