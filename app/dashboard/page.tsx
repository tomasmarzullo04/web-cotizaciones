import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { PlusCircle, FileText, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { getUserQuotes } from '@/lib/actions'
import { DeleteQuoteButton } from '@/components/delete-quote-button'
import { QuoteDetailsSheet } from '@/components/quote-details-sheet'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const quotes = await getUserQuotes()

    return (
        <main className="min-h-screen bg-[#171717] pt-32 pb-12 px-6">
            <div className="container mx-auto max-w-7xl space-y-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-[#E8EDDF] tracking-tight">Mis Cotizaciones</h1>
                        <p className="text-[#CFDBD5] mt-2 text-lg">Historial de proyectos y presupuestos generados.</p>
                    </div>
                    <Link href="/quote/new">
                        <Button className="bg-[#F5CB5C] text-[#171717] hover:bg-[#E0B84C] font-bold rounded-xl h-12 px-8 shadow-[0_0_20px_rgba(245,203,92,0.2)] transition-all flex items-center gap-2">
                            <PlusCircle className="w-5 h-5" /> Nueva Estimación
                        </Button>
                    </Link>
                </div>

                {/* Quotes List */}
                {quotes.length === 0 ? (
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
                ) : (
                    <div className="space-y-4">
                        {/* Table Header (Visual only) */}
                        <div className="grid grid-cols-12 gap-4 px-6 text-xs font-bold text-[#CFDBD5] uppercase tracking-widest opacity-60 mb-2">
                            <div className="col-span-4">Cliente / Proyecto</div>
                            <div className="col-span-3">Fecha</div>
                            <div className="col-span-3">Costo Estimado</div>
                            <div className="col-span-2 text-right">Acciones</div>
                        </div>

                        {quotes.map((quote) => (
                            <Card key={quote.id} className="bg-[#1F1F1F] border-[#2D2D2D] rounded-[1.5rem] p-6 hover:border-[#F5CB5C]/30 transition-all group">
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-4">
                                        <h4 className="text-[#E8EDDF] font-bold text-lg truncate">{quote.clientName}</h4>
                                        <p className="text-[#CFDBD5] text-sm truncate opacity-70">{(JSON.parse(quote.technicalParameters) as any).description?.substring(0, 40) || 'Sin descripción'}...</p>
                                    </div>
                                    <div className="col-span-3 text-[#CFDBD5] font-medium">
                                        {new Date(quote.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="col-span-3">
                                        <span className="text-[#F5CB5C] font-mono font-bold text-lg">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(quote.estimatedCost)}
                                        </span>
                                        <span className="text-[#CFDBD5] text-xs ml-1">/ mes</span>
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-2">
                                        <QuoteDetailsSheet quote={quote} />
                                        <DeleteQuoteButton quoteId={quote.id} quoteName={quote.clientName} />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

            </div>
        </main>
    )
}
