'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Plus, Search, User, Building2, Mail, Upload, Link2, CheckCircle2, XCircle, AlertCircle, Trash2 } from "lucide-react"

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
import { createClient, searchClients, uploadClientLogo, validateExternalLogoUrl } from "@/lib/actions"
import { toast } from "sonner"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Simple Debounce Implementation
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
    contacts?: { id: string, name: string, role?: string | null, email?: string | null }[]
    clientLogoUrl?: string | null
    // Legacy fields for fallback
    contactName?: string | null
    email?: string | null
}

interface ClientSelectorProps {
    value?: string // Client ID
    clientName?: string // For initial display or fallback
    onClientSelect: (client: ClientData, contactId?: string) => void
}

export function ClientSelector({ value, clientName, onClientSelect }: ClientSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const debouncedQuery = useDebounceValue(searchQuery, 300)
    const [loading, setLoading] = React.useState(false)
    const [clients, setClients] = React.useState<ClientData[]>([])

    // Selected Client State for Contact Selection
    const [selectedClient, setSelectedClient] = React.useState<ClientData | null>(null)

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = React.useState(false)
    const [newClientData, setNewClientData] = React.useState({
        companyName: "",
        clientLogoUrl: ""
    })
    const [newContacts, setNewContacts] = React.useState<{ name: string, role: string, email: string }[]>([
        { name: "", role: "", email: "" }
    ])

    const [isCreating, setIsCreating] = React.useState(false)

    // Logo Upload State
    const [uploadMode, setUploadMode] = React.useState<'url' | 'file'>('url')
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
    const [isUploading, setIsUploading] = React.useState(false)
    const [urlValidationStatus, setUrlValidationStatus] = React.useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
    const [validationError, setValidationError] = React.useState<string>('')

    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const urlDebounceRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

    // Cleanup objectURL
    React.useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl)
            }
        }
    }, [previewUrl])

    // Search Effect
    React.useEffect(() => {
        async function fetchClients() {
            // Allow empty query if open (Initial Load) or > 2 chars
            if (debouncedQuery.length < 2 && debouncedQuery.length > 0) return

            // Only fetch if open or valid query
            if (!open && !debouncedQuery) return

            setLoading(true)
            try {
                // Pass empty string for initial load
                const results = await searchClients(debouncedQuery)
                setClients(results as ClientData[])
            } catch (error) {
                console.error("Search error:", error)
            } finally {
                setLoading(false)
            }
        }

        if (open) {
            fetchClients()
        }
    }, [debouncedQuery, open])

    // Update selected client when value changes or clients load
    React.useEffect(() => {
        if (value && clients.length > 0) {
            const found = clients.find(c => c.id === value)
            if (found) setSelectedClient(found)
        }
    }, [value, clients])

    // Handle File Select
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
        if (!validTypes.includes(file.type)) {
            alert("Formato inválido. Solo se permiten PNG y JPG.")
            return
        }

        const maxSize = 2 * 1024 * 1024
        if (file.size > maxSize) {
            alert("El archivo es demasiado grande. Máximo 2MB.")
            return
        }

        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl)
        }

        const objectUrl = URL.createObjectURL(file)
        setSelectedFile(file)
        setPreviewUrl(objectUrl)
        setValidationError('')
    }

    // Handle URL Change
    const handleUrlChange = (url: string) => {
        setNewClientData({ ...newClientData, clientLogoUrl: url })

        if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current)

        if (!url) {
            setPreviewUrl(null)
            setUrlValidationStatus('idle')
            setValidationError('')
            return
        }

        setUrlValidationStatus('validating')
        setValidationError('')

        urlDebounceRef.current = setTimeout(async () => {
            const result = await validateExternalLogoUrl(url)
            if (result.valid) {
                setUrlValidationStatus('valid')
                setPreviewUrl(url)
                setValidationError('')
            } else {
                setUrlValidationStatus('invalid')
                setPreviewUrl(null)
                setValidationError(result.error || 'URL inválida')
            }
        }, 500)
    }

    // Handle Mode Change
    const handleModeChange = (mode: 'url' | 'file') => {
        if (uploadMode === 'file' && previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl)
        }
        setUploadMode(mode)
        setSelectedFile(null)
        setPreviewUrl(null)
        setUrlValidationStatus('idle')
        setValidationError('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // Handle Contact Changes in Create Modal
    const handleContactChange = (index: number, field: keyof typeof newContacts[0], value: string) => {
        const updatedContacts = [...newContacts]
        updatedContacts[index] = { ...updatedContacts[index], [field]: value }
        setNewContacts(updatedContacts)
    }

    const addContactField = () => {
        setNewContacts([...newContacts, { name: "", role: "", email: "" }])
    }

    const removeContactField = (index: number) => {
        if (newContacts.length === 1) return
        setNewContacts(newContacts.filter((_, i) => i !== index))
    }

    // Handle Create New
    const handleCreateClient = async () => {
        if (!newClientData.companyName) {
            alert("El nombre de la empresa es obligatorio.")
            return
        }

        // Filter out empty contacts
        const validContacts = newContacts.filter(c => c.name.trim() !== "")
        if (validContacts.length === 0) {
            alert("Debe agregar al menos un contacto con nombre.")
            return
        }

        setIsCreating(true)
        try {
            let finalLogoUrl = newClientData.clientLogoUrl

            // Upload File logic
            if (uploadMode === 'file' && selectedFile) {
                setIsUploading(true)
                const uploadFormData = new FormData()
                uploadFormData.append('file', selectedFile)
                const uploadResult = await uploadClientLogo(uploadFormData)
                setIsUploading(false)

                if (!uploadResult.success) {
                    alert(uploadResult.error || "Error al subir logo")
                    setIsCreating(false)
                    return
                }
                finalLogoUrl = uploadResult.url || ""
            }

            // URL Validation check
            if (uploadMode === 'url' && newClientData.clientLogoUrl && urlValidationStatus !== 'valid') {
                alert("Por favor espera a que se valide la URL")
                setIsCreating(false)
                return
            }

            const res = await createClient({
                companyName: newClientData.companyName,
                contacts: validContacts,
                clientLogoUrl: finalLogoUrl
            })

            if (res.success && res.client) {
                // Auto-select the first contact of the new client
                const firstContactId = res.client.contacts && res.client.contacts.length > 0 ? res.client.contacts[0].id : undefined

                onClientSelect(res.client, firstContactId)

                setShowCreateModal(false)
                setOpen(false)
                setSearchQuery("")
                setNewClientData({ companyName: "", clientLogoUrl: "" })
                setNewContacts([{ name: "", role: "", email: "" }])
                setPreviewUrl(null)
                setSelectedFile(null)
            } else {
                alert(res.error || "Error al crear cliente")
            }
        } catch (e) {
            console.error(e)
            alert("Error de conexión")
        } finally {
            setIsCreating(false)
            setIsUploading(false)
        }
    }

    // Initialize "Create" form
    const handleOpenCreate = () => {
        setNewClientData({ companyName: searchQuery, clientLogoUrl: "" })
        setNewContacts([{ name: "", role: "", email: "" }])
        setPreviewUrl(null)
        setSelectedFile(null)
        setUploadMode('url')
        setShowCreateModal(true)
    }

    return (
        <div className="w-full block">
            {/* 1. Client Select */}
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
                            <span className="text-[#CFDBD5]/50 flex items-center gap-2"><Building2 className="w-4 h-4" /> Seleccionar Empresa...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 bg-[#242423] border-[#4A4D4A] text-[#E8EDDF]" align="start">
                    <div className="flex items-center border-b border-[#4A4D4A] px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                            placeholder="Buscar empresa..."
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
                                {clients.length === 0 ? "No tienes clientes recientes." : "Escribe para buscar..."}
                            </div>
                        )}
                        {!loading && clients.length > 0 && (
                            <div className="space-y-1">
                                {clients.map((client) => (
                                    <div
                                        key={client.id}
                                        onClick={() => {
                                            setSelectedClient(client)
                                            // Select first contact by default/logic
                                            const defaultContactId = client.contacts?.[0]?.id
                                            onClientSelect(client, defaultContactId)
                                            setOpen(false)
                                            setSearchQuery("")
                                        }}
                                        className={cn(
                                            "flex flex-col cursor-pointer select-none rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-[#333533] hover:text-[#E8EDDF]",
                                            value === client.id ? "bg-[#F5CB5C]/10 text-[#F5CB5C]" : ""
                                        )}
                                    >
                                        <div className="font-bold text-base">{client.companyName}</div>
                                        <div className="text-xs text-[#CFDBD5]/50">
                                            {client.contacts?.length || 0} contactos asociados
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!loading && (searchQuery.length > 0) && (
                            <div className="p-1 mt-2 border-t border-[#4A4D4A]/50">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-[#F5CB5C] hover:text-[#E0B84C] hover:bg-[#F5CB5C]/10 h-auto py-3 px-3"
                                    onClick={handleOpenCreate}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Crear Nuevo Cliente: "{searchQuery}"
                                </Button>
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* CREATE MODAL */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="bg-[#242423] border-[#4A4D4A] text-[#E8EDDF] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-[#F5CB5C]">Crear Nuevo Cliente</DialogTitle>
                        <DialogDescription className="text-[#CFDBD5]">
                            Registre la empresa y sus contactos clave.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        {/* Company Info */}
                        <div className="grid gap-2">
                            <Label htmlFor="company" className="text-[#E8EDDF] font-bold">Empresa *</Label>
                            <Input
                                id="company"
                                value={newClientData.companyName}
                                onChange={(e) => setNewClientData({ ...newClientData, companyName: e.target.value })}
                                className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] focus:border-[#F5CB5C]"
                                placeholder="Nombre de la empresa"
                            />
                        </div>

                        {/* Contacts Section */}
                        <div className="space-y-3">
                            <Label className="text-[#E8EDDF] font-bold flex justify-between items-center">
                                Contactos
                                <Button size="sm" variant="ghost" onClick={addContactField} className="h-6 text-[#F5CB5C] hover:bg-[#F5CB5C]/10 text-xs">
                                    + Agregar Otro
                                </Button>
                            </Label>

                            {newContacts.map((contact, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-[#1E1E1E] rounded-lg border border-[#333533] relative group">
                                    {newContacts.length > 1 && (
                                        <button
                                            onClick={() => removeContactField(index)}
                                            className="absolute -right-2 -top-2 bg-[#333533] text-zinc-400 p-1 rounded-full hover:text-red-400 hover:bg-[#1a1a1a] border border-[#4A4D4A]"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}

                                    <div className="col-span-12 md:col-span-4">
                                        <Input
                                            placeholder="Nombre Completo"
                                            value={contact.name}
                                            onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                                            className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] h-9 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <Input
                                            placeholder="Cargo / Rol"
                                            value={contact.role}
                                            onChange={(e) => handleContactChange(index, 'role', e.target.value)}
                                            className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] h-9 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <Input
                                            placeholder="Email"
                                            value={contact.email}
                                            onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                                            className="bg-[#333533] border-[#4A4D4A] text-[#E8EDDF] h-9 text-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>


                        {/* Logo Upload Section */}
                        <div className="space-y-3 pt-4 border-t border-[#333533]">
                            <Label className="text-[#CFDBD5] font-bold">Logo del Cliente (Opcional)</Label>

                            <RadioGroup value={uploadMode} onValueChange={(v) => handleModeChange(v as 'url' | 'file')} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="url" id="mode-url" className="border-[#F5CB5C] text-[#F5CB5C]" />
                                    <Label htmlFor="mode-url" className="text-sm cursor-pointer flex items-center gap-1 text-[#CFDBD5]">
                                        <Link2 className="w-4 h-4" /> URL Externa
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="file" id="mode-file" className="border-[#F5CB5C] text-[#F5CB5C]" />
                                    <Label htmlFor="mode-file" className="text-sm cursor-pointer flex items-center gap-1 text-[#CFDBD5]">
                                        <Upload className="w-4 h-4" /> Subir Archivo
                                    </Label>
                                </div>
                            </RadioGroup>

                            {/* URL Input */}
                            {uploadMode === 'url' && (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Input
                                            placeholder="https://ejemplo.com/logo.png"
                                            className="bg-[#333533] border-transparent focus:border-[#F5CB5C] text-[#E8EDDF] pr-10"
                                            value={newClientData.clientLogoUrl || ''}
                                            onChange={(e) => handleUrlChange(e.target.value)}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {urlValidationStatus === 'validating' && <Loader2 className="w-4 h-4 animate-spin text-[#CFDBD5]" />}
                                            {urlValidationStatus === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                            {urlValidationStatus === 'invalid' && <XCircle className="w-4 h-4 text-red-500" />}
                                        </div>
                                    </div>
                                    {validationError && (
                                        <p className="text-xs text-red-400 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {validationError}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* File Input */}
                            {uploadMode === 'file' && (
                                <div className="space-y-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full bg-[#333533] border-[#333533] hover:bg-[#3a3d3a] text-[#E8EDDF]"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        {selectedFile ? selectedFile.name : 'Seleccionar archivo PNG/JPG'}
                                    </Button>
                                    <p className="text-xs text-[#CFDBD5]/70">Máximo 2MB</p>
                                </div>
                            )}

                            {/* Preview */}
                            {previewUrl && (
                                <div className="mt-3 p-3 bg-[#1a1a1a] rounded-lg border border-dashed border-[#333533]">
                                    <p className="text-xs text-[#CFDBD5] mb-2">Vista Previa:</p>
                                    <div className="flex justify-center items-center min-h-[80px] bg-white/5 rounded p-2">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="max-h-20 max-w-full object-contain"
                                            onError={() => {
                                                setPreviewUrl(null)
                                                setUrlValidationStatus('invalid')
                                                setValidationError('Error al visualizar imagen')
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowCreateModal(false)} className="text-[#CFDBD5] hover:text-[#E8EDDF]">Cancelar</Button>
                        <Button
                            onClick={handleCreateClient}
                            disabled={isCreating || isUploading || (uploadMode === 'url' && urlValidationStatus === 'validating')}
                            className="bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C]"
                        >
                            {(isCreating || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isUploading ? 'Subiendo...' : 'Crear y Seleccionar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
