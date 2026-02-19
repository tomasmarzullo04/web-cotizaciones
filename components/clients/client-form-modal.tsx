'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createClient, updateClient, uploadClientLogo, validateExternalLogoUrl } from '@/lib/actions'
import { toast } from 'sonner'
import { Plus, Loader2, Upload, Link2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

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
    const [contacts, setContacts] = useState<{ id?: string, name: string, role: string, email: string }[]>([
        { name: '', role: '', email: '' }
    ])

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
                    setContacts([{
                        name: initialData.contactName || '',
                        role: '',
                        email: initialData.email || ''
                    }])
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
                setContacts([{ name: '', role: '', email: '' }])
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

    // Contact Management Helpers
    const handleContactChange = (index: number, field: keyof typeof contacts[0], value: string) => {
        const newContacts = [...contacts]
        newContacts[index] = { ...newContacts[index], [field]: value }
        setContacts(newContacts)
    }

    const addContact = () => {
        setContacts([...contacts, { name: '', role: '', email: '' }])
    }

    const removeContact = (index: number) => {
        if (contacts.length === 1) return // Keep at least one
        const newContacts = contacts.filter((_, i) => i !== index)
        setContacts(newContacts)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!companyName) {
            toast.error("El nombre de la empresa es obligatorio")
            return
        }

        // Validate at least one contact name
        const validContacts = contacts.filter(c => c.name.trim() !== '')
        if (validContacts.length === 0) {
            toast.error("Debe agregar al menos un contacto con nombre")
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

                const uploadResult = await uploadClientLogo(uploadFormData, initialData?.clientLogoUrl || '')
                setIsUploading(false)

                if (!uploadResult.success) {
                    toast.error(uploadResult.error || "Error al subir logo")
                    setLoading(false)
                    return
                }

                finalLogoUrl = uploadResult.url
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
                    contacts: validContacts.map(c => ({
                        id: c.id,
                        name: c.name,
                        role: c.role,
                        email: c.email
                    }))
                })
            } else {
                result = await createClient({
                    companyName,
                    clientLogoUrl: finalLogoUrl,
                    contacts: validContacts.map(c => ({
                        name: c.name,
                        role: c.role || '',
                        email: c.email || ''
                    }))
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

            <DialogContent className="bg-[#242423] border-[#333533] text-[#E8EDDF] sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                        />
                    </div>
                    {/* Dynamic Contacts Section */}
                    <div className="space-y-3">
                        <Label className="text-[#CFDBD5] flex justify-between items-center">
                            Contactos
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={addContact}
                                className="h-6 text-[#F5CB5C] hover:bg-[#F5CB5C]/10 hover:text-[#F5CB5C] text-xs"
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                Agregar Contacto
                            </Button>
                        </Label>

                        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {contacts.map((contact, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-[#1E1E1E] rounded-lg border border-[#333533] relative group">
                                    {/* Delete Button */}
                                    {contacts.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeContact(index)}
                                            className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-[#242423] border border-[#333533] text-[#CFDBD5] hover:text-red-400 hover:bg-[#242423] opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </Button>
                                    )}

                                    {/* Name */}
                                    <div className="col-span-12 sm:col-span-4 space-y-1">
                                        <Label className="text-xs text-[#CFDBD5]/50">Nombre *</Label>
                                        <Input
                                            value={contact.name}
                                            onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                                            placeholder="Nombre Completo"
                                            className="bg-[#333533] border-transparent focus:border-[#F5CB5C] text-[#E8EDDF] h-8 text-sm"
                                        />
                                    </div>

                                    {/* Role */}
                                    <div className="col-span-12 sm:col-span-4 space-y-1">
                                        <Label className="text-xs text-[#CFDBD5]/50">Cargo</Label>
                                        <Input
                                            value={contact.role}
                                            onChange={(e) => handleContactChange(index, 'role', e.target.value)}
                                            placeholder="Ej. Gerente TI"
                                            className="bg-[#333533] border-transparent focus:border-[#F5CB5C] text-[#E8EDDF] h-8 text-sm"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="col-span-12 sm:col-span-4 space-y-1">
                                        <Label className="text-xs text-[#CFDBD5]/50">Email</Label>
                                        <Input
                                            value={contact.email}
                                            onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                                            placeholder="correo@empresa.com"
                                            className="bg-[#333533] border-transparent focus:border-[#F5CB5C] text-[#E8EDDF] h-8 text-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Logo Upload Section */}
                    <div className="space-y-3 pt-2 border-t border-[#333533]">
                        <Label className="text-[#CFDBD5]">Logo del Cliente (Opcional)</Label>

                        {/* Mode Selector */}
                        <RadioGroup value={uploadMode} onValueChange={(v) => handleModeChange(v as UploadMode)} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="url" id="mode-url" className="border-[#F5CB5C] text-[#F5CB5C]" />
                                <Label htmlFor="mode-url" className="text-sm cursor-pointer flex items-center gap-1">
                                    <Link2 className="w-4 h-4" />
                                    URL Externa
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="file" id="mode-file" className="border-[#F5CB5C] text-[#F5CB5C]" />
                                <Label htmlFor="mode-file" className="text-sm cursor-pointer flex items-center gap-1">
                                    <Upload className="w-4 h-4" />
                                    Subir Archivo
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
                                        value={clientLogoUrl}
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
                                        <AlertCircle className="w-3 h-3" />
                                        {validationError}
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
                                    id="logo-file-input"
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
                                            setValidationError('Error al cargar la imagen')
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-[#CFDBD5] hover:text-[#E8EDDF] hover:bg-[#333533]">
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || isUploading || (uploadMode === 'url' && urlValidationStatus === 'validating')}
                            className="bg-[#F5CB5C] text-[#242423] hover:bg-[#E0B84C] font-bold"
                        >
                            {(loading || isUploading) ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {isUploading ? 'Subiendo...' : 'Guardando...'}
                                </>
                            ) : (
                                initialData ? "Actualizar" : "Guardar"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
