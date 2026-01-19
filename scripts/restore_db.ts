
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
    console.log("Starting Database Restore...")

    const backupPath = path.join(process.cwd(), 'backup_data.json')
    if (!fs.existsSync(backupPath)) {
        console.error("Backup file not found!")
        process.exit(1)
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
    const { users, quotes, rates } = backupData

    console.log(`Found backup from ${backupData.timestamp}`)

    // 1. Restore Users
    console.log(`Restoring ${users.length} Users...`)
    for (const u of users) {
        await prisma.user.upsert({
            where: { id: u.id },
            update: u,
            create: u
        })
    }

    // 2. Restore Rates (Independent)
    console.log(`Restoring ${rates.length} Rates...`)
    for (const r of rates) {
        await prisma.serviceRate.upsert({
            where: { id: r.id },
            update: r,
            create: r
        })
    }

    // 3. Restore Quotes (Dependent on Users)
    console.log(`Restoring ${quotes.length} Quotes...`)
    for (const q of quotes) {
        // Ensure user exists (should be covered by step 1)
        const userExists = await prisma.user.findUnique({ where: { id: q.userId } })
        if (userExists) {
            await prisma.quote.upsert({
                where: { id: q.id },
                update: q,
                create: q
            })
        } else {
            console.warn(`Skipping quote ${q.id} because user ${q.userId} not found.`)
        }
    }

    console.log("Restore completed successfully.")
}

main()
    .catch((e) => {
        console.error(e)
        // process.exit(1) // Don't crash hard, just log
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
