'use client'

alert('Página de Login Cargada');

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { loginAction, registerAction } from '@/lib/auth'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight, Lock, CheckCircle2 } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { syncSessionAction } from '@/lib/auth'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const getSupabaseClient = () => {
    // Hardcoded fallbacks for explicit 'physical' persistence as requested
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gcajouecfyhcpbazxjhy.supabase.co"
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_NDFtz_7ldXuNu3yP3ZsVfA_te2fF1_S"

    if (!url || !key) return null
    return createBrowserClient(url, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
}

// EMERGENCY FIX: Helper to get role and redirect with logs and fallback
async function getUserRole(email?: string) {
    try {
        const result = await syncSessionAction()
        const role = result.success ? result.role : 'CONSULTOR'
        console.log('USUARIO LOGUEADO:', email || 'SIN EMAIL', 'ROL DETECTADO:', role)
        return role
    } catch (e) {
        console.error("Error consultando rol:", e)
        console.log('USUARIO LOGUEADO:', email || 'SIN EMAIL', 'ROL DETECTADO (FALLBACK):', 'CONSULTOR')
        return 'CONSULTOR'
    }
}

export default function LoginPage() {
    const searchParams = useSearchParams()
    const router = useRouter()

    // State
    const [loading, setLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [redirecting, setRedirecting] = useState(false)
    const [error, setError] = useState<string | null>(searchParams.get('error'))

    // Client-side fail-safe for Google Login
    useEffect(() => {
        const supabase = getSupabaseClient()
        if (!supabase) return

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                alert('Sesión detectada en Cliente. Iniciando sincronización...');
                setRedirecting(true)
                try {
                    // EMERGENCY FIX: Redirección Forzada con Log
                    const email = session.user?.email
                    const role = await getUserRole(email)

                    alert('USUARIO: ' + email + ' | ROL: ' + role + '. Redirigiendo...');

                    const productionDomain = 'https://cotizador.thestoreintelligence.com'
                    if (role === 'ADMIN') {
                        console.log('REDIRIGIENDO A ADMIN EN PRODUCCIÓN');
                        window.location.href = `${productionDomain}/admin/dashboard`;
                    } else {
                        console.log('REDIRIGIENDO A CONSULTOR EN PRODUCCIÓN');
                        window.location.href = `${productionDomain}/quote/new`;
                    }
                } catch (err) {
                    alert('ERROR EN SINCRONIZACIÓN: ' + (err as any).message);
                    // EMERGENCY BYPASS: Redirigir por defecto
                    console.log('EMERGENCY BYPASS: Redirigiendo a /quote/new por error');
                    window.location.href = 'https://cotizador.thestoreintelligence.com/quote/new';
                }
            }
        })

        return () => subscription.unsubscribe()
    }, [])

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
                    redirectTo: 'https://cotizador.thestoreintelligence.com/quote/new',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (error) throw error
        } catch (err) {
            alert('ERROR INICIANDO GOOGLE: ' + (err as any).message);
            setIsGoogleLoading(false)
        }
    }

    const [isRegistering, setIsRegistering] = useState(false)

    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        // CRITICAL: Prevent any default form behavior
        event.preventDefault()
        event.stopPropagation()

        // Prevent double submission
        if (loading) return

        setLoading(true)
        setError(null)
        setSuccessMessage(null)

        const formData = new FormData(event.currentTarget)

        try {
            // Choose action based on mode
            const action = isRegistering ? registerAction : loginAction
            const result = await action(formData)

            // Handle errors
            if (result && 'error' in result && result.error) {
                setError(result.error)
                setLoading(false)
                return
            }

            // Handle registration verification flow
            if (result && 'success' in result) {
                if ((result as any).pendingVerification) {
                    const emailVal = formData.get('email') as string
                    window.location.href = `/auth/verify?email=${encodeURIComponent(emailVal)}`
                    return
                }

                // ONLY redirect after successful server validation
                if (result.success) {
                    setSuccessMessage("Acceso concedido. Entrando...")
                    setIsTransitioning(true)

                    // Wait for server to set cookies properly
                    await new Promise(resolve => setTimeout(resolve, 300))

                    // Use the validated redirect URL from server
                    const target = (result as any).redirectUrl || '/quote/new'
                    window.location.href = target
                    return
                }
            }

            // If we reach here without success, show generic error
            setError("Error inesperado. Intenta nuevamente.")
            setLoading(false)

        } catch (err) {
            console.error("Auth process failed", err)
            setError(err instanceof Error ? err.message : "Error. Verifica tus credenciales.")
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen w-full bg-red-600 flex items-center justify-center p-6 relative overflow-hidden">

            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#F5CB5C] rounded-full blur-[120px] opacity-[0.03] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#CFDBD5] rounded-full blur-[100px] opacity-[0.02] pointer-events-none" />

            <Card className="w-full max-w-lg bg-[#171717] border border-[#2D2D2D] shadow-2xl rounded-[2.5rem] relative z-10 overflow-hidden">
                <CardHeader className="text-center pt-10 pb-2 border-b border-[#2D2D2D]/50">
                    <div className="w-20 h-20 bg-[#1F1F1F] rounded-[1.5rem] mx-auto mb-6 flex items-center justify-center border border-[#2D2D2D] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                        <Lock className="w-8 h-8 text-[#F5CB5C]" />
                    </div>
                    <CardTitle className="text-3xl font-black text-[#E8EDDF] tracking-tight mb-2">
                        ### VERSION 0.1.2 - RED BG ###
                    </CardTitle>
                    <CardDescription className="text-[#CFDBD5] text-base">
                        {isRegistering ? 'Únete al equipo de Consultores' : 'Sistema Corporativo de Cotizaciones'}
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

                        {successMessage && (
                            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/50 text-green-500 text-sm font-medium text-center">
                                {successMessage}
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
                                    {isRegistering ? 'Crear Cuenta' : 'Ingresar al Sistema'} <ArrowRight className="w-6 h-6" />
                                </>
                            )}
                        </Button>



                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => setIsRegistering(!isRegistering)}
                                className="text-sm text-[#F5CB5C] hover:text-[#E0B84C] font-semibold underline underline-offset-4 transition-colors"
                            >
                                {isRegistering
                                    ? '¿Ya tienes cuenta? Ingresa aquí'
                                    : '¿No tienes cuenta? Regístrate aquí'}
                            </button>
                        </div>

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
                            PRUEBA DE CONEXIÓN
                        </Button>
                    </form>

                    <div className="pt-6 border-t border-[#2D2D2D]/50 text-center space-y-6">
                        <div className="py-2">
                            <Link
                                href="https://cotizador.thestoreintelligence.com/quote/new"
                                className="text-[#F5CB5C] hover:text-[#E0B84C] text-sm font-bold uppercase tracking-widest transition-colors"
                            >
                                ¿No fuiste redirigido? Haz clic aquí para entrar
                            </Link>
                        </div>
                        <p className="text-xs text-[#CFDBD5]/30 uppercase tracking-widest font-medium">
                            Store Intelligence &copy; 2026
                        </p>
                    </div>
                </CardContent>
            </Card>
            {/* Full Screen Loading Overlay */}
            {(loading || isGoogleLoading || isTransitioning || redirecting) && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#171717]/95 backdrop-blur-xl transition-all animate-in fade-in duration-500">
                    <div className="relative mb-12">
                        {/* Outer rotating ring */}
                        <div className="w-32 h-32 rounded-full border-2 border-[#2D2D2D] border-t-[#F5CB5C] animate-[spin_1.5s_linear_infinite]" />
                        {/* Middle pulsing ring */}
                        <div className="absolute inset-2 rounded-full border border-[#2D2D2D] border-b-[#CFDBD5] animate-[spin_2s_linear_infinite_reverse] opacity-50" />
                        {/* Center Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {redirecting ? (
                                <CheckCircle2 className="w-10 h-10 text-[#F5CB5C] animate-pulse" />
                            ) : (
                                <Lock className="w-10 h-10 text-[#F5CB5C]/40" />
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 text-center px-6 max-w-sm">
                        <h2 className="text-[#E8EDDF] text-2xl font-black tracking-tight uppercase">
                            {redirecting ? 'Sesión Detectada' : 'Validando Acceso'}
                        </h2>
                        <div className="h-1 w-24 bg-gradient-to-r from-transparent via-[#F5CB5C] to-transparent mx-auto rounded-full" />
                        <p className="text-[#CFDBD5] text-lg font-medium">
                            {redirecting
                                ? 'Configurando tu panel de consultoría...'
                                : 'Verificando estándares de seguridad enterprise...'}
                        </p>
                        <p className="text-[#CFDBD5]/30 text-xs font-bold tracking-[0.2em] uppercase pt-4">
                            Store Intelligence System
                        </p>
                    </div>
                </div>
            )}
        </main >
    )
}
