'use client'

import { useState, useEffect } from 'react'
import { Card } from "@/components/ui/card"
import { QuoteDetailsSheet } from '@/components/quote-details-sheet'
import { DeleteQuoteButton } from '@/components/delete-quote-button'
import { FileText } from "lucide-react"
import Link from 'next/link'
import { Button } from "@/components/ui/button"

export function DashboardQuotesList({ serverQuotes = [] }: { serverQuotes?: any[] }) {
    // Initialize with empty array to match potential empty server props,
    // actual data merging happens in useEffect to prevent hydration mismatch
    const [mergedQuotes, setMergedQuotes] = useState<any[]>(serverQuotes || [])
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)

        // Ensure we work with at least a valid array from server
        const safeServerQuotes = Array.isArray(serverQuotes) ? serverQuotes : []

        // Load local "Demo" quotes from browser storage
        const localQuotesRaw = localStorage.getItem('demo_quotes')
        let localQuotes: any[] = []

        if (localQuotesRaw) {
            try {
                const parsed = JSON.parse(localQuotesRaw)
                if (Array.isArray(parsed)) {
                    localQuotes = parsed
                }
            } catch (e) {
                console.error("Failed to load local quotes", e)
            }
        }

        // Merge: Local first (newer), then Server
        const combined = [...localQuotes, ...safeServerQuotes]

        // Deduplicate by ID
        const unique = Array.from(new Map(combined.map(item => [item?.id || Math.random(), item])).values())

        // Filter invalid items
        const validQuotes = unique.filter(q => q && q.createdAt)

        // Sort descending date
        validQuotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setMergedQuotes(validQuotes)

    }, [serverQuotes])

    // Handler to remove deleted items from UI immediately
    const handleDelete = (id: string) => {
        // Update State
        const updated = mergedQuotes.filter(q => q.id !== id)
        setMergedQuotes(updated)

        // Update Local Storage
        const localQuotesRaw = localStorage.getItem('demo_quotes')
        if (localQuotesRaw) {
            try {
                const local = JSON.parse(localQuotesRaw)
                if (Array.isArray(local)) {
                    const newLocal = local.filter((q: any) => q.id !== id)
                    localStorage.setItem('demo_quotes', JSON.stringify(newLocal))
                }
            } catch (e) { }
        }
    }

    // Hydration guard
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
        <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 text-xs font-bold text-[#CFDBD5] uppercase tracking-widest opacity-60 mb-2">
                <div className="col-span-4">Cliente / Proyecto</div>
                <div className="col-span-3">Fecha</div>
                <div className="col-span-3">Costo Estimado</div>
                <div className="col-span-2 text-right">Acciones</div>
            </div>

            {mergedQuotes.map((quote) => (
                <Card key={quote.id || Math.random()} className="bg-[#1F1F1F] border-[#2D2D2D] rounded-[1.5rem] p-6 hover:border-[#F5CB5C]/30 transition-all group">
                    <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4">
                            <h4 className="text-[#E8EDDF] font-bold text-lg truncate">{quote.clientName || 'Sin Nombre'}</h4>
                            <p className="text-[#CFDBD5] text-sm truncate opacity-70">
                                {(() => {
                                    try {
                                        return (JSON.parse(quote.technicalParameters) as any).description?.substring(0, 40)
                                    } catch { return 'Sin descripción' }
                                })()}...
                            </p>
                        </div>
                        <div className="col-span-3 text-[#CFDBD5] font-medium">
                            {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                        <div className="col-span-3">
                            <span className="text-[#F5CB5C] font-mono font-bold text-lg">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(quote.estimatedCost || 0)}
                            </span>
                            <span className="text-[#CFDBD5] text-xs ml-1">/ mes</span>
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                            {/* Safe check for quote before passing */}
                            {quote && <QuoteDetailsSheet quote={quote} />}
                            <div onClick={() => handleDelete(quote.id)}>
                                <DeleteQuoteButton quoteId={quote.id} quoteName={quote.clientName} />
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}
