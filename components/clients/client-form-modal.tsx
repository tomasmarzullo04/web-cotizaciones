
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient, updateClient } from '@/lib/actions'
import { toast } from 'sonner'
import { Plus, Loader2, Edit2 } from 'lucide-react'

export interface ClientData {
    id?: string
    companyName: string
    contactName: string
    email: string
}

interface ClientFormModalProps {
    initialData?: ClientData | null
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
    onClientSaved?: () => void
    trigger?: React.ReactNode // Custom trigger button
}

export function ClientFormModal({ initialData, isOpen, onOpenChange, onClientSaved, trigger }: ClientFormModalProps) {
    // Internal state for uncontrolled usage
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<ClientData>({
        companyName: '',
        contactName: '',
        email: ''
    })

    // Sync open state
    const isControlled = isOpen !== undefined
    const open = isControlled ? isOpen : internalOpen
    const setOpen = (val: boolean) => {
        if (!isControlled) setInternalOpen(val)
        if (onOpenChange) onOpenChange(val)
    }

    // Effect to populate form on Edit Mode
    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({
                    id: initialData.id,
                    companyName: initialData.companyName,
                    contactName: initialData.contactName || '',
                    email: initialData.email || ''
                })
            } else {
                // Reset for Create Mode
                setFormData({ companyName: '', contactName: '', email: '' })
            }
        }
    }, [open, initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.companyName) {
            toast.error("El nombre de la empresa es obligatorio")
            return
        }

        setLoading(true)
        try {
            let result;
            if (initialData?.id) {
                // UPDATE
                result = await updateClient(initialData.id, formData)
            } else {
                // CREATE
                result = await createClient(formData)
            }

            if (result.success) {
                toast.success(initialData ? "Cliente actualizado" : "Cliente creado exitosamente")
                setOpen(false)
                if (onClientSaved) onClientSaved()
            } else {
                toast.error(result.error || "Error al guardar")
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {/* Custom Trigger or Default Plus Button */}
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : (
                !isControlled && (
                    <DialogTrigger asChild>
                        <Button className="bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C] font-bold">
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Cliente
                        </Button>
                    </DialogTrigger>
                )
            )}

            <DialogContent className="bg-[#242423] border-[#333533] text-[#E8EDDF] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-[#F5CB5C]">
                        {initialData ? "Editar Cliente" : "Registrar Nuevo Cliente"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-[#CFDBD5]">Empresa / Razón Social</Label>
                        <Input
                            id="companyName"
                            className="bg-[#333533] border-transparent focus:border-[#F5CB5C] text-[#E8EDDF]"
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactName" className="text-[#CFDBD5]">Nombre de Contacto</Label>
                        <Input
                            id="contactName"
                            className="bg-[#333533] border-transparent focus:border-[#F5CB5C] text-[#E8EDDF]"
                            value={formData.contactName}
                            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-[#CFDBD5]">Email de Contacto</Label>
                        <Input
                            id="email"
                            type="email"
                            className="bg-[#333533] border-transparent focus:border-[#F5CB5C] text-[#E8EDDF]"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-[#CFDBD5] hover:text-[#E8EDDF] hover:bg-[#333533]">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C] font-bold">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (initialData ? "Actualizar" : "Guardar")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
