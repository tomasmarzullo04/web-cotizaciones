'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Plus, Search, User, Building2, Mail } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient, searchClients } from "@/lib/actions"
import { useDebounce } from "@/lib/hooks" // Assuming standard hook exists, or I will implement basic debounce

// Simple Debounce Implementation if hooks file doesn't exist or is complex
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export interface ClientData {
    id: string
    companyName: string
    contactName?: string | null
    email?: string | null
}

interface ClientSelectorProps {
    value?: string
    clientName?: string // For initial display or fallback
    onClientSelect: (client: ClientData, isNew: boolean) => void
}

export function ClientSelector({ value, clientName, onClientSelect }: ClientSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const debouncedQuery = useDebounceValue(searchQuery, 300)
    const [loading, setLoading] = React.useState(false)
    const [clients, setClients] = React.useState<ClientData[]>([])

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = React.useState(false)
    const [newClientData, setNewClientData] = React.useState({
        companyName: "",
        contactName: "",
        email: ""
    })
    const [isCreating, setIsCreating] = React.useState(false)

    // Search Effect
    React.useEffect(() => {
        async function fetchClients() {
            if (debouncedQuery.length < 2) {
                setClients([])
                return
            }
            setLoading(true)
            try {
                const results = await searchClients(debouncedQuery)
                setClients(results as ClientData[])
            } catch (error) {
                console.error("Search error:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchClients()
    }, [debouncedQuery])

    // Handle Create New
    const handleCreateClient = async () => {
        if (!newClientData.companyName || !newClientData.email || !newClientData.contactName) {
            alert("Por favor complete todos los campos obligatorios.")
            return
        }

        setIsCreating(true)
        const res = await createClient(newClientData)
        setIsCreating(false)

        if (res.success && res.client) {
            // Select the new client
            onClientSelect(res.client, true) // isNew = true
            setShowCreateModal(false)
            setOpen(false)
            setSearchQuery("") // Reset search
            setNewClientData({ companyName: "", contactName: "", email: "" }) // Reset form
        } else {
            alert(res.error || "Error al crear cliente")
        }
    }

    // Initialize "Create" form with search query if it looks like a name
    const handleOpenCreate = () => {
        setNewClientData(prev => ({ ...prev, companyName: searchQuery }))
        setShowCreateModal(true)
    }

    return (
        <div className="w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] hover:bg-[#404240] hover:text-[#E8EDDF] h-[50px] text-lg font-normal py-6 rounded-xl"
                    >
                        {clientName ? (
                            <div className="flex flex-col items-start truncate text-left">
                                <span className="font-bold text-base">{clientName}</span>
                                {/* Optional: Show ID or subtle indicator */}
                            </div>
                        ) : (
                            <span className="text-[#CFDBD5]/50">Buscar cliente...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]" align="start">
                    <div className="flex items-center border-b border-[#4A4D4A] px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                            placeholder="Escriba nombre de empresa..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[#E8EDDF]"
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                        {loading && (
                            <div className="py-6 text-center text-sm text-muted-foreground flex justify-center items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
                            </div>
                        )}
                        {!loading && clients.length === 0 && searchQuery.length < 2 && (
                            <div className="py-6 text-center text-sm text-[#CFDBD5]/50">
                                Escriba al menos 2 caracteres para buscar.
                            </div>
                        )}
                        {!loading && clients.length > 0 && (
                            <div className="space-y-1">
                                {clients.map((client) => (
                                    <div
                                        key={client.id}
                                        onClick={() => {
                                            onClientSelect(client, false)
                                            setOpen(false)
                                            setHtmlQuery("")
                                        }}
                                        className={cn(
                                            "flex flex-col cursor-pointer select-none rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-[#333533] hover:text-[#E8EDDF]",
                                            value === client.id ? "bg-[#F5CB5C]/10 text-[#F5CB5C]" : ""
                                        )}
                                    >
                                        <div className="font-bold text-base">{client.companyName}</div>
                                        <div className="text-xs text-[#CFDBD5]/70 flex gap-3">
                                            {client.contactName && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {client.contactName}</span>}
                                            {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {client.email}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!loading && searchQuery.length >= 2 && (
                            <div className="p-1 mt-2 border-t border-[#4A4D4A]/50">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-[#F5CB5C] hover:text-[#E0B84C] hover:bg-[#F5CB5C]/10 h-auto py-3 px-3"
                                    onClick={handleOpenCreate}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Crear Nuevo Lead: "{searchQuery}"
                                </Button>
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* CREATE MODAL */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-[#F5CB5C]">Crear Nuevo Lead</DialogTitle>
                        <DialogDescription className="text-[#CFDBD5]">
                            Ingrese los datos obligatorios para registrar el prospecto.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="company" className="text-[#E8EDDF]">Empresa *</Label>
                            <Input
                                id="company"
                                value={newClientData.companyName}
                                onChange={(e) => setNewClientData({ ...newClientData, companyName: e.target.value })}
                                className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                placeholder="Nombre de la empresa"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contact" className="text-[#E8EDDF]">Contacto Principal *</Label>
                            <Input
                                id="contact"
                                value={newClientData.contactName}
                                onChange={(e) => setNewClientData({ ...newClientData, contactName: e.target.value })}
                                className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                placeholder="Nombre y Apellido"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-[#E8EDDF]">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newClientData.email}
                                onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                                className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF]"
                                placeholder="correo@empresa.com"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowCreateModal(false)} className="text-[#CFDBD5] hover:text-[#E8EDDF]">Cancelar</Button>
                        <Button
                            onClick={handleCreateClient}
                            disabled={isCreating}
                            className="bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C]"
                        >
                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear y Seleccionar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
