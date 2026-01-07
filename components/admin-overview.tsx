'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, Activity, FileCheck } from "lucide-react"

const stats = [
    {
        title: "Cotizaciones Mes",
        value: "24",
        change: "+12%",
        icon: FileCheck,
        color: "text-[#F5CB5C]",
        bg: "bg-[#F5CB5C]/10"
    },
    {
        title: "Valor Pipeline",
        value: "$845k",
        change: "+8.2%",
        icon: DollarSign,
        color: "text-[#E8EDDF]",
        bg: "bg-[#E8EDDF]/10"
    },
    {
        title: "Usuarios Activos",
        value: "12",
        change: "+2",
        icon: Users,
        color: "text-[#CFDBD5]",
        bg: "bg-[#CFDBD5]/10"
    },
    {
        title: "Tasa Conversión",
        value: "32%",
        change: "+4.1%",
        icon: Activity,
        color: "text-emerald-400",
        bg: "bg-emerald-400/10"
    }
]

export function AdminOverview() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
                <Card key={i} className="bg-[#171717] border-[#2D2D2D] rounded-[2rem] hover:border-[#F5CB5C]/30 transition-all shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-[#CFDBD5] uppercase tracking-wider">
                            {stat.title}
                        </CardTitle>
                        <div className={`p-2 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-[#E8EDDF]">{stat.value}</div>
                        <p className="text-xs text-[#CFDBD5] mt-1">
                            <span className="text-[#F5CB5C] font-bold">{stat.change}</span> vs mes anterior
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
