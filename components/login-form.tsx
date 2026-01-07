'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { loginAction } from '@/lib/auth'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoginForm() {
    const [loading, setLoading] = useState(false)
    const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | null>('user')

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        if (!formData.get('username')) {
            formData.set('username', selectedRole || 'user')
            formData.set('password', selectedRole || 'user')
        }

        try {
            await loginAction(formData)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md bg-[#242423] border-[#333533] shadow-2xl rounded-[2rem] overflow-hidden">
            <CardHeader className="text-center pt-8 border-b border-[#333533] bg-[#333533]/50">
                <div className="flex justify-center gap-4 mb-6">
                    <button
                        onClick={() => setSelectedRole('user')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            selectedRole === 'user' ? "bg-[#F5CB5C] text-[#242423]" : "text-[#CFDBD5] hover:text-[#E8EDDF]"
                        )}
                    >
                        Usuario
                    </button>
                    <button
                        onClick={() => setSelectedRole('admin')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            selectedRole === 'admin' ? "bg-[#CFDBD5] text-[#242423]" : "text-[#CFDBD5] hover:text-[#E8EDDF]"
                        )}
                    >
                        Admin
                    </button>
                </div>
                <CardTitle className="text-2xl font-bold text-[#E8EDDF]">
                    {selectedRole === 'admin' ? 'Acceso Administrativo' : 'Portal de Cotización'}
                </CardTitle>
                <CardDescription className="text-[#CFDBD5]">
                    {selectedRole === 'admin' ? 'Gestión centralizada y auditoría.' : 'Crea presupuestos técnicos en segundos.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                        <Label htmlFor="username" className="text-[#CFDBD5] ml-1 text-xs font-bold uppercase tracking-wider">Usuario</Label>
                        <Input
                            id="username" name="username"
                            defaultValue={selectedRole || ''}
                            className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] h-12 rounded-xl focus:border-[#F5CB5C]"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="password" className="text-[#CFDBD5] ml-1 text-xs font-bold uppercase tracking-wider">Contraseña</Label>
                        <Input
                            id="password" name="password" type="password"
                            defaultValue={selectedRole || ''}
                            className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] h-12 rounded-xl focus:border-[#F5CB5C]"
                        />
                    </div>
                    <Button type="submit" className={cn(
                        "w-full h-14 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(245,203,92,0.2)] transition-all hover:scale-[1.02]",
                        selectedRole === 'admin'
                            ? "bg-[#E8EDDF] hover:bg-[#CFDBD5] text-[#242423]"
                            : "bg-[#F5CB5C] hover:bg-[#E0B84C] text-[#242423]"
                    )} disabled={loading}>
                        {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                        {loading ? 'Entrando...' : (
                            <span className="flex items-center">
                                Iniciar Sesión <ArrowRight className="ml-2 w-5 h-5" />
                            </span>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
