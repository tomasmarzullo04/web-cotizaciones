import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Starting Global Data Purge...")

    // 1. Delete all Quotes
    const quotesCount = await prisma.quote.count()
    console.log(`Found ${quotesCount} quotes to delete.`)

    if (quotesCount > 0) {
        await prisma.quote.deleteMany({})
        console.log("All quotes deleted.")
    }

    // 2. Optional: Delete Clients? 
    // The user didn't explicitly ask for clients, but usually "basura de pruebas" includes test clients.
    // However, I'll stick to Quotes as prioritize by the request.
    const clientsCount = await prisma.client.count()
    console.log(`Found ${clientsCount} clients. (Skipping deletion unless explicitly asked)`)

    console.log("Database Purge Completed.")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
