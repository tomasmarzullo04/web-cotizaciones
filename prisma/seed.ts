import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Skipping legacy rates seeding.')

    // 1. Seed Users

    // --- ADMIN ---
    const hashedPasswordMax = await bcrypt.hash('admin2026', 10)
    await prisma.user.upsert({
        where: { email: 'maxhigareda@thestoreintelligence.com' },
        update: { password: hashedPasswordMax, role: 'ADMIN', name: 'Max Higareda' },
        create: {
            name: 'Max Higareda',
            email: 'maxhigareda@thestoreintelligence.com',
            password: hashedPasswordMax,
            role: 'ADMIN'
        }
    })

    // --- CONSULTORS ---
    const consultors = [
        { email: 'tomasmarzullo04@gmail.com', name: 'Tomas Marzullo', pass: 'tomasmarzullo042026' },
        { email: 'viridiana@thestoreintelligence.com', name: 'Viridiana', pass: 'viridiana2026' },
        { email: 'darold@thestoreintelligence.com', name: 'Darold', pass: 'darold2026' },
        { email: 'liliana@thestoreintelligence.com', name: 'Liliana', pass: 'liliana2026' },
        { email: 'loudal@thestoreintelligence.com', name: 'Loudal', pass: 'loudal2026' },
        { email: 'ktellez@thestoreintelligence.com', name: 'Ktellez', pass: 'ktellez2026' },
        { email: 'alovera@thestoreintelligence.com', name: 'Alovera', pass: 'alovera2026' },
    ]

    for (const c of consultors) {
        const hashedPass = await bcrypt.hash(c.pass, 10)
        await prisma.user.upsert({
            where: { email: c.email },
            update: { password: hashedPass, role: 'CONSULTOR', name: c.name },
            create: {
                name: c.name,
                email: c.email,
                password: hashedPass,
                role: 'CONSULTOR'
            }
        })
    }

    console.log('Seed completed successfully.')
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
