import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { PlusCircle, History, FileText, ArrowRight } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default function DashboardPage() {
    return (
        <main className="min-h-screen bg-[#171717] pt-32 pb-12 px-6">
            <div className="container mx-auto max-w-7xl space-y-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-[#E8EDDF] tracking-tight">Panel de Cotizaciones</h1>
                        <p className="text-[#CFDBD5] mt-2 text-lg">Gestiona tus estimaciones y proyectos activos.</p>
                    </div>
                    <Link href="/quote/new">
                        <Button className="bg-[#F5CB5C] text-[#171717] hover:bg-[#E0B84C] font-bold rounded-xl h-12 px-8 shadow-[0_0_20px_rgba(245,203,92,0.2)] transition-all flex items-center gap-2">
                            <PlusCircle className="w-5 h-5" /> Nueva Estimación
                        </Button>
                    </Link>
                </div>

                {/* KPI Cards (Mock) */}
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="bg-[#1F1F1F] border-[#2D2D2D] rounded-[2rem] p-6 hover:border-[#F5CB5C]/30 transition-all">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[#CFDBD5] uppercase text-xs font-bold tracking-widest mb-1">Cotizaciones Activas</p>
                                <h3 className="text-4xl font-black text-[#E8EDDF]">3</h3>
                            </div>
                            <div className="p-3 bg-[#171717] rounded-xl border border-[#333]">
                                <FileText className="w-6 h-6 text-[#F5CB5C]" />
                            </div>
                        </div>
                    </Card>
                    <Card className="bg-[#1F1F1F] border-[#2D2D2D] rounded-[2rem] p-6 hover:border-[#F5CB5C]/30 transition-all">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[#CFDBD5] uppercase text-xs font-bold tracking-widest mb-1">Valor Estimado (Mes)</p>
                                <h3 className="text-4xl font-black text-[#E8EDDF]">$12.5k</h3>
                            </div>
                            <div className="p-3 bg-[#171717] rounded-xl border border-[#333]">
                                <History className="w-6 h-6 text-[#E8EDDF]" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Recent Activity (Mock) */}
                <Card className="bg-[#171717] border-[#2D2D2D] rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-[#2D2D2D]">
                        <CardTitle className="text-2xl font-bold text-[#E8EDDF]">Historial Reciente</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-8 text-center text-[#CFDBD5] opacity-50 italic">
                            No hay cotizaciones recientes para mostrar.
                            <br />
                            <Link href="/quote/new" className="text-[#F5CB5C] hover:underline not-italic font-bold mt-2 inline-block">
                                Comenzar primera cotización
                            </Link>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </main>
    )
}
