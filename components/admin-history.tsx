'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { getAllQuotes } from '@/lib/actions'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

type Quote = {
    id: string
    clientName: string
    projectType: string
    estimatedCost: number
    createdAt: Date
    technicalParameters: string
}

export function AdminHistory() {
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getAllQuotes().then(data => {
            setQuotes(data)
            setLoading(false)
        })
    }, [])

    const handleExportExcel = () => {
        const dataToExport = quotes.map(q => {
            const params = JSON.parse(q.technicalParameters)
            return {
                ID: q.id,
                Cliente: q.clientName,
                Proyecto: q.projectType,
                Fecha: format(q.createdAt, 'dd/MM/yyyy HH:mm'),
                Costo_Estimado: q.estimatedCost,
                Criticidad: params?.criticitness?.enabled ? 'ALTA' : 'NORMAL',
                Complejidad: params?.complexity || 'N/A'
            }
        })

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(dataToExport)
        XLSX.utils.book_append_sheet(wb, ws, "Historial Cotizaciones")
        XLSX.writeFile(wb, `Cotizaciones_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    }

    if (loading) return <div className="p-12 text-center text-[#CFDBD5] animate-pulse">Cargando trazabilidad...</div>

    return (
        <Card className="rounded-[2rem] border border-[#2D2D2D] bg-[#171717] shadow-xl overflow-hidden">
            <CardHeader className="p-8 border-b border-[#2D2D2D] bg-[#171717] flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#171717] rounded-xl border border-[#2D2D2D]">
                        <FileSpreadsheet className="w-6 h-6 text-[#F5CB5C]" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-[#E8EDDF]">Trazabilidad</CardTitle>
                        <CardDescription className="text-[#CFDBD5]">
                            Historial completo de cotizaciones generadas.
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
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12">Fecha</TableHead>
                                <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12 text-right pr-8">Valor Estimado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotes.map((quote) => (
                                <TableRow key={quote.id} className="border-[#2D2D2D] hover:bg-[#2D2D2D]/30 transition-colors group">
                                    <TableCell className="font-bold text-[#E8EDDF] pl-8 py-6">
                                        {quote.clientName || 'Sin Nombre'}
                                        <span className="block text-xs text-[#CFDBD5] font-normal mt-1 truncate max-w-[200px]">{quote.id}</span>
                                    </TableCell>
                                    <TableCell className="text-[#CFDBD5]">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#171717] text-[#F5CB5C] border border-[#F5CB5C]/20">
                                            {quote.projectType || 'General'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-[#CFDBD5]">
                                        {format(new Date(quote.createdAt), "d MMM yyyy", { locale: es })}
                                        <span className="block text-xs text-[#CFDBD5]">{format(new Date(quote.createdAt), "HH:mm")}</span>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <span className="font-mono font-bold text-[#E8EDDF] text-lg group-hover:text-[#F5CB5C] transition-colors">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(quote.estimatedCost)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {quotes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-[#CFDBD5]">
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
