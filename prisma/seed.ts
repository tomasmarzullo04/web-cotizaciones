import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()


async function main() {
    const rates = [
        { role: 'Data Analyst', monthlyRate: 2500, baseHours: 160 },
        { role: 'Data Science', monthlyRate: 5100, baseHours: 160 },
        { role: 'BI', monthlyRate: 4128, baseHours: 160 },
        { role: 'Data Engineer', monthlyRate: 4950, baseHours: 160 },
    ]

    for (const rate of rates) {
        await prisma.roleRate.upsert({
            where: { role: rate.role },
            update: {
                monthlyRate: rate.monthlyRate,
                baseHours: rate.baseHours,
                hourlyRate: rate.monthlyRate / rate.baseHours
            },
            create: {
                role: rate.role,
                monthlyRate: rate.monthlyRate,
                baseHours: rate.baseHours,
                hourlyRate: rate.monthlyRate / rate.baseHours
            },
        })
    }

    console.log('Rates seeded successfully.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
