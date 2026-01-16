import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // 1. Seed Roles/Rates - DEPRECATED: Now handled via ServiceRates in Admin/LocalStorage
    /*
    const rates = [
        { role: 'Data Analyst', monthlyRate: 2500, baseHours: 160 },
        { role: 'Data Science', monthlyRate: 5100, baseHours: 160 },
        { role: 'BI', monthlyRate: 4128, baseHours: 160 },
        { role: 'Data Engineer', monthlyRate: 4950, baseHours: 160 },
    ]

    for (const rate of rates) {
        // Removed prisma.roleRate usage
    }
    */
    console.log('Skipping legacy rates seeding.')

    // 2. Seed Users
    const hashedPasswordAdmin = await bcrypt.hash('admin2026', 10)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@antigravity.com' },
        update: {
            password: hashedPasswordAdmin,
            role: 'ADMIN' // Ensure role is correct even if updated
        },
        create: {
            name: 'Administrador',
            email: 'admin@antigravity.com',
            password: hashedPasswordAdmin,
            role: 'ADMIN'
        }
    })

    const hashedPasswordUser = await bcrypt.hash('user2026', 10)
    const user = await prisma.user.upsert({
        where: { email: 'tomasmarzullo04@gmail.com' },
        update: {
            password: hashedPasswordUser,
            role: 'USER'
        },
        create: {
            name: 'Consultor Tomas',
            email: 'tomasmarzullo04@gmail.com',
            password: hashedPasswordUser,
            role: 'USER'
        }
    })

    // Create Max User
    const hashedPasswordMax = await bcrypt.hash('max2026', 10)
    const max = await prisma.user.upsert({
        where: { email: 'maxhigareda@thestoreintelligence.com' },
        update: { password: hashedPasswordMax, role: 'USER' },
        create: {
            name: 'Max Higareda',
            email: 'maxhigareda@thestoreintelligence.com',
            password: hashedPasswordMax,
            role: 'USER'
        }
    })

    // Create Viridiana User
    const hashedPasswordViridiana = await bcrypt.hash('viridiana2026', 10)
    const viridiana = await prisma.user.upsert({
        where: { email: 'viridiana@thestoreintelligence.com' },
        update: { password: hashedPasswordViridiana, role: 'USER' },
        create: {
            name: 'Viridiana',
            email: 'viridiana@thestoreintelligence.com',
            password: hashedPasswordViridiana,
            role: 'USER'
        }
    })

    // Create Darold User
    const hashedPasswordDarold = await bcrypt.hash('darold2026', 10)
    const darold = await prisma.user.upsert({
        where: { email: 'darold@thestoreintelligence.com' },
        update: { password: hashedPasswordDarold, role: 'USER' },
        create: {
            name: 'Darold',
            email: 'darold@thestoreintelligence.com',
            password: hashedPasswordDarold,
            role: 'USER'
        }
    })

    // Create Liliana User
    const hashedPasswordLiliana = await bcrypt.hash('liliana2026', 10)
    const liliana = await prisma.user.upsert({
        where: { email: 'liliana@thestoreintelligence.com' },
        update: { password: hashedPasswordLiliana, role: 'USER' },
        create: {
            name: 'Liliana',
            email: 'liliana@thestoreintelligence.com',
            password: hashedPasswordLiliana,
            role: 'USER'
        }
    })

    // Create Loudal User
    const hashedPasswordLoudal = await bcrypt.hash('loudal2026', 10)
    const loudal = await prisma.user.upsert({
        where: { email: 'loudal@thestoreintelligence.com' },
        update: { password: hashedPasswordLoudal, role: 'USER' },
        create: {
            name: 'Loudal',
            email: 'loudal@thestoreintelligence.com',
            password: hashedPasswordLoudal,
            role: 'USER'
        }
    })

    // Create Ktellez User
    const hashedPasswordKtellez = await bcrypt.hash('ktellez2026', 10)
    const ktellez = await prisma.user.upsert({
        where: { email: 'ktellez@thestoreintelligence.com' },
        update: { password: hashedPasswordKtellez, role: 'USER' },
        create: {
            name: 'Ktellez',
            email: 'ktellez@thestoreintelligence.com',
            password: hashedPasswordKtellez,
            role: 'USER'
        }
    })

    console.log('Users seeded successfully:', { admin: admin.email, user: user.email, max: max.email })
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
