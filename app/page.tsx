'use client'

import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Calculator, ShieldCheck, Activity, Database, Key, FileText, FileSpreadsheet } from "lucide-react"
import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Home() {
    useEffect(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gcajouecfyhcpbazxjhy.supabase.co"
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_NDFtz_7ldXuNu3yP3ZsVfA_te2fF1_S"
        const supabase = createBrowserClient(url, key)

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                window.location.href = 'https://cotizador.thestoreintelligence.com/quote/new';
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    return (
        <main className="min-h-screen bg-[#171717] pt-40 md:pt-32 pb-12 px-6 overflow-hidden">
            <div className="container mx-auto max-w-[1600px] space-y-32">

                {/* HERO SECTION */}
                <section className="text-center space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">

                    {/* BACKGROUND DECORATION - Faded Documents */}
                    <div className="absolute top-1/2 left-[10%] -translate-y-1/2 -rotate-12 opacity-[0.03] pointer-events-none select-none">
                        <FileText className="w-96 h-96 text-[#CFDBD5]" />
                    </div>
                    <div className="absolute top-1/2 right-[10%] -translate-y-1/2 rotate-12 opacity-[0.03] pointer-events-none select-none">
                        <FileSpreadsheet className="w-96 h-96 text-[#F5CB5C]" />
                    </div>

                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#171717] border border-[#2D2D2D] text-[#F5CB5C] text-xs font-bold uppercase tracking-widest shadow-2xl relative z-10">
                        <ShieldCheck className="w-4 h-4" /> Enterprise Security
                    </div>

                    <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-[#E8EDDF] leading-[0.9] relative z-10">
                        Store <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5CB5C] to-[#E0B84C] drop-shadow-[0_0_30px_rgba(245,203,92,0.2)]">
                            Intelligence
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-[#CFDBD5] max-w-2xl mx-auto mb-10 font-medium leading-relaxed opacity-90 relative z-10">
                        De la Complejidad a la Cotización en Segundos con Estándares Enterprise.
                    </p>

                    <div className="pt-8 relative z-10">
                        <Link href="/login">
                            <Button className="h-20 px-12 rounded-full bg-[#F5CB5C] hover:bg-[#E0B84C] text-[#171717] font-bold text-2xl shadow-[0_0_40px_rgba(245,203,92,0.3)] transition-all hover:scale-105 border-0 flex items-center gap-4 mx-auto">
                                <Key className="w-6 h-6" /> Acceder al Sistema
                            </Button>
                        </Link>
                    </div>
                </section>

                {/* FEATURES GRID - 2x2 Layout */}
                <section className="grid md:grid-cols-2 gap-8 pb-20 max-w-5xl mx-auto">

                    {/* Card 1: Roles */}
                    <div className="bg-[#171717] border border-[#2D2D2D] p-10 rounded-[2.5rem] hover:border-[#F5CB5C]/50 transition-colors group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Calculator className="w-32 h-32 text-[#F5CB5C]" />
                        </div>
                        <div className="w-16 h-16 bg-[#1F1F1F] rounded-3xl flex items-center justify-center mb-8 border border-[#333]">
                            <Calculator className="w-8 h-8 text-[#F5CB5C]" />
                        </div>
                        <h3 className="text-3xl font-bold text-[#E8EDDF] mb-4">Estimación Inteligente</h3>
                        <p className="text-[#CFDBD5] leading-relaxed">
                            Cálculo automático de roles (Data Engineers, Analysts) basado en volumetría y complejidad.
                            Lógica de soporte L2 integrada.
                        </p>
                    </div>

                    {/* Card 2: AI */}
                    <div className="bg-[#171717] border border-[#2D2D2D] p-10 rounded-[2.5rem] hover:border-[#F5CB5C]/50 transition-colors group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Activity className="w-32 h-32 text-[#E8EDDF]" />
                        </div>
                        <div className="w-16 h-16 bg-[#1F1F1F] rounded-3xl flex items-center justify-center mb-8 border border-[#333]">
                            <Activity className="w-8 h-8 text-[#E8EDDF]" />
                        </div>
                        <h3 className="text-3xl font-bold text-[#E8EDDF] mb-4">Asistente AI</h3>
                        <p className="text-[#CFDBD5] leading-relaxed">
                            Generación de redacción de alcances y diagramas de arquitectura en Mermaid.js en tiempo real.
                        </p>
                    </div>

                    {/* Card 3: Traceability */}
                    <div className="bg-[#171717] border border-[#2D2D2D] p-10 rounded-[2.5rem] hover:border-[#F5CB5C]/50 transition-colors group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Database className="w-32 h-32 text-[#CFDBD5]" />
                        </div>
                        <div className="w-16 h-16 bg-[#1F1F1F] rounded-3xl flex items-center justify-center mb-8 border border-[#333]">
                            <Database className="w-8 h-8 text-[#CFDBD5]" />
                        </div>
                        <h3 className="text-3xl font-bold text-[#E8EDDF] mb-4">Trazabilidad Total</h3>
                        <p className="text-[#CFDBD5] leading-relaxed">
                            Registro inmutable de cada cotización. Panel de administración para gestión de tarifas y exportación a Excel.
                        </p>
                    </div>

                    {/* Card 4: Monday.com Sync */}
                    <div className="bg-[#171717] border border-[#2D2D2D] p-10 rounded-[2.5rem] hover:border-[#00ca72]/50 transition-colors group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FileSpreadsheet className="w-32 h-32 text-[#00ca72]" />
                        </div>
                        <div className="w-16 h-16 bg-[#1F1F1F] rounded-3xl flex items-center justify-center mb-8 border border-[#333]">
                            <FileSpreadsheet className="w-8 h-8 text-[#00ca72]" />
                        </div>
                        <h3 className="text-3xl font-bold text-[#E8EDDF] mb-4">Sincronización con Monday.com</h3>
                        <p className="text-[#CFDBD5] leading-relaxed">
                            Seguimiento comercial en tiempo real. Actualización automática de estados, presupuestos y alcances técnicos directamente en tu tablero corporativo.
                        </p>
                    </div>

                </section>

                <section className="text-center border-t border-[#2D2D2D] pt-12 pb-8">
                    <p className="text-[#CFDBD5]/40 text-sm font-medium tracking-widest uppercase">
                        Powered by Hazu
                    </p>
                </section>

            </div>
        </main>
    )
}
