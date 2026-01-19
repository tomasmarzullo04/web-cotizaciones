'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, Trash2, Tag, Loader2, User, Clock } from 'lucide-react'
import { getServiceRates, saveServiceRate, deleteServiceRate } from '@/lib/actions'
import { toast } from 'sonner'

// --- TYPES ---
type ServiceRate = {
    id: string
    service: string
    frequency: string // Used for "Mode" (Monthly/Hourly) or specific Sustain frequency
    complexity: string // Used for "Seniority" (Jr, Sr) or "Type"
    basePrice: number
    multiplier: number // Multiplier for Seniority/Hours
}

export function AdminRatesEditor() {
    const [rates, setRates] = useState<ServiceRate[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingRate, setEditingRate] = useState<ServiceRate | null>(null)
    const [activeTab, setActiveTab] = useState("staffing")

    // Form State
    const [formData, setFormData] = useState<Partial<ServiceRate>>({})
    const [isSaving, setIsSaving] = useState(false)

    const loadRates = async () => {
        setLoading(true)
        try {
            const data = await getServiceRates()
            // Map Prisma output to internal type if needed, but they match mostly
            setRates(data as any)
        } catch (e) {
            console.error(e)
            toast.error("Error cargando tarifas")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadRates()
    }, [])

    const handleDelete = async (id: string) => {
        if (confirm('¿Está seguro de eliminar esta tarifa?')) {
            await deleteServiceRate(id)
            toast.success("Tarifa eliminada")
            loadRates()
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
            frequency: activeTab === 'staffing' ? 'Mensual' : 'Hora',
            complexity: activeTab === 'staffing' ? 'Ssr' : 'Standard',
            basePrice: 0,
            multiplier: 1.0
        })
        setIsDialogOpen(true)
    }

    const handleSaveForm = async () => {
        if (!formData.service || !formData.basePrice) {
            toast.warning('Complete los campos obligatorios')
            return
        }
        setIsSaving(true)
        try {
            await saveServiceRate({
                id: editingRate?.id,
                service: formData.service!,
                frequency: formData.frequency || 'Mensual',
                complexity: formData.complexity || 'Standard',
                basePrice: Number(formData.basePrice),
                multiplier: Number(formData.multiplier) || 1
            })
            toast.success("Tarifa guardada")
            setIsDialogOpen(false)
            loadRates()
        } catch (e) {
            toast.error("Error al guardar")
        } finally {
            setIsSaving(false)
        }
    }

    // Filter rates by active tab logic
    const displayedRates = rates.filter(r => {
        // Staffing: Assume frequency="Mensual" usually, or Complexity is a Seniority level
        const isStaffing = ['Jr', 'Ssr', 'Sr', 'Lead'].includes(r.complexity) || r.frequency === 'Mensual'
        if (activeTab === 'staffing') return isStaffing
        if (activeTab === 'sustain') return !isStaffing // Sustain/Proyectos logic
        return true
    })

    const getComplexityBadge = (c: string) => {
        if (['Sr', 'Lead', 'Alta'].includes(c)) return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
        if (['Ssr', 'Media'].includes(c)) return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
        return 'bg-green-500/10 text-green-500 border-green-500/20'
    }

    return (
        <Card className="rounded-[2rem] border border-[#333533] bg-[#242423] shadow-xl overflow-hidden mt-8">
            <CardHeader className="p-4 md:p-8 border-b border-[#333533] bg-[#242423] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#333533] rounded-xl border border-[#4A4D4A]">
                        <Tag className="w-6 h-6 text-[#F5CB5C]" />
                    </div>
                    <div>
                        <CardTitle className="text-xl md:text-2xl font-bold text-[#E8EDDF]">Gestión de Tarifas</CardTitle>
                        <CardDescription className="text-[#CFDBD5]">
                            Administra precios base y multiplicadores
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <Tabs defaultValue="staffing" onValueChange={setActiveTab} className="w-full">
                <div className="px-4 md:px-8 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <TabsList className="bg-[#333533] text-[#CFDBD5] w-full md:w-auto grid grid-cols-2 md:inline-flex">
                        <TabsTrigger value="staffing" className="data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#242423]">
                            <User className="w-4 h-4 mr-2" /> Perfiles Staffing
                        </TabsTrigger>
                        <TabsTrigger value="sustain" className="data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#242423]">
                            <Clock className="w-4 h-4 mr-2" /> Servicios / Sustain
                        </TabsTrigger>
                    </TabsList>
                    <Button onClick={handleNew} className="bg-[#2EB886] hover:bg-[#2EB886]/90 text-white font-bold rounded-xl h-10 px-6 w-full md:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo
                    </Button>
                </div>

                <CardContent className="p-0 mt-4">
                    {loading ? (
                        <div className="p-12 text-center text-[#CFDBD5] animate-pulse">Cargando base de datos...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[800px]">
                                <TableHeader className="bg-[#333533]">
                                    <TableRow className="border-[#333533]">
                                        <TableHead className="text-[#CFDBD5] pl-8">Concepto / Rol</TableHead>
                                        <TableHead className="text-[#CFDBD5]">Tipo / Frecuencia</TableHead>
                                        <TableHead className="text-[#CFDBD5]">Nivel / Complejidad</TableHead>
                                        <TableHead className="text-[#CFDBD5] text-right">Base</TableHead>
                                        <TableHead className="text-[#CFDBD5] text-center">Multiplicador</TableHead>
                                        <TableHead className="text-[#CFDBD5] text-right font-bold text-[#E8EDDF]">Total</TableHead>
                                        <TableHead className="text-[#CFDBD5] text-center pr-8">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayedRates.map((rate) => (
                                        <TableRow key={rate.id} className="border-[#333533] hover:bg-[#333533] cursor-pointer transition-all duration-200 group">
                                            <TableCell className="font-bold text-[#E8EDDF] pl-8 py-5 group-hover:text-[#F5CB5C] transition-colors">
                                                {rate.service}
                                            </TableCell>
                                            <TableCell className="text-[#CFDBD5]">{rate.frequency}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`border ${getComplexityBadge(rate.complexity)}`}>
                                                    {rate.complexity}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-[#CFDBD5]">${rate.basePrice}</TableCell>
                                            <TableCell className="text-center font-mono text-[#CFDBD5] opacity-70">x{rate.multiplier}</TableCell>
                                            <TableCell className="text-right font-bold font-mono text-[#E8EDDF] text-lg">
                                                ${(rate.basePrice * rate.multiplier).toFixed(0)}
                                            </TableCell>
                                            <TableCell className="pr-8 text-center">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(rate) }} className="h-8 w-8 text-[#CFDBD5] hover:text-[#F5CB5C] hover:bg-[#333533]">
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(rate.id) }} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {displayedRates.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-[#CFDBD5] opacity-50">
                                                No hay tarifas registradas en esta categoría.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Tabs>

            {/* Dialog for Edit/Create */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-[#242423] border-[#333533] text-[#E8EDDF]">
                    <DialogHeader>
                        <DialogTitle>{editingRate ? 'Editar Precio' : 'Nuevo Precio'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                            <Label className="text-left md:text-right text-[#CFDBD5]">Rol / Servicio</Label>
                            <Input
                                value={formData.service}
                                onChange={e => setFormData({ ...formData, service: e.target.value })}
                                className="col-span-1 md:col-span-3 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                placeholder="Ej. Data Engineer"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                            <Label className="text-left md:text-right text-[#CFDBD5]">
                                {activeTab === 'staffing' ? 'Seniority' : 'Complejidad'}
                            </Label>
                            {activeTab === 'staffing' ? (
                                <Select
                                    value={formData.complexity}
                                    onValueChange={v => setFormData({ ...formData, complexity: v })}
                                >
                                    <SelectTrigger className="col-span-1 md:col-span-3 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                        <SelectItem value="Jr">Junior (Jr)</SelectItem>
                                        <SelectItem value="Ssr">Semi-Senior (Ssr)</SelectItem>
                                        <SelectItem value="Sr">Senior (Sr)</SelectItem>
                                        <SelectItem value="Lead">Lead / Architect</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Select
                                    value={formData.complexity}
                                    onValueChange={v => setFormData({ ...formData, complexity: v })}
                                >
                                    <SelectTrigger className="col-span-1 md:col-span-3 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]">
                                        <SelectItem value="Baja">Baja</SelectItem>
                                        <SelectItem value="Media">Media</SelectItem>
                                        <SelectItem value="Alta">Alta</SelectItem>
                                        <SelectItem value="Standard">Standard</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                            <Label className="text-left md:text-right text-[#CFDBD5]">Precio Base</Label>
                            <Input
                                type="number"
                                value={formData.basePrice}
                                onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                                className="col-span-1 md:col-span-3 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
                            <Label className="text-left md:text-right text-[#CFDBD5]">Multiplicador</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.multiplier}
                                onChange={e => setFormData({ ...formData, multiplier: Number(e.target.value) })}
                                className="col-span-1 md:col-span-3 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleSaveForm}
                            disabled={isSaving}
                            className="w-full md:w-auto bg-[#F5CB5C] hover:bg-[#E0B84C] text-[#242423] font-bold"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
