'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Tag, Loader2, Save } from 'lucide-react'

// --- TYPES ---
type ServiceRate = {
    id: string
    service: string
    frequency: string
    complexity: 'Baja' | 'Media' | 'Alta'
    basePrice: number
    multiplier: number
}

const DEFAULT_RATES: ServiceRate[] = [
    { id: '1', service: 'Dataset', frequency: 'Diaria', complexity: 'Baja', basePrice: 1500, multiplier: 1 },
    { id: '2', service: 'Dataset', frequency: 'Diaria', complexity: 'Media', basePrice: 2000, multiplier: 1.5 },
    { id: '3', service: 'Dataset', frequency: 'Diaria', complexity: 'Alta', basePrice: 3000, multiplier: 2.5 },
    { id: '4', service: 'Pipe', frequency: 'Semanal', complexity: 'Media', basePrice: 2500, multiplier: 1.5 },
    { id: '5', service: 'Dashboard', frequency: 'Bajo Demanda', complexity: 'Alta', basePrice: 5000, multiplier: 2 },
    { id: '6', service: 'Algoritmo DS', frequency: 'Mensual', complexity: 'Alta', basePrice: 8000, multiplier: 3 },
]

export function AdminRatesEditor() {
    const [rates, setRates] = useState<ServiceRate[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingRate, setEditingRate] = useState<ServiceRate | null>(null)

    // Form State
    const [formData, setFormData] = useState<Partial<ServiceRate>>({})

    useEffect(() => {
        // Load from LocalStorage or Default
        const storageKey = 'admin_service_rates_v1'
        const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null

        if (raw) {
            try {
                setRates(JSON.parse(raw))
            } catch {
                setRates(DEFAULT_RATES)
            }
        } else {
            setRates(DEFAULT_RATES)
        }
        setLoading(false)
    }, [])

    const saveToStorage = (newRates: ServiceRate[]) => {
        setRates(newRates)
        localStorage.setItem('admin_service_rates_v1', JSON.stringify(newRates))
    }

    const handleDelete = (id: string) => {
        if (confirm('¿Está seguro de eliminar esta tarifa?')) {
            const newRates = rates.filter(r => r.id !== id)
            saveToStorage(newRates)
        }
    }

    const handleEdit = (rate: ServiceRate) => {
        setEditingRate(rate)
        setFormData(rate)
        setIsDialogOpen(true)
    }

    const handleNew = () => {
        setEditingRate(null)
        setFormData({
            service: '',
            frequency: 'Diaria',
            complexity: 'Baja',
            basePrice: 0,
            multiplier: 1
        })
        setIsDialogOpen(true)
    }

    const handleSaveForm = () => {
        if (!formData.service || !formData.basePrice) {
            alert('Complete los campos obligatorios')
            return
        }

        const newRate: ServiceRate = {
            id: editingRate ? editingRate.id : Math.random().toString(36).substr(2, 9),
            service: formData.service || 'Servicio',
            frequency: formData.frequency || 'N/A',
            complexity: (formData.complexity as any) || 'Baja',
            basePrice: Number(formData.basePrice),
            multiplier: Number(formData.multiplier) || 1
        }

        let newRates = []
        if (editingRate) {
            newRates = rates.map(r => r.id === editingRate.id ? newRate : r)
        } else {
            newRates = [...rates, newRate]
        }

        saveToStorage(newRates)
        setIsDialogOpen(false)
    }

    const getComplexityColor = (c: string) => {
        switch (c) {
            case 'Alta': return 'bg-red-500/10 text-red-500 border-red-500/20'
            case 'Media': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
            default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
        }
    }

    if (loading) return <div className="p-12 text-center text-[#CFDBD5] animate-pulse">Cargando precios...</div>

    return (
        <Card className="rounded-[2rem] border border-[#333533] bg-[#242423] shadow-xl overflow-hidden mt-8">
            <CardHeader className="p-8 border-b border-[#333533] bg-[#242423] flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#333533] rounded-xl border border-[#4A4D4A]">
                        <Tag className="w-6 h-6 text-[#F5CB5C]" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-[#E8EDDF]">Precios de Servicios</CardTitle>
                        <CardDescription className="text-[#CFDBD5]">
                            Combinaciones de frecuencia y componentes
                        </CardDescription>
                    </div>
                </div>
                <Button onClick={handleNew} className="bg-[#2EB886] hover:bg-[#2EB886]/90 text-white font-bold rounded-xl h-10 px-6 shadow-lg shadow-[#2EB886]/20 transition-all">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Precio
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-[#333533]">
                        <TableRow className="border-[#333533] hover:bg-transparent">
                            <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider pl-8 h-12">Servicio</TableHead>
                            <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12">Frecuencia</TableHead>
                            <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12">Complejidad</TableHead>
                            <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12 text-right">Precio Base</TableHead>
                            <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12 text-center">Multiplicador</TableHead>
                            <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12 text-right">Precio Final</TableHead>
                            <TableHead className="text-[#CFDBD5] font-bold uppercase tracking-wider h-12 text-center pr-8">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rates.map((rate) => (
                            <TableRow key={rate.id} className="border-[#333533] hover:bg-[#333533]/50 transition-colors group">
                                <TableCell className="font-bold text-[#E8EDDF] pl-8 py-5 flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                                    {rate.service}
                                </TableCell>
                                <TableCell className="text-[#CFDBD5]">{rate.frequency}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`border ${getComplexityColor(rate.complexity)}`}>
                                        {rate.complexity}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-[#CFDBD5]">
                                    ${rate.basePrice}
                                </TableCell>
                                <TableCell className="text-center font-mono text-[#CFDBD5] opacity-70">
                                    {rate.multiplier}x
                                </TableCell>
                                <TableCell className="text-right font-bold font-mono text-[#E8EDDF] text-lg">
                                    ${rate.basePrice * rate.multiplier}
                                </TableCell>
                                <TableCell className="pr-8">
                                    <div className="flex justify-center gap-2">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleEdit(rate)}
                                            className="h-8 w-8 text-[#CFDBD5] hover:text-[#E8EDDF] hover:bg-[#333533]"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDelete(rate.id)}
                                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>

            {/* Dialog for Edit/Create */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-[#242423] border-[#333533] text-[#E8EDDF]">
                    <DialogHeader>
                        <DialogTitle>{editingRate ? 'Editar Precio' : 'Nuevo Precio'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-[#CFDBD5]">Servicio</Label>
                            <Input
                                value={formData.service}
                                onChange={e => setFormData({ ...formData, service: e.target.value })}
                                className="col-span-3 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                placeholder="Ej. Dataset"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-[#CFDBD5]">Frecuencia</Label>
                            <Select
                                value={formData.frequency}
                                onValueChange={v => setFormData({ ...formData, frequency: v })}
                            >
                                <SelectTrigger className="col-span-3 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                    <SelectItem value="Diaria">Diaria</SelectItem>
                                    <SelectItem value="Semanal">Semanal</SelectItem>
                                    <SelectItem value="Mensual">Mensual</SelectItem>
                                    <SelectItem value="Bajo Demanda">Bajo Demanda</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-[#CFDBD5]">Complejidad</Label>
                            <Select
                                value={formData.complexity}
                                onValueChange={v => setFormData({ ...formData, complexity: v as any })}
                            >
                                <SelectTrigger className="col-span-3 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                    <SelectItem value="Baja">Baja</SelectItem>
                                    <SelectItem value="Media">Media</SelectItem>
                                    <SelectItem value="Alta">Alta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-[#CFDBD5]">Precio Base</Label>
                            <Input
                                type="number"
                                value={formData.basePrice}
                                onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                                className="col-span-3 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-[#CFDBD5]">Multiplicador</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.multiplier}
                                onChange={e => setFormData({ ...formData, multiplier: Number(e.target.value) })}
                                className="col-span-3 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleSaveForm}
                            className="bg-[#F5CB5C] hover:bg-[#E0B84C] text-[#242423] font-bold"
                        >
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
