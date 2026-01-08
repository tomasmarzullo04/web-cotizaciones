'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { deleteQuote } from '@/lib/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DeleteQuoteButtonProps {
    quoteId: string
    quoteName: string
}

export function DeleteQuoteButton({ quoteId, quoteName }: DeleteQuoteButtonProps) {
    const [open, setOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await deleteQuote(quoteId)
            toast.success('Cotización eliminada correctamente')
            setOpen(false)
            router.refresh()
        } catch (error) {
            toast.error('Error al eliminar la cotización')
            console.error(error)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-lg text-[#CFDBD5] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                    <Trash2 className="w-5 h-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1F1F1F] border-[#2D2D2D] sm:max-w-md rounded-[2rem]">
                <DialogHeader className="space-y-4">
                    <div className="mx-auto bg-red-500/10 p-4 rounded-full w-fit">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-[#E8EDDF] text-center">
                        ¿Eliminar Cotización?
                    </DialogTitle>
                    <DialogDescription className="text-[#CFDBD5] text-center">
                        Estás a punto de eliminar la cotización <span className="font-bold text-[#F5CB5C]">"{quoteName}"</span>.
                        <br />
                        Esta acción es irreversible y no podrá recuperarse.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6 w-full">
                    <Button
                        disabled={isDeleting}
                        variant="outline"
                        onClick={() => setOpen(false)}
                        className="flex-1 w-full border-[#CFDBD5]/20 text-[#CFDBD5] hover:bg-[#2D2D2D] hover:text-[#E8EDDF] rounded-xl font-bold h-12"
                    >
                        Cancelar
                    </Button>
                    <Button
                        disabled={isDeleting}
                        onClick={handleDelete}
                        className="flex-1 w-full bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold h-12 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
