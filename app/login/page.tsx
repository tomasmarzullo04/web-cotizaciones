'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { loginAction } from '@/lib/auth'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight, Lock } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

import { createClient } from '@supabase/supabase-js'

const getSupabaseClient = () => {
    // Hardcoded fallbacks for explicit 'physical' persistence as requested
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gcajouecfyhcpbazxjhy.supabase.co"
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_NDFtz_7ldXuNu3yP3ZsVfA_te2fF1_S"

    if (!url || !key) return null
    return createClient(url, key)
}

export default function LoginPage() {
    const searchParams = useSearchParams()

    // State
    const [loading, setLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [error, setError] = useState<string | null>(searchParams.get('error'))

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true)
        setError(null)

        const supabase = getSupabaseClient()
        if (!supabase) {
            setError("Configuración de Google Login incompleta (Faltan variables de entorno)")
            setIsGoogleLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (error) throw error
            // Redirect is automatic
        } catch (err) {
            console.error("Google Login failed", err)
            setError(err instanceof Error ? err.message : "Error iniciando sesión con Google")
            setIsGoogleLoading(false)
        }
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        // ... (existing logic)
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

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-[#2D2D2D]" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#171717] px-2 text-[#CFDBD5]/50 font-bold tracking-widest">
                                    O continuar con
                                </span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleGoogleLogin}
                            disabled={loading || isGoogleLoading}
                            className="w-full h-14 rounded-[1.5rem] border-[#2D2D2D] text-[#E8EDDF] hover:bg-[#2D2D2D] hover:text-white transition-all font-bold gap-3"
                        >
                            {isGoogleLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}
                            Continuar con Google
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
