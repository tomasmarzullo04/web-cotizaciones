'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { loginAction } from '@/lib/auth'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight, Lock } from 'lucide-react'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)
        try {
            const result = await loginAction(formData)
            if (result?.error) {
                setError(result.error)
            }
        } catch (err) {
            console.error("Auth failed", err)
            setError(err instanceof Error ? err.message : "Error de autenticación")
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen w-full bg-[#171717] flex items-center justify-center p-6 relative overflow-hidden">

            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#F5CB5C] rounded-full blur-[120px] opacity-[0.03] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#CFDBD5] rounded-full blur-[100px] opacity-[0.02] pointer-events-none" />

            <Card className="w-full max-w-lg bg-[#171717] border border-[#2D2D2D] shadow-2xl rounded-[2.5rem] relative z-10 overflow-hidden">
                <CardHeader className="text-center pt-10 pb-2 border-b border-[#2D2D2D]/50">
                    <div className="w-20 h-20 bg-[#1F1F1F] rounded-[1.5rem] mx-auto mb-6 flex items-center justify-center border border-[#2D2D2D] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                        <Lock className="w-8 h-8 text-[#F5CB5C]" />
                    </div>
                    <CardTitle className="text-3xl font-black text-[#E8EDDF] tracking-tight mb-2">
                        Ingreso al Portal
                    </CardTitle>
                    <CardDescription className="text-[#CFDBD5] text-base">
                        Sistema Corporativo de Cotizaciones
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-10 space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[#CFDBD5] ml-2 text-xs font-bold uppercase tracking-widest opacity-70">
                                Correo Electrónico
                            </Label>
                            <Input
                                id="email" name="email" type="email"
                                placeholder="usuario@empresa.com"
                                className="bg-[#0F0F0F] border-[#2D2D2D] text-[#E8EDDF] h-14 rounded-[1.2rem] focus:border-[#F5CB5C] text-lg px-6 placeholder:text-[#333]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-[#CFDBD5] ml-2 text-xs font-bold uppercase tracking-widest opacity-70">
                                Contraseña
                            </Label>
                            <Input
                                id="password" name="password" type="password"
                                placeholder="•••••••••"
                                className="bg-[#0F0F0F] border-[#2D2D2D] text-[#E8EDDF] h-14 rounded-[1.2rem] focus:border-[#F5CB5C] text-lg px-6 placeholder:text-[#333]"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-16 rounded-[1.5rem] font-bold text-xl transition-all hover:scale-[1.02] bg-[#F5CB5C] hover:bg-[#E0B84C] text-[#171717] shadow-[0_10px_30px_rgba(245,203,92,0.15)] flex items-center justify-center gap-3 mt-4"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="w-6 h-6 animate-spin" />}
                            {loading ? 'Procesando...' : (
                                <>
                                    Ingresar al Sistema <ArrowRight className="w-6 h-6" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="pt-6 border-t border-[#2D2D2D]/50 text-center space-y-4">
                        <p className="text-xs text-[#CFDBD5]/30 uppercase tracking-widest font-medium pt-4">
                            Cotizador Solutions &copy; 2026
                        </p>
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}
