
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
    console.log("Starting Database Backup...")

    // 1. Fetch all data
    const users = await prisma.user.findMany()
    const quotes = await prisma.quote.findMany()
    const rates = await prisma.serviceRate.findMany()

    const backupData = {
        timestamp: new Date().toISOString(),
        users,
        quotes,
        rates
    }

    // 2. Write to file
    const backupPath = path.join(process.cwd(), 'backup_data.json')
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2))

    console.log(`Backup saved to ${backupPath}`)
    console.log(`Stats: ${users.length} Users, ${quotes.length} Quotes, ${rates.length} Rates`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
