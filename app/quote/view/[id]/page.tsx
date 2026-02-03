import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { ShieldAlert, FileX2 } from "lucide-react"

export default async function ViewQuotePdfPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value
    const role = cookieStore.get('session_role')?.value

    if (!userId) {
        redirect('/login')
    }

    const quote = await prisma.quote.findUnique({
        where: { id }
    })

    if (!quote) {
        notFound()
    }

    // Authorization: Admin OR Owner
    if (role !== 'ADMIN' && quote.userId !== userId) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#171717] text-[#E8EDDF] p-6">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
                <p className="text-[#CFDBD5]">No tienes permisos para ver esta cotización.</p>
            </div>
        )
    }

    // Check for Snapshot
    if (!quote.pdfSnapshot) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#171717] text-[#E8EDDF] p-6">
                <FileX2 className="w-16 h-16 text-[#F5CB5C] mb-4" />
                <h1 className="text-2xl font-bold mb-2">Vista Previa No Disponible</h1>
                <p className="text-[#CFDBD5] max-w-md text-center mb-6">
                    Esta cotización es antigua o no se guardó correctamente con una captura PDF.
                    Por favor, abre el editor (solo lectura) para ver el contenido.
                </p>
                {/* Fallback to Read-Only Editor Link? Or just minimal info */}
                <a
                    href={`/quote/${id}`}
                    className="px-6 py-2 bg-[#333533] border border-[#F5CB5C] text-[#F5CB5C] rounded-full hover:bg-[#F5CB5C] hover:text-[#242423] transition-colors"
                >
                    Ir al Editor (Solo Lectura)
                </a>
            </div>
        )
    }

    return (
        <div className="w-full h-screen bg-[#242423] flex flex-col">
            {/* Minimal Header for Context */}
            <div className="bg-[#171717] border-b border-[#333533] px-6 py-3 flex items-center justify-center">
                <span className="text-sm font-bold text-[#CFDBD5] uppercase tracking-wider">
                    {role === 'ADMIN' ? 'Modo Auditoría - Documento Final' : 'Vista Previa del Documento'}
                </span>
            </div>

            <iframe
                src={`data:application/pdf;base64,${quote.pdfSnapshot}`}
                className="w-full h-full border-none"
                title="Visor Cotización"
            />
        </div>
    )
}
