'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, Activity, FileCheck } from "lucide-react"
import { useState, useEffect } from "react"

const statsConfig = [
    {
        title: "Cotizaciones Mes",
        id: "monthlyQuotesCount",
        icon: FileCheck,
        color: "text-[#F5CB5C]",
        bg: "bg-[#F5CB5C]/10"
    },
    {
        title: "Valor Pipeline",
        id: "pipelineValue",
        icon: DollarSign,
        color: "text-[#E8EDDF]",
        bg: "bg-[#E8EDDF]/10",
        isCurrency: true
    },
    {
        title: "Usuarios Activos",
        id: "activeUsersCount",
        icon: Users,
        color: "text-[#CFDBD5]",
        bg: "bg-[#CFDBD5]/10"
    },
    {
        title: "Tasa Conversión",
        id: "conversionRate",
        icon: Activity,
        color: "text-emerald-400",
        bg: "bg-emerald-400/10",
        isPercent: true
    }
]

interface AdminOverviewProps {
    stats: {
        monthlyQuotesCount: number
        pipelineValue: number
        activeUsersCount: number
        conversionRate: number
        statusCounts?: Record<string, number>
    }
}

export function AdminOverview({ stats: initialStats }: AdminOverviewProps) {
    const [stats, setStats] = useState(initialStats)

    // Sync state if props change (revalidation)
    useEffect(() => {
        setStats(initialStats)
    }, [initialStats])

    // Calculate distribution for chart
    const statusCounts = stats.statusCounts || { 'BORRADOR': 0, 'ENVIADA': 0, 'APROBADA': 0, 'RECHAZADA': 0 }
    const totalQuotes = Object.values(statusCounts).reduce((a, b) => a + (b as number), 0) || 1

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ENVIADA': return "bg-blue-500"
            case 'APROBADA': return "bg-emerald-500"
            case 'RECHAZADA': return "bg-red-500"
            default: return "bg-slate-500"
        }
    }

    return (
        <div className="space-y-8">
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
                {statsConfig.map((config, i) => {
                    const value = stats[config.id as keyof typeof stats]
                    let displayValue = (value || 0).toString()

                    if (config.isCurrency) {
                        displayValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value as number)
                    } else if (config.isPercent) {
                        displayValue = `${value}%`
                    }

                    return (
                        <Card key={i} className="bg-[#171717] border-[#2D2D2D] rounded-[2rem] hover:border-[#F5CB5C]/30 transition-all shadow-sm group cursor-default">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-8 pb-4">
                                <CardTitle className="text-sm font-bold text-[#CFDBD5] uppercase tracking-wider group-hover:text-[#F5CB5C] transition-colors">
                                    {config.title}
                                </CardTitle>
                                <div className={`p-3 rounded-xl transition-all group-hover:scale-110 ${config.bg}`}>
                                    <config.icon className={`h-5 w-5 ${config.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 pt-0">
                                <div className="text-4xl font-black text-[#E8EDDF]">{displayValue}</div>
                                <p className="text-sm text-[#CFDBD5] mt-2 opacity-60 font-medium flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Actualizado en tiempo real
                                </p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Status Distribution Chart */}
            <Card className="bg-[#171717] border-[#2D2D2D] rounded-[2rem] p-8">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-[#E8EDDF] text-xl font-bold">Distribución de Estados</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0 space-y-6">
                    <div className="flex h-4 w-full rounded-full overflow-hidden bg-[#242423]">
                        {Object.entries(statusCounts).map(([status, count], i) => {
                            const percent = (count / totalQuotes) * 100
                            if (percent === 0) return null
                            return (
                                <div
                                    key={status}
                                    style={{ width: `${percent}%` }}
                                    className={`${getStatusColor(status)} hover:opacity-80 transition-opacity`}
                                    title={`${status}: ${count}`}
                                />
                            )
                        })}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <div key={status} className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                                <div>
                                    <p className="text-xs font-bold text-[#CFDBD5] uppercase">{status}</p>
                                    <p className="text-lg font-bold text-[#E8EDDF]">{count} <span className="text-xs text-[#CFDBD5]/50 font-normal">({Math.round((count / totalQuotes) * 100)}%)</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
