'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getRoleRates, updateRoleRate } from '@/lib/actions'
import { Save, Loader2, DollarSign } from 'lucide-react'
// Using native alert for simplicity

type RoleRate = {
    role: string // This acts as ID
    monthlyRate: number
    baseHours?: number
    hourlyRate?: number
}

export function AdminRatesEditor() {
    const [rates, setRates] = useState<RoleRate[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [edits, setEdits] = useState<Record<string, number>>({})

    useEffect(() => {
        getRoleRates().then(data => {
            setRates(data as any)
            setLoading(false)
        })
    }, [])

    const handleRateChange = (role: string, value: string) => {
        setEdits(prev => ({ ...prev, [role]: parseInt(value) || 0 }))
    }

    const handleSave = async (role: string) => {
        const newRate = edits[role]
        if (newRate === undefined) return

        setSaving(role)
        try {
            await updateRoleRate(role, newRate)
            setRates(prev => prev.map(r => r.role === role ? { ...r, monthlyRate: newRate } : r))
            setEdits(prev => {
                const copy = { ...prev }
                delete copy[role]
                return copy
            })
            alert(`Tarifa para ${role} actualizada correctamente.`)
        } catch (error) {
            console.error(error)
            alert("Error al actualizar tarifa.")
        } finally {
            setSaving(null)
        }
    }

    if (loading) return <div className="p-12 text-center text-[#CFDBD5] animate-pulse">Cargando tarifas...</div>

    return (
        <Card className="rounded-[2rem] border border-[#333533] bg-[#242423] shadow-xl overflow-hidden">
            <CardHeader className="p-8 border-b border-[#333533] bg-[#242423] flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#333533] rounded-xl border border-[#4A4D4A]">
                        <DollarSign className="w-6 h-6 text-[#F5CB5C]" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-[#E8EDDF]">Gestor de Tarifas Base</CardTitle>
                        <CardDescription className="text-[#CFDBD5]">
                            Ajuste los costos mensuales por rol. Los cambios impactan inmediatamente al cotizador.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-[#333533]">
                        <TableRow className="border-[#333533] hover:bg-transparent">
                            <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider pl-8 h-12">Rol Técnico</TableHead>
                            <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12">Tarifa Mensual (USD)</TableHead>
                            <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12 text-right pr-8">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rates.map((rate) => (
                            <TableRow key={rate.role} className="border-[#333533] hover:bg-[#333533]/50 transition-colors group">
                                <TableCell className="font-bold text-[#E8EDDF] pl-8 py-6 text-lg">
                                    {rate.role}
                                </TableCell>
                                <TableCell>
                                    <div className="relative max-w-[200px]">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CFDBD5]">$</span>
                                        <Input
                                            type="number"
                                            defaultValue={rate.monthlyRate}
                                            onChange={(e) => handleRateChange(rate.role, e.target.value)}
                                            className="pl-8 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] focus:border-[#F5CB5C] h-12 rounded-xl text-lg font-mono"
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <Button
                                        disabled={edits[rate.role] === undefined || saving === rate.role}
                                        onClick={() => handleSave(rate.role)}
                                        className={`
                                            rounded-xl h-12 px-6 font-bold transition-all
                                            ${edits[rate.role] !== undefined
                                                ? "bg-[#F5CB5C] hover:bg-[#E0B84C] text-[#242423] shadow-lg shadow-[#F5CB5C]/20"
                                                : "bg-[#333533] text-[#CFDBD5] opacity-50 cursor-not-allowed"}
                                        `}
                                    >
                                        {saving === rate.role ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Guardar
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
