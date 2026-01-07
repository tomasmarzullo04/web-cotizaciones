import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminOverview } from "@/components/admin-overview"
import { AdminRatesEditor } from "@/components/admin-rates-editor"
import { AdminHistory } from "@/components/admin-history"
import { ShieldCheck, Settings, Users, History } from "lucide-react"

export default function AdminPage() {
    return (
        <main className="min-h-screen bg-[#171717] relative overflow-hidden font-sans">
            <div className="max-w-7xl mx-auto pt-32 px-10 space-y-12 relative z-10 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-[#E8EDDF] tracking-tight">Panel Administrativo</h1>
                        <p className="text-[#CFDBD5] mt-2">Gestión centralizada de tarifas, usuarios y auditoría.</p>
                    </div>
                    <div className="px-4 py-2 bg-[#242423] rounded-xl border border-[#CFDBD5]/20 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#F5CB5C] animate-pulse" />
                        <span className="text-xs font-bold text-[#E8EDDF] uppercase tracking-wider">Sistema Operativo</span>
                    </div>
                </div>

                {/* Dashboard Tabs */}
                <Tabs defaultValue="rates" className="w-full space-y-8">
                    <TabsList className="bg-[#242423] p-1 h-14 rounded-[1.5rem] border border-[#CFDBD5]/10 inline-flex shadow-lg">
                        <TabsTrigger value="overview" className="h-12 rounded-xl px-6 data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#242423] text-[#CFDBD5] hover:text-[#E8EDDF] font-bold transition-all">
                            <Users className="w-4 h-4 mr-2" /> Visión General
                        </TabsTrigger>
                        <TabsTrigger value="rates" className="h-12 rounded-xl px-6 data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#242423] text-[#CFDBD5] hover:text-[#E8EDDF] font-bold transition-all">
                            <Settings className="w-4 h-4 mr-2" /> Gestión Tarifas
                        </TabsTrigger>
                        <TabsTrigger value="history" className="h-12 rounded-xl px-6 data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#242423] text-[#CFDBD5] hover:text-[#E8EDDF] font-bold transition-all">
                            <History className="w-4 h-4 mr-2" /> Trazabilidad
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <AdminOverview />
                    </TabsContent>

                    <TabsContent value="rates" className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                        <AdminRatesEditor />
                    </TabsContent>

                    <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                        <AdminHistory />
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    )
}
