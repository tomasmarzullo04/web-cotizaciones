'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface DeleteQuoteButtonProps {
    quoteId: string
    quoteName: string
    onSuccess?: () => void
}

export function DeleteQuoteButton({ quoteId, quoteName, onSuccess }: DeleteQuoteButtonProps) {
    const [open, setOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation() // Prevent parent clicks
        setIsDeleting(true)
        try {
            await deleteQuote(quoteId)
            toast.success('Cotización eliminada correctamente')
            setOpen(false)
            router.refresh()
            if (onSuccess) onSuccess()
        } catch (error) {
            toast.error('Error al eliminar la cotización')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-lg text-[#CFDBD5] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    onClick={(e) => {
                        e.stopPropagation() // Critical: Stop any parent click events
                        setOpen(true)
                    }}
                >
                    <Trash2 className="w-5 h-5" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#1F1F1F] border-[#2D2D2D] sm:max-w-md rounded-[2rem]">
                <AlertDialogHeader className="space-y-4">
                    <div className="mx-auto bg-red-500/10 p-4 rounded-full w-fit">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <AlertDialogTitle className="text-xl font-bold text-[#E8EDDF] text-center">
                        ¿Eliminar Cotización?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[#CFDBD5] text-center">
                        Estás a punto de eliminar la cotización <span className="font-bold text-[#F5CB5C]">"{quoteName}"</span>.
                        <br />
                        Esta acción es irreversible.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-6 w-full">
                    <AlertDialogCancel
                        className="flex-1 w-full border-[#CFDBD5]/20 text-[#CFDBD5] hover:bg-[#2D2D2D] hover:text-[#E8EDDF] rounded-xl font-bold h-12 mt-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="flex-1 w-full bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold h-12 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
