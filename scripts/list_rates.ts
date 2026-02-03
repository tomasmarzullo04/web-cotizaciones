import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const rates = await prisma.serviceRate.findMany({
        orderBy: { service: 'asc' }
    })
    console.log(`Current Service Rates: (${rates.length})`)
    rates.forEach(r => {
        console.log(`[${r.service}] ${r.complexity}: $${r.basePrice}`)
    })
}

main().finally(() => prisma.$disconnect())
