import QuoteBuilder from '@/components/quote-builder'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getRates() {
    try {
        const rates = await prisma.roleRate.findMany()
        // Map array to record: { "Data Engineer": 4950, ... }
        return rates.reduce((acc, rate) => {
            acc[rate.role] = rate.monthlyRate
            return acc
        }, {} as Record<string, number>)
    } catch (error) {
        console.warn("Could not fetch rates from DB, falling back to static defaults.", error)
        return undefined
    }
}

export default async function QuotePage() {
    const dbRates = await getRates()
    return <QuoteBuilder dbRates={dbRates} />
}
