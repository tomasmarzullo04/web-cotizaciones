
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ClientFormModal, ClientData } from '@/components/clients/client-form-modal'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Building, User, Mail, Pencil, Trash2 } from 'lucide-react'
import { deleteClient } from '@/lib/actions'
import { toast } from 'sonner'

export function ClientsManager({ initialClients }: { initialClients: any[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // State for Search
    const [query, setQuery] = useState(searchParams.get('q') || '')

    // State for Edit
    const [editingClient, setEditingClient] = useState<ClientData | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    // State for Delete
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Search Handler (Debounced or Enter)
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        router.push(`/clients?q=${query}`)
    }

    // Edit Handler
    const handleEdit = (client: any) => {
        setEditingClient({
            id: client.id,
            companyName: client.companyName,
            // Pass full contacts list
            contacts: client.contacts.map((c: any) => ({
                id: c.id,
                name: c.name,
                role: c.role,
                email: c.email
            })),
            clientLogoUrl: client.clientLogoUrl,
            // Legacy fallbacks (optional but good for safety)
            contactName: client.contactName,
            email: client.email
        })
        setIsEditOpen(true)
    }

    // Delete Handler
    const handleDelete = async () => {
        if (!deletingId) return

        try {
            const res = await deleteClient(deletingId)
            if (res.success) {
                toast.success("Cliente eliminado")
                router.refresh() // Refresh server data
            } else {
                toast.error(res.error || "Error al eliminar")
            }
        } catch (e) {
            toast.error("Error de conexión")
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-8">
            {/* SEARCH & ADD ROW */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* SEARCH */}
                <div className="relative max-w-md group w-full md:w-auto flex-1">
                    <form onSubmit={handleSearch}>
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar empresa, contacto o email..."
                            className="bg-[#333533] border-transparent focus:border-[#F5CB5C] pl-6 pr-12 text-[#E8EDDF] h-14 w-full rounded-2xl text-base shadow-sm transition-all focus:shadow-[0_0_15px_rgba(245,203,92,0.1)] placeholder:text-[#CFDBD5]/50"
                        />
                    </form>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#CFDBD5] group-focus-within:text-[#F5CB5C] transition-colors pointer-events-none">
                        <Search className="w-5 h-5" />
                    </div>
                </div>

                {/* NEW CLIENT BUTTON */}
                <ClientFormModal
                    onClientSaved={() => router.refresh()}
                />
            </div>

            {/* CLIENTS TABLE */}
            <Card className="bg-[#333533]/50 border-[#333533] shadow-xl backdrop-blur-sm overflow-hidden rounded-3xl">
                <CardHeader className="p-8 border-b border-[#333533]/50">
                    <CardTitle className="text-2xl text-[#F5CB5C]">Directorio de Clientes</CardTitle>
                    <CardDescription className="text-[#CFDBD5] text-base">
                        Base de datos compartida. Los clientes creados están disponibles para todos los consultores.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {initialClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-[#CFDBD5] opacity-60">
                            <Building className="w-16 h-16 mb-6 opacity-50" />
                            <p className="text-lg">No se encontraron clientes.</p>
                            {query && <p className="text-sm mt-2 font-light">Prueba con otro término de búsqueda.</p>}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-[#242423]/50">
                                <TableRow className="border-[#333533] hover:bg-transparent">
                                    <TableHead className="text-[#F5CB5C] font-bold py-6 pl-10 text-base">Empresa</TableHead>
                                    <TableHead className="text-[#F5CB5C] font-bold py-6 text-base">Contactos</TableHead>
                                    <TableHead className="text-[#F5CB5C] font-bold py-6 text-base">Email Principal</TableHead>
                                    <TableHead className="text-[#F5CB5C] font-bold py-6 text-center text-base">Estatus</TableHead>
                                    <TableHead className="text-[#F5CB5C] font-bold py-6 pr-10 text-right text-base">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialClients.map((client) => {
                                    // Determine display values for contacts
                                    const contactsCount = client.contacts?.length || 0
                                    const primaryContact = client.contacts?.[0]
                                    const otherContacts = contactsCount > 1 ? contactsCount - 1 : 0

                                    return (
                                        <TableRow key={client.id} className="border-[#333533] hover:bg-[#333533]/60 transition-colors group">
                                            <TableCell className="font-medium text-[#E8EDDF] py-6 pl-10 flex items-center gap-4">
                                                <div className="p-1 rounded-xl bg-[#242423] text-[#CFDBD5] group-hover:text-[#F5CB5C] transition-colors shadow-sm w-12 h-12 flex items-center justify-center overflow-hidden border border-[#333533]">
                                                    {client.clientLogoUrl ? (
                                                        <img src={client.clientLogoUrl} alt={client.companyName} className="max-w-full max-h-full object-contain" />
                                                    ) : (
                                                        <Building className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <span className="text-lg tracking-tight">{client.companyName}</span>
                                            </TableCell>
                                            <TableCell className="text-[#CFDBD5] py-6 text-base">
                                                <div className="flex items-center gap-3">
                                                    <User className="w-4 h-4 opacity-70" />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-[#E8EDDF]">
                                                            {primaryContact?.name || client.contactName || 'Sin contacto'}
                                                        </span>
                                                        {otherContacts > 0 && (
                                                            <span className="text-xs text-[#F5CB5C] font-medium opacity-80">
                                                                + {otherContacts} más
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-[#CFDBD5] py-6 text-base">
                                                <div className="flex items-center gap-3">
                                                    <Mail className="w-4 h-4 opacity-70" />
                                                    {primaryContact?.email || client.email || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-6">
                                                <Badge className={`
                                                ${client.status === 'CLIENTE'
                                                        ? 'bg-[#F5CB5C]/20 text-[#F5CB5C] border border-[#F5CB5C]/50'
                                                        : 'bg-[#CFDBD5]/10 text-[#CFDBD5] border border-[#CFDBD5]/30'
                                                    }
                                                px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-md
                                            `}>
                                                    {client.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right py-6 pr-10">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(client)}
                                                        className="h-9 w-9 text-[#CFDBD5] hover:text-[#F5CB5C] hover:bg-[#F5CB5C]/10 rounded-full"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeletingId(client.id)}
                                                        className="h-9 w-9 text-[#CFDBD5] hover:text-red-400 hover:bg-red-500/10 rounded-full"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* EDIT MODAL */}
            <ClientFormModal
                isOpen={isEditOpen}
                onOpenChange={setIsEditOpen}
                initialData={editingClient}
                onClientSaved={() => {
                    setIsEditOpen(false)
                    router.refresh()
                }}
            />

            {/* DELETE ALERT */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent className="bg-[#242423] border-[#333533] text-[#E8EDDF]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#F5CB5C]">¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#CFDBD5]">
                            Esta acción no se puede deshacer. Se eliminará permanentemente al cliente de tu cartera.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent text-[#CFDBD5] hover:bg-[#333533] border-none">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500/90 hover:bg-red-600 text-white font-bold border-none">
                            Sí, eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
