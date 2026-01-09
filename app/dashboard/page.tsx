import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { PlusCircle, FileText, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { getUserQuotes } from '@/lib/actions'
import { DashboardQuotesList } from '@/components/dashboard-quotes-list'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    let quotes: any[] = []

    try {
        const rawQuotes = await getUserQuotes() || []
        quotes = Array.isArray(rawQuotes) ? rawQuotes.map(q => ({
            ...q,
            createdAt: q.createdAt.toISOString()
        }))
    } catch (e) {
        console.error("Dashboard Fetch Error:", e)
        // Fallback or empty to let client handle it
    }

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

                {/* Quotes List - Client Component handles Local+Server merging */}
                <DashboardQuotesList serverQuotes={quotes} />

            </div>
        </main>
    )
}
