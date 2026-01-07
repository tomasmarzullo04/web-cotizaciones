'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

export function AdminSettings() {
    return (
        <div className="grid gap-6">
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">Constantes Globales</CardTitle>
                    <CardDescription>Configuración que afecta a todos los cálculos del sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Impuesto Default (%)</Label>
                            <Input type="number" defaultValue={21} className="bg-slate-950 border-slate-700 text-white" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Margen Comercial (%)</Label>
                            <Input type="number" defaultValue={35} className="bg-slate-950 border-slate-700 text-white" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Factor de Riesgo (High)</Label>
                            <Input type="number" defaultValue={1.5} className="bg-slate-950 border-slate-700 text-white" />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Cambios
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white">Configuración del Sistema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-slate-800 rounded-lg bg-slate-950">
                        <div>
                            <p className="font-medium text-white">Modo Mantenimiento</p>
                            <p className="text-sm text-slate-500">Desactiva el acceso a cotizadores.</p>
                        </div>
                        <Button variant="destructive" size="sm">Activar</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
