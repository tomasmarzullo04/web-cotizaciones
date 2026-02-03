import QuoteBuilder from "@/components/quote-builder"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        redirect('/login')
    }

    try {
        // Next.js 15+: params is a Promise
        const { id } = await params

        if (!id) throw new Error("ID de cotización inválido")

        const quote = await prisma.quote.findUnique({
            where: { id }
        })

        const role = cookieStore.get('session_role')?.value

        if (!quote || (quote.userId !== userId && role !== 'ADMIN')) {
            console.error(`Quote not found or unauthorized: ${id}`)
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-10 bg-gray-50 text-gray-900">
                    <h1 className="text-2xl font-bold mb-4 text-red-500">Cotización no encontrada</h1>
                    <p className="mb-6 text-gray-600">No tienes permisos para ver esta cotización o no existe.</p>
                    <a href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                        Volver al Dashboard
                    </a>
                </div>
            )
        }

        // Pass the raw quote data. QuoteBuilder will parse the JSON strings.
        const serializedQuote = {
            ...quote,
            createdAt: quote.createdAt.toISOString(),
            estimatedCost: Number(quote.estimatedCost)
        }

        const rates = await prisma.serviceRate.findMany()

        const isReadOnly = role === 'ADMIN'

        return (
            <QuoteBuilder initialData={serializedQuote} dbRates={rates} readOnly={isReadOnly} />
        )
    } catch (error) {
        console.error("Error loading edit page:", error)
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-10 bg-gray-50 text-gray-900">
                <h1 className="text-2xl font-bold mb-4 text-red-500">Error del Servidor</h1>
                <p className="mb-6 text-gray-600">Ocurrió un problema al cargar la cotización.</p>
                <a href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                    Volver al Dashboard
                </a>
            </div>
        )
    }
}
