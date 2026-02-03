import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Renaming Ssr to Med...")

    const updateResult = await prisma.serviceRate.updateMany({
        where: { complexity: 'Ssr' },
        data: { complexity: 'Med' }
    })

    console.log(`Renamed ${updateResult.count} records from Ssr to Med.`)
}

main().finally(() => prisma.$disconnect())
