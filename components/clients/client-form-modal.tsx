'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createClient, updateClient, uploadClientLogo, validateExternalLogoUrl } from '@/lib/actions'
import { toast } from 'sonner'
import { Plus, Loader2, Upload, Link2, CheckCircle2, XCircle, AlertCircle, Pencil } from 'lucide-react'

export interface ClientData {
    id?: string
    companyName: string
    contacts?: { id?: string, name: string, role?: string, email?: string }[]
    clientLogoUrl?: string
    // Legacy support for older props if needed
    contactName?: string
    email?: string
}

interface ClientFormModalProps {
    initialData?: ClientData | null
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
    onClientSaved?: () => void
    trigger?: React.ReactNode
}

type UploadMode = 'url' | 'file'
type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid'

export function ClientFormModal({ initialData, isOpen, onOpenChange, onClientSaved, trigger }: ClientFormModalProps) {
    // Internal state for uncontrolled usage
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Updated State for Multi-Contact
    const [companyName, setCompanyName] = useState('')
    const [clientLogoUrl, setClientLogoUrl] = useState('')
    const [contacts, setContacts] = useState<{ id?: string, name: string, role: string, email: string }[]>([])

    // Temp Contact State for Add/Edit
    const [tempContact, setTempContact] = useState({ name: '', role: '', email: '' })
    const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null)

    // Logo upload states
    const [uploadMode, setUploadMode] = useState<UploadMode>('url')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [urlValidationStatus, setUrlValidationStatus] = useState<ValidationStatus>('idle')
    const [validationError, setValidationError] = useState<string>('')

    const fileInputRef = useRef<HTMLInputElement>(null)
    const urlDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

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
                setCompanyName(initialData.companyName)
                setClientLogoUrl(initialData.clientLogoUrl || '')

                // Populate contacts
                if (initialData.contacts && initialData.contacts.length > 0) {
                    setContacts(initialData.contacts.map(c => ({
                        id: c.id,
                        name: c.name || '',
                        role: c.role || '',
                        email: c.email || ''
                    })))
                } else {
                    // Fallback for legacy single contact
                    if (initialData.contactName) {
                        setContacts([{
                            name: initialData.contactName || '',
                            role: '',
                            email: initialData.email || ''
                        }])
                    } else {
                        setContacts([])
                    }
                }

                // Set preview if logo exists
                if (initialData.clientLogoUrl) {
                    setPreviewUrl(initialData.clientLogoUrl)
                    // Determine mode based on URL
                    setUploadMode(initialData.clientLogoUrl.includes('supabase') ? 'file' : 'url')
                }
            } else {
                // Reset for Create Mode
                setCompanyName('')
                setClientLogoUrl('')
                setContacts([])
                setTempContact({ name: '', role: '', email: '' })
                setEditingContactIndex(null)
                setPreviewUrl(null)
                setSelectedFile(null)
                setUploadMode('url')
                setUrlValidationStatus('idle')
                setValidationError('')
            }
        }
    }, [open, initialData])

    // Cleanup objectURL on unmount or file change
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl)
            }
        }
    }, [previewUrl])

    // Handle file selection with instant preview
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
        if (!validTypes.includes(file.type)) {
            toast.error("Formato inválido. Solo se permiten PNG y JPG.")
            return
        }

        // Validate file size (2MB max)
        const maxSize = 2 * 1024 * 1024
        if (file.size > maxSize) {
            toast.error("El archivo es demasiado grande. Máximo 2MB.")
            return
        }

        // Revoke previous objectURL if exists
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl)
        }

        // Create instant preview
        const objectUrl = URL.createObjectURL(file)
        setSelectedFile(file)
        setPreviewUrl(objectUrl)
        setValidationError('')
    }

    // Handle URL input with debounced validation
    const handleUrlChange = (url: string) => {
        setClientLogoUrl(url)

        // Clear previous debounce
        if (urlDebounceRef.current) {
            clearTimeout(urlDebounceRef.current)
        }

        if (!url) {
            setPreviewUrl(null)
            setUrlValidationStatus('idle')
            setValidationError('')
            return
        }

        setUrlValidationStatus('validating')
        setValidationError('')

        // Debounce validation
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

    // Handle mode change
    const handleModeChange = (mode: UploadMode) => {
        // Revoke objectURL if switching away from file mode
        if (uploadMode === 'file' && previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl)
        }

        setUploadMode(mode)
        setSelectedFile(null)
        setPreviewUrl(initialData?.clientLogoUrl || null)
        setUrlValidationStatus('idle')
        setValidationError('')

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // --- Contact Handlers ---
    const handleSaveContact = () => {
        if (!tempContact.name.trim()) {
            toast.error("El nombre del contacto es obligatorio")
            return
        }

        if (editingContactIndex !== null) {
            // Update existing
            const updated = [...contacts]
            updated[editingContactIndex] = { ...updated[editingContactIndex], ...tempContact }
            setContacts(updated)
            setEditingContactIndex(null)
            toast.success("Contacto actualizado")
        } else {
            // Add new
            setContacts([...contacts, tempContact])
            toast.success("Contacto agregado")
        }
        // Reset form
        setTempContact({ name: '', role: '', email: '' })
    }

    const handleEditContact = (index: number) => {
        setTempContact(contacts[index])
        setEditingContactIndex(index)
    }

    const handleDeleteContact = (index: number) => {
        const updated = contacts.filter((_, i) => i !== index)
        setContacts(updated)
        // If we were editing this one, cancel edit
        if (editingContactIndex === index) {
            setEditingContactIndex(null)
            setTempContact({ name: '', role: '', email: '' })
        }
    }

    const handleCancelEdit = () => {
        setEditingContactIndex(null)
        setTempContact({ name: '', role: '', email: '' })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!companyName) {
            toast.error("El nombre de la empresa es obligatorio")
            return
        }

        // Validate at least one contact
        if (contacts.length === 0) {
            toast.error("Debe agregar al menos un contacto a la lista")
            return
        }

        setLoading(true)
        try {
            let finalLogoUrl = clientLogoUrl

            // If file mode and file selected, upload it first
            if (uploadMode === 'file' && selectedFile) {
                setIsUploading(true)
                const uploadFormData = new FormData()
                uploadFormData.append('file', selectedFile)

                const uploadResult = await uploadClientLogo(uploadFormData, initialData?.clientLogoUrl || undefined)
                setIsUploading(false)

                if (!uploadResult.success) {
                    toast.error(uploadResult.error || "Error al subir logo")
                    setLoading(false)
                    return
                }

                finalLogoUrl = uploadResult.url || ''
            }

            // If URL mode, validate first
            if (uploadMode === 'url' && clientLogoUrl) {
                if (urlValidationStatus !== 'valid') {
                    toast.error("Por favor espera a que se valide la URL")
                    setLoading(false)
                    return
                }
            }

            // Create or update client
            let result
            if (initialData?.id) {
                result = await updateClient(initialData.id, {
                    companyName,
                    clientLogoUrl: finalLogoUrl,
                    contacts: contacts
                })
            } else {
                result = await createClient({
                    companyName,
                    clientLogoUrl: finalLogoUrl,
                    contacts: contacts
                })
            }

            if (result.success) {
                toast.success(initialData ? "Cliente actualizado" : "Cliente creado exitosamente")
                setOpen(false)
                if (onClientSaved) onClientSaved()
            } else {
                toast.error(result.error || "Error al guardar")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
            setIsUploading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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

            <DialogContent className="bg-[#242423] border-[#333533] text-[#E8EDDF] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-[#F5CB5C]">
                        {initialData ? "Editar Cliente" : "Registrar Nuevo Cliente"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 mt-2">
                    {/* SECTION 1: Company Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="companyName" className="text-[#CFDBD5] font-bold uppercase text-xs tracking-wider">Empresa / Razón Social</Label>
                            <Input
                                id="companyName"
                                className="bg-[#333533] border-transparent focus:border-[#F5CB5C] text-[#E8EDDF] h-11"
                                placeholder="Ej: Tech Solutions S.A."
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                            />
                        </div>
                        {/* Logo Upload Section - Compact */}
                        <div className="space-y-2">
                            <Label className="text-[#CFDBD5] font-bold uppercase text-xs tracking-wider">Logo del Cliente (Opcional)</Label>

                            <div className="flex gap-2 items-start">
                                {/* Preview Box */}
                                <div className="w-11 h-11 bg-[#1a1a1a] rounded-lg border border-[#333533] flex items-center justify-center overflow-hidden shrink-0">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <Link2 className="w-4 h-4 text-[#CFDBD5]/30" />
                                    )}
                                </div>

                                <div className="flex-1 space-y-2">
                                    <RadioGroup value={uploadMode} onValueChange={(v) => handleModeChange(v as UploadMode)} className="flex gap-3 mb-1">
                                        <div className="flex items-center space-x-1">
                                            <RadioGroupItem value="url" id="mode-url" className="text-[#F5CB5C] border-[#F5CB5C] w-3 h-3" />
                                            <Label htmlFor="mode-url" className="text-xs cursor-pointer text-[#CFDBD5]">URL</Label>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <RadioGroupItem value="file" id="mode-file" className="text-[#F5CB5C] border-[#F5CB5C] w-3 h-3" />
                                            <Label htmlFor="mode-file" className="text-xs cursor-pointer text-[#CFDBD5]">Archivo</Label>
                                        </div>
                                    </RadioGroup>

                                    {uploadMode === 'url' ? (
                                        <div className="relative">
                                            <Input
                                                placeholder="https://..."
                                                className="bg-[#333533] border-transparent focus:border-[#F5CB5C] text-[#E8EDDF] h-8 text-xs pr-8"
                                                value={clientLogoUrl}
                                                onChange={(e) => handleUrlChange(e.target.value)}
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                {urlValidationStatus === 'validating' && <Loader2 className="w-3 h-3 animate-spin text-[#CFDBD5]" />}
                                                {urlValidationStatus === 'valid' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                                            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full h-8 text-xs bg-[#333533] border-[#333533] text-[#CFDBD5]">
                                                {selectedFile ? selectedFile.name : 'Seleccionar archivo'}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[#333533] my-4" />

                    {/* SECTION 2: Contact List */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-[#CFDBD5] font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                                Contactos Registrados <span className="bg-[#333533] text-[#F5CB5C] px-2 py-0.5 rounded-full text-[10px]">{contacts.length}</span>
                            </Label>
                        </div>

                        {contacts.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {contacts.map((contact, idx) => (
                                    <div key={idx} className="group flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg border border-[#333533] hover:border-[#F5CB5C]/30 transition-all">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-[#CFDBD5]/50 uppercase tracking-wider font-bold">Nombre</span>
                                                <span className="text-sm font-medium text-[#E8EDDF] truncate">{contact.name}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-[#CFDBD5]/50 uppercase tracking-wider font-bold">Cargo</span>
                                                <span className="text-sm text-[#CFDBD5] truncate">{contact.role || '-'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-[#CFDBD5]/50 uppercase tracking-wider font-bold">Email</span>
                                                <span className="text-sm text-[#CFDBD5] truncate">{contact.email || '-'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pl-4 border-l border-[#333533] ml-4">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditContact(idx)}
                                                className="h-8 w-8 text-[#F5CB5C] hover:bg-[#F5CB5C]/10"
                                            >
                                                <Pencil className="w-4 h-4" /> {/* Edit Icon replacement */}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteContact(idx)}
                                                className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-900/10"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center border-2 border-dashed border-[#333533] rounded-xl bg-[#1a1a1a]/50">
                                <p className="text-[#CFDBD5]/40 text-sm">No hay contactos registrados aún.</p>
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: Add/Edit Contact Form */}
                    <div className="bg-[#1E1E1E] p-4 rounded-xl border border-[#333533] shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#F5CB5C]" />
                        <h4 className="text-sm font-bold text-[#E8EDDF] mb-4 flex items-center gap-2">
                            {editingContactIndex !== null ? '✏️ Editar Contacto' : '➕ Nuevo Contacto'}
                            {editingContactIndex !== null && (
                                <span className="text-[10px] font-normal text-[#F5CB5C] bg-[#F5CB5C]/10 px-2 py-0.5 rounded">Modo Edición</span>
                            )}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-[#CFDBD5]/70">Nombre Completo *</Label>
                                <Input
                                    value={tempContact.name}
                                    onChange={(e) => setTempContact({ ...tempContact, name: e.target.value })}
                                    placeholder="Ej. Juan Pérez"
                                    className="bg-[#242423] border-[#333533] focus:border-[#F5CB5C] text-[#E8EDDF]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-[#CFDBD5]/70">Cargo / Rol</Label>
                                <Input
                                    value={tempContact.role}
                                    onChange={(e) => setTempContact({ ...tempContact, role: e.target.value })}
                                    placeholder="Ej. Gerente Comercial"
                                    className="bg-[#242423] border-[#333533] focus:border-[#F5CB5C] text-[#E8EDDF]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-[#CFDBD5]/70">Email</Label>
                                <Input
                                    value={tempContact.email}
                                    onChange={(e) => setTempContact({ ...tempContact, email: e.target.value })}
                                    placeholder="juan@empresa.com"
                                    className="bg-[#242423] border-[#333533] focus:border-[#F5CB5C] text-[#E8EDDF]"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            {editingContactIndex !== null && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    className="text-[#CFDBD5] hover:text-[#E8EDDF] h-9 text-xs"
                                >
                                    Cancelar Edición
                                </Button>
                            )}
                            <Button
                                type="button"
                                onClick={handleSaveContact}
                                className="bg-[#333533] hover:bg-[#F5CB5C] text-[#F5CB5C] hover:text-[#242423] border border-[#F5CB5C]/30 h-9 text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                                {editingContactIndex !== null ? 'Actualizar Contacto' : 'Guardar Contacto'}
                            </Button>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-[#333533] mt-6">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-[#CFDBD5] hover:text-[#E8EDDF] hover:bg-[#333533]">
                            Cancelar Operación
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || isUploading || (uploadMode === 'url' && urlValidationStatus === 'validating') || contacts.length === 0}
                            className="bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C] font-bold h-11 px-8 text-base shadow-[0_0_15px_rgba(245,203,92,0.3)]"
                        >
                            {(loading || isUploading) ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    {isUploading ? 'Subiendo...' : 'Guardando...'}
                                </>
                            ) : (
                                initialData ? "Guardar Cambios del Cliente" : "Registrar Cliente Completado"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
