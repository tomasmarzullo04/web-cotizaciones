'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, Trash2, Tag, Loader2, User, Clock, ChevronDown, ChevronRight, Briefcase } from 'lucide-react'
import { getServiceRates, saveServiceRate, deleteServiceRate } from '@/lib/actions'
import { toast } from 'sonner'

// --- TYPES ---
type ServiceRate = {
    id: string
    service: string
    frequency: string // "Mensual", "Hora"
    complexity: string // "Jr", "Ssr", "Sr", "Lead" OR "Baja", "Media", "Alta"
    basePrice: number
    multiplier: number
}

// Grouped Structure for Matrix View
type StaffingGroup = {
    service: string
    rates: {
        Jr?: ServiceRate
        Med?: ServiceRate
        Sr?: ServiceRate
        Expert?: ServiceRate
        [key: string]: ServiceRate | undefined
    }
}

const ALLOWED_PROFILES = [
    "BI Visualization Developer",
    "Azure Developer",
    "Solution Architect",
    "BI Data Architect",
    "Data Engineer",
    "Data Scientist",
    "Data / Operations Analyst",
    "Project / Product Manager",
    "Business Analyst",
    "Low Code Developer",
    "Power App / Streamlit Developer"
]

export function AdminRatesEditor() {
    const [rates, setRates] = useState<ServiceRate[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [activeTab, setActiveTab] = useState("staffing")

    // Form State (Matrix)
    const [editingService, setEditingService] = useState<string | null>(null)
    const [matrixForm, setMatrixForm] = useState({
        service: '',
        prices: {
            Jr: 0,
            Med: 0,
            Sr: 0,
            Expert: 0
        }
    })
    const [isSaving, setIsSaving] = useState(false)

    // Standard Form State (Sustain/Generic)
    const [genericForm, setGenericForm] = useState<Partial<ServiceRate>>({})

    const loadRates = async () => {
        setLoading(true)
        try {
            const data = await getServiceRates()
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

    // --- GROUPING LOGIC ---
    const staffingGroups = useMemo(() => {
        const groups: Record<string, StaffingGroup> = {}
        const staffingRates = rates.filter(r =>
            ['Jr', 'Med', 'Sr', 'Expert'].includes(r.complexity) ||
            (r.frequency === 'Mensual' && activeTab === 'staffing')
        )

        staffingRates.forEach(r => {
            if (!groups[r.service]) {
                groups[r.service] = { service: r.service, rates: {} }
            }
            groups[r.service].rates[r.complexity] = r
        })

        return Object.values(groups).sort((a, b) => a.service.localeCompare(b.service))
    }, [rates, activeTab])

    const otherRates = useMemo(() => {
        return rates.filter(r =>
            !['Jr', 'Ssr', 'Sr', 'Expert'].includes(r.complexity) &&
            r.frequency !== 'Mensual'
        )
    }, [rates])

    const handleEditMatrix = (group: StaffingGroup) => {
        setEditingService(group.service)
        setMatrixForm({
            service: group.service,
            prices: {
                Jr: group.rates['Jr']?.basePrice || 0,
                Med: group.rates['Med']?.basePrice || 0,
                Sr: group.rates['Sr']?.basePrice || 0,
                Expert: group.rates['Expert']?.basePrice || 0
            }
        })
        setIsDialogOpen(true)
    }

    const handleNewMatrix = () => {
        setEditingService(null) // New
        setMatrixForm({
            service: '',
            prices: { Jr: 0, Med: 0, Sr: 0, Expert: 0 }
        })
        setIsDialogOpen(true)
    }

    const handleSaveMatrix = async () => {
        if (!matrixForm.service) {
            toast.warning("El nombre del servicio es obligatorio")
            return
        }
        setIsSaving(true)
        try {
            // We need to upsert 4 rows (Jr, Med, Sr, Expert)
            const levels = ['Jr', 'Med', 'Sr', 'Expert']

            // Find existing IDs if editing
            const currentGroup = staffingGroups.find(g => g.service === (editingService || matrixForm.service))

            for (const level of levels) {
                const price = matrixForm.prices[level as keyof typeof matrixForm.prices]
                if (price > 0) {
                    const existingId = currentGroup?.rates[level]?.id
                    await saveServiceRate({
                        id: existingId,
                        service: matrixForm.service,
                        frequency: 'Mensual',
                        complexity: level,
                        basePrice: Number(price),
                        multiplier: 1.0 // Matrix approach uses explicit base prices, so multiplier is 1
                    })
                }
            }

            toast.success("Matriz de precios actualizada")
            setIsDialogOpen(false)
            loadRates()
        } catch (e) {
            console.error(e)
            toast.error("Error al guardar")
        } finally {
            setIsSaving(false)
        }
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
                            Definición de costos por perfil y seniority.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <Tabs defaultValue="staffing" onValueChange={setActiveTab} className="w-full">
                <div className="px-4 md:px-8 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <TabsList className="bg-[#333533] text-[#CFDBD5] w-full md:w-auto grid grid-cols-2 md:inline-flex">
                        <TabsTrigger value="staffing" className="data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#242423]">
                            <User className="w-4 h-4 mr-2" /> Matriz Staffing
                        </TabsTrigger>
                        <TabsTrigger value="sustain" className="data-[state=active]:bg-[#F5CB5C] data-[state=active]:text-[#242423]">
                            <Clock className="w-4 h-4 mr-2" /> Otros Servicios
                        </TabsTrigger>
                    </TabsList>
                    <Button onClick={activeTab === 'staffing' ? handleNewMatrix : () => { }} className="bg-[#2EB886] hover:bg-[#2EB886]/90 text-white font-bold rounded-xl h-10 px-6 w-full md:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Perfil
                    </Button>
                </div>

                <CardContent className="p-0 mt-4">
                    {loading ? (
                        <div className="p-12 text-center text-[#CFDBD5] animate-pulse">Cargando base de datos...</div>
                    ) : activeTab === 'staffing' ? (
                        // MATRIX VIEW
                        <div className="overflow-x-auto">
                            <Table className="min-w-[800px]">
                                <TableHeader className="bg-[#333533]">
                                    <TableRow className="border-[#333533]">
                                        <TableHead className="text-[#CFDBD5] pl-8 w-[300px]">Rol / Perfil</TableHead>
                                        <TableHead className="text-[#CFDBD5] text-center">Junior (1-2y)</TableHead>
                                        <TableHead className="text-[#CFDBD5] text-center">Medium (3-5y)</TableHead>
                                        <TableHead className="text-[#CFDBD5] text-center">Senior (+5y)</TableHead>
                                        <TableHead className="text-[#CFDBD5] text-center">Expert (+10y)</TableHead>
                                        <TableHead className="text-[#CFDBD5] text-center pr-8">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staffingGroups.map((group) => (
                                        <TableRow key={group.service} className="border-[#333533] hover:bg-[#333533] transition-colors group">
                                            <TableCell className="font-bold text-[#E8EDDF] pl-8 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="w-4 h-4 text-[#F5CB5C]" />
                                                    {group.service}
                                                </div>
                                            </TableCell>

                                            {/* Junior */}
                                            <TableCell className="text-center">
                                                {group.rates['Jr'] ? (
                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono">
                                                        ${group.rates['Jr'].basePrice.toLocaleString()}
                                                    </Badge>
                                                ) : <span className="text-xs text-[#CFDBD5]/30">-</span>}
                                            </TableCell>

                                            {/* Medium (Med) */}
                                            <TableCell className="text-center">
                                                {group.rates['Med'] ? (
                                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono">
                                                        ${group.rates['Med'].basePrice.toLocaleString()}
                                                    </Badge>
                                                ) : <span className="text-xs text-[#CFDBD5]/30">-</span>}
                                            </TableCell>

                                            {/* Senior */}
                                            <TableCell className="text-center">
                                                {group.rates['Sr'] ? (
                                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono">
                                                        ${group.rates['Sr'].basePrice.toLocaleString()}
                                                    </Badge>
                                                ) : <span className="text-xs text-[#CFDBD5]/30">-</span>}
                                            </TableCell>

                                            {/* Expert */}
                                            <TableCell className="text-center">
                                                {group.rates['Expert'] ? (
                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-mono">
                                                        ${group.rates['Expert'].basePrice.toLocaleString()}
                                                    </Badge>
                                                ) : <span className="text-xs text-[#CFDBD5]/30">-</span>}
                                            </TableCell>

                                            <TableCell className="text-center pr-8">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleEditMatrix(group)}
                                                    className="text-[#CFDBD5] hover:text-[#F5CB5C] hover:bg-[#F5CB5C]/10"
                                                >
                                                    <Pencil className="w-4 h-4 mr-2" />
                                                    Editar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {staffingGroups.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-[#CFDBD5] opacity-50">
                                                No hay perfiles staffing configurados.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        // GENERIC / SUSTAIN VIEW (Simplified)
                        <div className="p-8 text-center text-[#CFDBD5]">
                            Vista de servicios adicionales en construcción...
                        </div>
                    )}
                </CardContent>
            </Tabs>

            {/* Matrix Edit Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-[#242423] border-[#333533] text-[#E8EDDF] sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Editar Matriz de Precios</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label className="text-[#CFDBD5]">Nombre del Rol / Perfil</Label>
                            <Select
                                value={matrixForm.service}
                                onValueChange={(val) => setMatrixForm({ ...matrixForm, service: val })}
                            >
                                <SelectTrigger className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]">
                                    <SelectValue placeholder="Seleccionar Perfil Oficial" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ALLOWED_PROFILES.map((profile) => (
                                        <SelectItem key={profile} value={profile}>{profile}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4 border-t border-[#333533] pt-4">
                            <Label className="text-[#F5CB5C] font-bold block mb-2">Costos Mensuales (USD)</Label>

                            <div className="grid grid-cols-3 gap-4 items-center">
                                <Label className="text-right text-[#CFDBD5]">Junior</Label>
                                <Input
                                    type="number"
                                    value={matrixForm.prices.Jr}
                                    onChange={(e) => setMatrixForm({ ...matrixForm, prices: { ...matrixForm.prices, Jr: Number(e.target.value) } })}
                                    className="col-span-2 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4 items-center">
                                <Label className="text-right text-[#CFDBD5]">Medium</Label>
                                <Input
                                    type="number"
                                    value={matrixForm.prices.Med}
                                    onChange={(e) => setMatrixForm({ ...matrixForm, prices: { ...matrixForm.prices, Med: Number(e.target.value) } })}
                                    className="col-span-2 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4 items-center">
                                <Label className="text-right text-[#CFDBD5]">Senior</Label>
                                <Input
                                    type="number"
                                    value={matrixForm.prices.Sr}
                                    onChange={(e) => setMatrixForm({ ...matrixForm, prices: { ...matrixForm.prices, Sr: Number(e.target.value) } })}
                                    className="col-span-2 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4 items-center">
                                <Label className="text-right text-[#CFDBD5]">Expert</Label>
                                <Input
                                    type="number"
                                    value={matrixForm.prices.Expert}
                                    onChange={(e) => setMatrixForm({ ...matrixForm, prices: { ...matrixForm.prices, Expert: Number(e.target.value) } })}
                                    className="col-span-2 bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={handleSaveMatrix}
                            disabled={isSaving}
                            className="bg-[#F5CB5C] hover:bg-[#E0B84C] text-[#242423] font-bold w-full"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
