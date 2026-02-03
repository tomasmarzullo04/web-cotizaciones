'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { reviewQuote } from "@/lib/actions"

interface AdminReviewModalProps {
    quote: any
    isOpen: boolean
    onClose: () => void
    onStatusChange?: () => void
}

export function AdminReviewModal({ quote, isOpen, onClose, onStatusChange }: AdminReviewModalProps) {
    const [comment, setComment] = useState(quote?.adminComment || '')
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    if (!quote) return null

    const handleAction = async (newStatus: 'APROBADA' | 'RECHAZADA') => {
        setIsLoading(true)
        setSuccessMessage(null)
        try {
            const result = await reviewQuote(quote.id, newStatus, comment)
            if (result.success) {
                // Show success message inside modal before closing
                setSuccessMessage("Estado actualizado y notificación enviada al consultor")
                onStatusChange?.()
                // Close after delay or let user close? User just said "see a confirmation message".
                // I'll auto close after 2 seconds to be smooth, or keep it open.
                // Re-reading: "ensure that AFTER clicking save... Admin SEES a message".
                setTimeout(() => {
                    onClose()
                    setSuccessMessage(null) // Reset for next time
                }, 2000)
            } else {
                alert("Error al actualizar: " + result.error)
            }
        } catch (e) {
            console.error(e)
            alert("Error desconocido")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#171717] border-[#2D2D2D] text-[#E8EDDF] sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        Revisión de Cotización
                        <Badge variant="outline" className="text-[#F5CB5C] border-[#F5CB5C]">
                            {quote.clientName}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-[#CFDBD5]">
                        Analiza la propuesta y define su estado.
                    </DialogDescription>
                </DialogHeader>

                {successMessage ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#E8EDDF]">¡Acción Completada!</h3>
                            <p className="text-[#CFDBD5] mt-1">{successMessage}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-6 py-4">
                            {/* Preview Button */}
                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    className="bg-[#242423] text-[#CFDBD5] border-[#2D2D2D] hover:bg-[#2D2D2D] gap-2"
                                    onClick={() => window.open(`/quote/view/${quote.id}`, '_blank')}
                                >
                                    <FileText className="w-4 h-4" />
                                    Ver PDF / Detalle
                                </Button>
                            </div>

                            {/* Stats / Summary */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-[#242423] p-3 rounded-lg border border-[#2D2D2D]">
                                    <span className="text-[#CFDBD5] block text-xs uppercase tracking-wider">Servicio</span>
                                    <span className="font-bold">{quote.serviceType}</span>
                                </div>
                                <div className="bg-[#242423] p-3 rounded-lg border border-[#2D2D2D]">
                                    <span className="text-[#CFDBD5] block text-xs uppercase tracking-wider">Total</span>
                                    <span className="font-bold text-[#F5CB5C]">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(quote.estimatedCost)}</span>
                                </div>
                            </div>

                            {/* Comment Field */}
                            <div className="space-y-2">
                                <Label htmlFor="comment" className="text-[#E8EDDF]">Comentarios / Motivo</Label>
                                <Textarea
                                    id="comment"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Ej: Ajustar tarifa de Azure Developer según nuevo acuerdo."
                                    className="bg-[#242423] border-[#2D2D2D] text-[#E8EDDF] focus:border-[#F5CB5C] min-h-[100px]"
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="border-[#2D2D2D] text-[#CFDBD5] hover:bg-[#2D2D2D]"
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    className="flex-1 sm:flex-none bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                                    onClick={() => handleAction('RECHAZADA')}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                    Rechazar
                                </Button>
                                <Button
                                    className="flex-1 sm:flex-none bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                                    onClick={() => handleAction('APROBADA')}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                    Aprobar
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
