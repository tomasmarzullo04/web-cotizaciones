import { QuoteBuilder } from "@/components/quote-builder"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function EditQuotePage({ params }: { params: { id: string } }) {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user_id')?.value

    if (!userId) {
        redirect('/login')
    }

    const id = params.id
    const quote = await prisma.quote.findUnique({
        where: { id }
    })

    if (!quote || quote.userId !== userId) {
        // Handle not found or unauthorized
        return (
            <div className="p-10 text-center">
                <h1 className="text-xl font-bold text-red-400">Cotización no encontrada o acceso denegado.</h1>
            </div>
        )
    }

    // Pass the raw quote data. QuoteBuilder will parse the JSON strings.
    // We need to ensure dates are serialized as strings if passing to Client Component
    const serializedQuote = {
        ...quote,
        createdAt: quote.createdAt.toISOString(),
        updatedAt: quote.updatedAt.toISOString(),
        estimatedCost: Number(quote.estimatedCost)
    }

    return (
        <QuoteBuilder initialData={serializedQuote} />
    )
}
