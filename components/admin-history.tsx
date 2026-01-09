'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

type Quote = {
    id: string
    clientName: string
    projectType: string
    estimatedCost: number
    createdAt: Date
    technicalParameters: string
    user?: {
        name: string | null
        email: string | null
    } | null
}

interface AdminHistoryProps {
    quotes: Quote[]
}

export function AdminHistory({ quotes: serverQuotes }: AdminHistoryProps) {
    const [mergedQuotes, setMergedQuotes] = useState<any[]>(serverQuotes || [])
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)

        // Load local quotes (Same key as Dashboard)
        const storageKey = 'quotes_v1_prod'
        const rawValue = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
        let localQuotes: any[] = []

        if (rawValue && rawValue !== "undefined" && rawValue !== "null") {
            try {
                const parsed = JSON.parse(rawValue)
                if (Array.isArray(parsed)) {
                    localQuotes = parsed
                }
            } catch (e) {
                console.error("Failed to load local quotes in admin", e)
            }
        }

        // Merge: Local + Server
        // We prioritize Local for this demo view so newly created items appear
        const combined = [...localQuotes, ...serverQuotes]

        // Deduplicate by ID
        const unique = Array.from(new Map(combined.map(item => [item?.id || Math.random(), item])).values())

        // Sort descending
        unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setMergedQuotes(unique)
    }, [serverQuotes])

    const handleExportExcel = () => {
        const dataToExport = mergedQuotes.map(q => {
            let params: any = {}
            try {
                params = JSON.parse(q.technicalParameters)
            } catch {
                params = q.params || {}
            }

            return {
                ID: q.id,
                Cliente: q.clientName,
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
        XLSX.writeFile(wb, `Cotizaciones_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    }

    if (!isClient) return null // Avoid hydration mismatch

    return (
        <Card className="rounded-[2rem] border border-[#2D2D2D] bg-[#171717] shadow-xl overflow-hidden mt-16">
            <CardHeader className="p-8 border-b border-[#2D2D2D] bg-[#171717] flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#171717] rounded-xl border border-[#2D2D2D]">
                        <FileSpreadsheet className="w-6 h-6 text-[#F5CB5C]" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-[#E8EDDF]">Trazabilidad</CardTitle>
                        <CardDescription className="text-[#CFDBD5]">
                            Historial completo de cotizaciones generadas ({mergedQuotes.length}).
                        </CardDescription>
                    </div>
                </div>
                <Button
                    onClick={handleExportExcel}
                    className="bg-[#171717] hover:bg-[#F5CB5C] hover:text-[#171717] text-[#E8EDDF] border border-[#F5CB5C]/30 hover:border-[#F5CB5C] rounded-xl h-10 px-6 font-bold transition-all shadow-[0_0_15px_rgba(51,53,51,0.5)] hover:shadow-[0_0_20px_rgba(245,203,92,0.3)]"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Excel
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-[#171717]">
                            <TableRow className="border-[#2D2D2D] hover:bg-transparent">
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider pl-8 h-12 w-[250px]">Cliente</TableHead>
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12">Proyecto</TableHead>
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12">Consultor</TableHead>
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12">Fecha</TableHead>
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12 text-right pr-8">Valor Estimado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mergedQuotes.map((quote) => (
                                <TableRow key={quote.id || Math.random()} className="border-[#2D2D2D] hover:bg-[#2D2D2D]/30 transition-colors group">
                                    <TableCell className="font-bold text-[#E8EDDF] pl-8 py-5">
                                        {quote.clientName || 'Sin Nombre'}
                                        <span className="block text-xs text-[#CFDBD5] font-normal mt-1 truncate max-w-[200px]">{quote.id?.toString().substring(0, 15)}...</span>
                                    </TableCell>
                                    <TableCell className="text-[#CFDBD5] py-5">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#171717] text-[#F5CB5C] border border-[#F5CB5C]/20">
                                            {quote.projectType || 'General'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-[#CFDBD5] py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[#E8EDDF]">
                                                {quote.user?.name || (quote.user?.email ? quote.user.email : (quote.userId === 'demo-user' ? 'Consultor Demo' : 'Sistema'))}
                                            </span>
                                            <span className="text-xs text-[#CFDBD5] opacity-60">
                                                {quote.user?.email || (quote.userId === 'demo-user' ? 'demo@cotizador.com' : '-')}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[#CFDBD5] py-5">
                                        {quote.createdAt ? format(new Date(quote.createdAt), "d MMM yyyy", { locale: es }) : '-'}
                                        <span className="block text-xs text-[#CFDBD5]">
                                            {quote.createdAt ? format(new Date(quote.createdAt), "HH:mm") : ''}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right pr-8 py-5">
                                        <span className="font-mono font-bold text-[#E8EDDF] text-lg group-hover:text-[#F5CB5C] transition-colors">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(quote.estimatedCost) || 0)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {mergedQuotes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-[#CFDBD5]">
                                        No hay cotizaciones registradas aún.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
